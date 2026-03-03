import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TestAttempt,
  TestAttemptDocument,
} from './schemas/test-attempt.schema';
import { Test, TestDocument } from '../tests/schemas/test.schema';
import {
  AttemptStatus,
  QuestionStatus,
  TestStatus,
} from '@exam-portal/shared';

@Injectable()
export class TestAttemptsService {
  constructor(
    @InjectModel(TestAttempt.name)
    private attemptModel: Model<TestAttemptDocument>,
    @InjectModel(Test.name)
    private testModel: Model<TestDocument>,
  ) {}

  async startTest(
    testId: string,
    studentId: string,
  ): Promise<TestAttemptDocument> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');

    if (
      test.status !== TestStatus.PUBLISHED &&
      test.status !== TestStatus.ACTIVE
    ) {
      throw new BadRequestException('Test is not available');
    }

    // Check scheduling
    const now = new Date();
    if (test.startTime && now < test.startTime) {
      throw new BadRequestException('Test has not started yet');
    }
    if (test.endTime && now > test.endTime) {
      throw new BadRequestException('Test has ended');
    }

    // Check if student already has an in-progress attempt
    const existing = await this.attemptModel.findOne({
      testId: new Types.ObjectId(testId),
      studentId: new Types.ObjectId(studentId),
      status: AttemptStatus.IN_PROGRESS,
    });
    if (existing) return existing;

    // Check if already submitted
    const submitted = await this.attemptModel.findOne({
      testId: new Types.ObjectId(testId),
      studentId: new Types.ObjectId(studentId),
      status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
    });
    if (submitted) {
      throw new BadRequestException('You have already submitted this test');
    }

    // Build initial responses (NOT_VISITED for all questions)
    const responses: Array<{
      questionId: Types.ObjectId;
      sectionIndex: number;
      selectedOptions: string[];
      status: QuestionStatus;
      timeSpent: number;
    }> = [];

    test.sections.forEach((section, sIdx) => {
      section.questionIds.forEach((qId) => {
        responses.push({
          questionId: new Types.ObjectId(qId.toString()),
          sectionIndex: sIdx,
          selectedOptions: [],
          status: QuestionStatus.NOT_VISITED,
          timeSpent: 0,
        });
      });
    });

    const attempt = new this.attemptModel({
      testId: new Types.ObjectId(testId),
      studentId: new Types.ObjectId(studentId),
      responses,
      startedAt: new Date(),
      status: AttemptStatus.IN_PROGRESS,
    });

    return attempt.save();
  }

  async getAttempt(
    attemptId: string,
    studentId: string,
  ): Promise<TestAttemptDocument> {
    const attempt = await this.attemptModel
      .findById(attemptId)
      .populate({
        path: 'testId',
        populate: { path: 'sections.questionIds' },
      });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId.toString() !== studentId) {
      throw new ForbiddenException('Not your attempt');
    }
    return attempt;
  }

  async saveResponse(
    attemptId: string,
    studentId: string,
    data: {
      questionId: string;
      sectionIndex: number;
      selectedOptions?: string[];
      numericalAnswer?: number;
      status: QuestionStatus;
      timeSpent: number;
    },
  ): Promise<TestAttemptDocument> {
    const attempt = await this.attemptModel.findById(attemptId);
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId.toString() !== studentId) {
      throw new ForbiddenException('Not your attempt');
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Test already submitted');
    }

    // Check time limit
    const test = await this.testModel.findById(attempt.testId);
    if (test) {
      const elapsed =
        (Date.now() - attempt.startedAt.getTime()) / 1000 / 60;
      if (elapsed > test.totalTimeMinutes + 1) {
        // Grace period of 1 minute
        attempt.status = AttemptStatus.TIMED_OUT;
        attempt.submittedAt = new Date();
        await attempt.save();
        await this.gradeAttempt(attempt);
        throw new BadRequestException('Time is up. Test auto-submitted.');
      }
    }

    const idx = attempt.responses.findIndex(
      (r) => r.questionId.toString() === data.questionId,
    );
    if (idx === -1) {
      throw new BadRequestException('Question not in this test');
    }

    attempt.responses[idx].selectedOptions = data.selectedOptions || [];
    if (data.numericalAnswer !== undefined) {
      attempt.responses[idx].numericalAnswer = data.numericalAnswer;
    }
    attempt.responses[idx].status = data.status;
    attempt.responses[idx].timeSpent = data.timeSpent;

    return attempt.save();
  }

  async updateNavigation(
    attemptId: string,
    studentId: string,
    sectionIndex: number,
    questionIndex: number,
  ): Promise<TestAttemptDocument> {
    const attempt = await this.attemptModel.findById(attemptId);
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId.toString() !== studentId) {
      throw new ForbiddenException('Not your attempt');
    }

    attempt.currentSectionIndex = sectionIndex;
    attempt.currentQuestionIndex = questionIndex;
    return attempt.save();
  }

  async submitTest(
    attemptId: string,
    studentId: string,
  ): Promise<TestAttemptDocument> {
    const attempt = await this.attemptModel.findById(attemptId);
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId.toString() !== studentId) {
      throw new ForbiddenException('Not your attempt');
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Test already submitted');
    }

    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();
    await attempt.save();

    await this.gradeAttempt(attempt);
    return this.attemptModel.findById(attemptId) as Promise<TestAttemptDocument>;
  }

  private async gradeAttempt(attempt: TestAttemptDocument): Promise<void> {
    const test = await this.testModel
      .findById(attempt.testId)
      .populate('sections.questionIds');
    if (!test) return;

    const sectionScores: Array<{
      sectionIndex: number;
      score: number;
      correct: number;
      incorrect: number;
      unanswered: number;
    }> = [];

    let totalScore = 0;

    test.sections.forEach((section, sIdx) => {
      let score = 0;
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      section.questionIds.forEach((questionDoc: any) => {
        const response = attempt.responses.find(
          (r) =>
            r.questionId.toString() === questionDoc._id.toString() &&
            r.sectionIndex === sIdx,
        );

        if (
          !response ||
          response.status === QuestionStatus.NOT_VISITED ||
          response.status === QuestionStatus.NOT_ANSWERED
        ) {
          unanswered++;
          score += section.markingScheme.unanswered || 0;
          return;
        }

        // Grade based on question type
        const q = questionDoc;
        let isCorrect = false;

        if (q.questionType === 'NUMERICAL') {
          if (response.numericalAnswer !== undefined && q.correctAnswer) {
            const ans = q.correctAnswer as any;
            const tolerance = ans.tolerance || 0;
            isCorrect =
              Math.abs(response.numericalAnswer - ans.value) <= tolerance;
          }
        } else {
          // MCQ
          const correctOpts = (q.options || [])
            .filter((o: any) => o.isCorrect)
            .map((o: any) => o._id?.toString() || o.text);

          const selectedOpts = response.selectedOptions || [];

          if (q.questionType === 'MCQ_SINGLE') {
            isCorrect =
              selectedOpts.length === 1 &&
              correctOpts.includes(selectedOpts[0]);
          } else {
            // MCQ_MULTIPLE — all correct, no extras
            isCorrect =
              selectedOpts.length === correctOpts.length &&
              selectedOpts.every((s: string) => correctOpts.includes(s));
          }
        }

        if (isCorrect) {
          correct++;
          score += section.markingScheme.correct;
        } else {
          incorrect++;
          score += section.markingScheme.incorrect;
        }
      });

      sectionScores.push({ sectionIndex: sIdx, score, correct, incorrect, unanswered });
      totalScore += score;
    });

    await this.attemptModel.findByIdAndUpdate(attempt._id, {
      totalScore,
      sectionScores,
    });
  }

  async getStudentAttempts(studentId: string) {
    return this.attemptModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .populate('testId', 'title examType totalTimeMinutes totalMarks sections')
      .sort({ createdAt: -1 });
  }

  async getAvailableTests(studentId: string) {
    // Get tests that are published/active and student hasn't submitted
    const submittedTestIds = await this.attemptModel
      .find({
        studentId: new Types.ObjectId(studentId),
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
      })
      .distinct('testId');

    const now = new Date();
    return this.testModel.find({
      status: { $in: [TestStatus.PUBLISHED, TestStatus.ACTIVE] },
      _id: { $nin: submittedTestIds },
      $or: [
        { startTime: { $exists: false } },
        { startTime: null },
        { startTime: { $lte: now } },
      ],
    }).sort({ createdAt: -1 });
  }
}
