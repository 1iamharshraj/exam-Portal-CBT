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
  DifficultyLevel,
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
        populate: { path: 'sections.questionIds', model: 'Question' },
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
      .populate({ path: 'sections.questionIds', model: 'Question' });
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

  async getAttemptResult(attemptId: string, studentId?: string) {
    const attempt = await this.attemptModel
      .findById(attemptId)
      .populate({
        path: 'testId',
        populate: { path: 'sections.questionIds', model: 'Question' },
      })
      .populate('studentId', 'firstName lastName email');

    if (!attempt) throw new NotFoundException('Attempt not found');
    if (studentId && attempt.studentId._id?.toString() !== studentId) {
      throw new ForbiddenException('Not your attempt');
    }
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Test not yet submitted');
    }
    return attempt;
  }

  async getTestResults(testId: string) {
    return this.attemptModel
      .find({
        testId: new Types.ObjectId(testId),
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
      })
      .populate('studentId', 'firstName lastName email batch')
      .sort({ totalScore: -1 });
  }

  async getTestAnalytics(testId: string) {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');

    const attempts = await this.attemptModel.find({
      testId: new Types.ObjectId(testId),
      status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
    });

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        distribution: Array.from({ length: 10 }, (_, i) => ({
          range: `${i * 10}-${(i + 1) * 10}%`,
          count: 0,
        })),
        sectionAverages: [],
      };
    }

    const scores = attempts.map((a) => a.totalScore || 0);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // Score distribution in 10% buckets
    const totalMarks = test.totalMarks || 1;
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}%`,
      count: 0,
    }));
    scores.forEach((s) => {
      const pct = (s / totalMarks) * 100;
      const bucket = Math.max(0, Math.min(9, Math.floor(pct / 10)));
      distribution[bucket].count++;
    });

    // Section-wise averages
    const sectionAverages: Array<{
      sectionIndex: number;
      avgScore: number;
      avgCorrect: number;
      avgIncorrect: number;
    }> = [];

    if (attempts[0]?.sectionScores?.length) {
      const numSections = attempts[0].sectionScores.length;
      for (let i = 0; i < numSections; i++) {
        const sectionData = attempts
          .map((a) => a.sectionScores?.find((s) => s.sectionIndex === i))
          .filter(Boolean);
        sectionAverages.push({
          sectionIndex: i,
          avgScore: sectionData.reduce((sum, s) => sum + (s!.score || 0), 0) / sectionData.length,
          avgCorrect: sectionData.reduce((sum, s) => sum + (s!.correct || 0), 0) / sectionData.length,
          avgIncorrect: sectionData.reduce((sum, s) => sum + (s!.incorrect || 0), 0) / sectionData.length,
        });
      }
    }

    return {
      totalAttempts: attempts.length,
      avgScore: Math.round(avgScore * 100) / 100,
      maxScore,
      minScore,
      distribution,
      sectionAverages,
    };
  }

  async getLeaderboard(testId: string) {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');

    const attempts = await this.attemptModel
      .find({
        testId: new Types.ObjectId(testId),
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
      })
      .populate('studentId', 'firstName lastName email batch')
      .sort({ totalScore: -1 });

    const totalMarks = test.totalMarks || 1;

    // Build leaderboard sorted by score descending
    const leaderboard = attempts.map((attempt, index) => {
      const student = attempt.studentId as any;
      const score = attempt.totalScore || 0;

      // Compute time taken in minutes
      let timeTaken = 0;
      if (attempt.startedAt && attempt.submittedAt) {
        timeTaken = Math.round(
          (new Date(attempt.submittedAt).getTime() -
            new Date(attempt.startedAt).getTime()) /
            1000 /
            60,
        );
      }

      // Sum up correct/incorrect/unanswered from sectionScores
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;
      if (attempt.sectionScores?.length) {
        for (const ss of attempt.sectionScores) {
          correct += ss.correct || 0;
          incorrect += ss.incorrect || 0;
          unanswered += ss.unanswered || 0;
        }
      }

      return {
        rank: index + 1,
        studentId: student._id?.toString() || attempt.studentId.toString(),
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        batch: student.batch || '',
        score,
        totalMarks,
        percentage: Math.round((score / totalMarks) * 10000) / 100,
        timeTaken,
        correct,
        incorrect,
        unanswered,
      };
    });

    // Group by batch for comparison
    const batchMap = new Map<
      string,
      { scores: number[]; students: Array<{ name: string; score: number }> }
    >();
    for (const entry of leaderboard) {
      const batchKey = entry.batch || 'Unassigned';
      if (!batchMap.has(batchKey)) {
        batchMap.set(batchKey, { scores: [], students: [] });
      }
      const group = batchMap.get(batchKey)!;
      group.scores.push(entry.score);
      group.students.push({
        name: `${entry.firstName} ${entry.lastName}`,
        score: entry.score,
      });
    }

    const batchComparison = Array.from(batchMap.entries()).map(
      ([batch, data]) => {
        const avgScore =
          data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
        const topEntry = data.students.reduce((best, s) =>
          s.score > best.score ? s : best,
        );
        return {
          batch,
          studentCount: data.scores.length,
          avgScore: Math.round(avgScore * 100) / 100,
          avgPercentage:
            Math.round((avgScore / totalMarks) * 10000) / 100,
          topScore: topEntry.score,
          topStudent: topEntry.name,
        };
      },
    );

    return { leaderboard, batchComparison };
  }

  async getStudentRankings(studentId: string) {
    // Find all submitted attempts for this student
    const myAttempts = await this.attemptModel
      .find({
        studentId: new Types.ObjectId(studentId),
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
      })
      .populate('testId', 'title totalMarks');

    const rankings = [];

    for (const attempt of myAttempts) {
      const test = attempt.testId as any;
      if (!test || !test._id) continue;

      const testObjId = new Types.ObjectId(test._id.toString());
      const totalMarks = test.totalMarks || 1;
      const myScore = attempt.totalScore || 0;

      // Count total students who submitted this test
      const totalStudents = await this.attemptModel.countDocuments({
        testId: testObjId,
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
      });

      // Count students who scored strictly higher
      const studentsAbove = await this.attemptModel.countDocuments({
        testId: testObjId,
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
        totalScore: { $gt: myScore },
      });

      // Count students who scored strictly lower (for percentile)
      const studentsBelow = await this.attemptModel.countDocuments({
        testId: testObjId,
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
        totalScore: { $lt: myScore },
      });

      const rank = studentsAbove + 1;
      const percentile =
        totalStudents > 1
          ? Math.round((studentsBelow / (totalStudents - 1)) * 10000) / 100
          : 100;

      rankings.push({
        testId: test._id.toString(),
        testTitle: test.title || '',
        date: attempt.submittedAt
          ? attempt.submittedAt.toISOString()
          : '',
        score: myScore,
        totalMarks,
        percentage: Math.round((myScore / totalMarks) * 10000) / 100,
        rank,
        totalStudents,
        percentile,
      });
    }

    // Sort by date descending (most recent first)
    rankings.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return rankings;
  }

  async recordViolation(
    attemptId: string,
    studentId: string,
    type: string,
    message: string,
  ): Promise<TestAttemptDocument> {
    const attempt = await this.attemptModel.findById(attemptId);
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId.toString() !== studentId) {
      throw new ForbiddenException('Not your attempt');
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Test already submitted');
    }

    attempt.violations.push({
      type,
      message,
      timestamp: new Date(),
    } as any);
    attempt.violationCount = (attempt.violationCount || 0) + 1;

    // Update risk level based on count
    const count = attempt.violationCount;
    if (count >= 4) {
      attempt.riskLevel = 'high';
    } else if (count >= 2) {
      attempt.riskLevel = 'medium';
    } else {
      attempt.riskLevel = 'low';
    }

    return attempt.save();
  }

  async getLiveTestStatus(testId: string) {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');

    const attempts = await this.attemptModel
      .find({
        testId: new Types.ObjectId(testId),
        status: {
          $in: [
            AttemptStatus.IN_PROGRESS,
            AttemptStatus.SUBMITTED,
            AttemptStatus.TIMED_OUT,
          ],
        },
      })
      .populate('studentId', 'firstName lastName email batch')
      .sort({ riskLevel: -1, violationCount: -1 });

    // Sort so high risk comes first
    const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sorted = attempts.sort((a, b) => {
      const rA = riskOrder[a.riskLevel || 'low'] ?? 2;
      const rB = riskOrder[b.riskLevel || 'low'] ?? 2;
      if (rA !== rB) return rA - rB;
      return (b.violationCount || 0) - (a.violationCount || 0);
    });

    return {
      test: {
        _id: test._id,
        title: test.title,
        totalTimeMinutes: test.totalTimeMinutes,
        totalMarks: test.totalMarks,
      },
      attempts: sorted,
    };
  }

  async forceSubmitAttempt(attemptId: string): Promise<TestAttemptDocument> {
    const attempt = await this.attemptModel.findById(attemptId);
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Test already submitted');
    }

    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();
    await attempt.save();

    await this.gradeAttempt(attempt);
    return this.attemptModel.findById(attemptId) as Promise<TestAttemptDocument>;
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

  async getStudentPerformanceAnalytics(studentId: string) {
    // Fetch all submitted/timed-out attempts for this student, with full question data
    const attempts = await this.attemptModel
      .find({
        studentId: new Types.ObjectId(studentId),
        status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
      })
      .populate({
        path: 'testId',
        populate: { path: 'sections.questionIds', model: 'Question' },
      })
      .sort({ submittedAt: -1 });

    if (attempts.length === 0) {
      return {
        topicWisePerformance: [],
        subjectWisePerformance: [],
        difficultyAnalysis: [],
        overallStats: {
          totalTestsTaken: 0,
          avgScore: 0,
          avgPercentage: 0,
          bestScore: 0,
          bestPercentage: 0,
          totalQuestionsAttempted: 0,
          overallAccuracy: 0,
        },
        recentTrend: [],
        weakTopics: [],
        strongTopics: [],
      };
    }

    // --- Accumulators ---
    // Topic-wise: keyed by "subject||topic"
    const topicMap = new Map<
      string,
      {
        subject: string;
        topic: string;
        totalQuestions: number;
        correct: number;
        incorrect: number;
        unanswered: number;
        totalTime: number;
      }
    >();

    // Subject-wise: keyed by subject
    const subjectMap = new Map<
      string,
      {
        subject: string;
        totalQuestions: number;
        correct: number;
        incorrect: number;
        totalScore: number;
        maxPossible: number;
      }
    >();

    // Difficulty-wise
    const difficultyMap = new Map<
      string,
      { difficulty: string; total: number; correct: number }
    >();
    for (const d of [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD]) {
      difficultyMap.set(d, { difficulty: d, total: 0, correct: 0 });
    }

    // Overall counters
    let totalQuestionsAttempted = 0;
    let totalCorrectOverall = 0;

    // Process each attempt
    for (const attempt of attempts) {
      const test = attempt.testId as any;
      if (!test || !test.sections) continue;

      // Build a questionId -> question doc lookup from populated test sections
      const questionLookup = new Map<string, any>();
      const sectionForQuestion = new Map<string, number>();

      test.sections.forEach((section: any, sIdx: number) => {
        if (!section.questionIds) return;
        section.questionIds.forEach((qDoc: any) => {
          if (qDoc && qDoc._id) {
            questionLookup.set(qDoc._id.toString(), qDoc);
            sectionForQuestion.set(qDoc._id.toString(), sIdx);
          }
        });
      });

      // Process each response in this attempt
      for (const response of attempt.responses) {
        const qId = response.questionId.toString();
        const question = questionLookup.get(qId);
        if (!question) continue;

        const subject: string = question.subject || 'Unknown';
        const topic: string = question.topic || 'Unknown';
        const difficulty: string = question.difficultyLevel || DifficultyLevel.MEDIUM;
        const sIdx = response.sectionIndex;
        const section = test.sections[sIdx];
        const markingScheme = section?.markingScheme || { correct: 4, incorrect: -1, unanswered: 0 };

        // Determine if unanswered
        const isUnanswered =
          response.status === QuestionStatus.NOT_VISITED ||
          response.status === QuestionStatus.NOT_ANSWERED;

        // Determine correctness (same logic as gradeAttempt)
        let isCorrect = false;
        if (!isUnanswered) {
          if (question.questionType === 'NUMERICAL') {
            if (response.numericalAnswer !== undefined && question.correctAnswer) {
              const ans = question.correctAnswer as any;
              const tolerance = ans.tolerance || 0;
              isCorrect =
                Math.abs(response.numericalAnswer - ans.value) <= tolerance;
            }
          } else {
            // MCQ
            const correctOpts = (question.options || [])
              .filter((o: any) => o.isCorrect)
              .map((o: any) => o._id?.toString() || o.text);
            const selectedOpts = response.selectedOptions || [];

            if (question.questionType === 'MCQ_SINGLE') {
              isCorrect =
                selectedOpts.length === 1 &&
                correctOpts.includes(selectedOpts[0]);
            } else {
              // MCQ_MULTIPLE or ASSERTION_REASON
              isCorrect =
                selectedOpts.length === correctOpts.length &&
                selectedOpts.every((s: string) => correctOpts.includes(s));
            }
          }
        }

        // --- Aggregate into topic map ---
        const topicKey = `${subject}||${topic}`;
        if (!topicMap.has(topicKey)) {
          topicMap.set(topicKey, {
            subject,
            topic,
            totalQuestions: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0,
            totalTime: 0,
          });
        }
        const topicEntry = topicMap.get(topicKey)!;
        topicEntry.totalQuestions++;
        topicEntry.totalTime += response.timeSpent || 0;
        if (isUnanswered) {
          topicEntry.unanswered++;
        } else if (isCorrect) {
          topicEntry.correct++;
        } else {
          topicEntry.incorrect++;
        }

        // --- Aggregate into subject map ---
        if (!subjectMap.has(subject)) {
          subjectMap.set(subject, {
            subject,
            totalQuestions: 0,
            correct: 0,
            incorrect: 0,
            totalScore: 0,
            maxPossible: 0,
          });
        }
        const subjectEntry = subjectMap.get(subject)!;
        subjectEntry.totalQuestions++;
        subjectEntry.maxPossible += markingScheme.correct;
        if (isUnanswered) {
          subjectEntry.totalScore += markingScheme.unanswered || 0;
        } else if (isCorrect) {
          subjectEntry.correct++;
          subjectEntry.totalScore += markingScheme.correct;
        } else {
          subjectEntry.incorrect++;
          subjectEntry.totalScore += markingScheme.incorrect;
        }

        // --- Aggregate into difficulty map ---
        const diffEntry = difficultyMap.get(difficulty);
        if (diffEntry) {
          diffEntry.total++;
          if (!isUnanswered && isCorrect) {
            diffEntry.correct++;
          }
        }

        // --- Overall counters ---
        if (!isUnanswered) {
          totalQuestionsAttempted++;
          if (isCorrect) totalCorrectOverall++;
        }
      }
    }

    // --- Build topicWisePerformance ---
    const topicWisePerformance = Array.from(topicMap.values()).map((t) => ({
      subject: t.subject,
      topic: t.topic,
      totalQuestions: t.totalQuestions,
      correct: t.correct,
      incorrect: t.incorrect,
      unanswered: t.unanswered,
      accuracy:
        t.correct + t.incorrect > 0
          ? Math.round((t.correct / (t.correct + t.incorrect)) * 10000) / 100
          : 0,
      avgTimePerQuestion:
        t.totalQuestions > 0
          ? Math.round((t.totalTime / t.totalQuestions) * 100) / 100
          : 0,
    }));

    // --- Build subjectWisePerformance ---
    const subjectWisePerformance = Array.from(subjectMap.values()).map((s) => ({
      subject: s.subject,
      totalQuestions: s.totalQuestions,
      correct: s.correct,
      accuracy:
        s.correct + s.incorrect > 0
          ? Math.round((s.correct / (s.correct + s.incorrect)) * 10000) / 100
          : 0,
      totalScore: Math.round(s.totalScore * 100) / 100,
      maxPossible: s.maxPossible,
    }));

    // --- Build difficultyAnalysis ---
    const difficultyAnalysis = Array.from(difficultyMap.values()).map((d) => ({
      difficulty: d.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      total: d.total,
      correct: d.correct,
      accuracy:
        d.total > 0
          ? Math.round((d.correct / d.total) * 10000) / 100
          : 0,
    }));

    // --- Build overallStats ---
    const scores = attempts.map((a) => a.totalScore || 0);
    const totalMarksPerTest = attempts.map((a) => {
      const t = a.testId as any;
      return t?.totalMarks || 1;
    });

    const percentages = scores.map((s, i) => (s / totalMarksPerTest[i]) * 100);
    const avgScore =
      Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100;
    const avgPercentage =
      Math.round(
        (percentages.reduce((sum, p) => sum + p, 0) / percentages.length) * 100,
      ) / 100;

    const bestIdx = percentages.indexOf(Math.max(...percentages));
    const bestScore = scores[bestIdx];
    const bestPercentage = Math.round(percentages[bestIdx] * 100) / 100;

    const overallStats = {
      totalTestsTaken: attempts.length,
      avgScore,
      avgPercentage,
      bestScore,
      bestPercentage,
      totalQuestionsAttempted,
      overallAccuracy:
        totalQuestionsAttempted > 0
          ? Math.round((totalCorrectOverall / totalQuestionsAttempted) * 10000) / 100
          : 0,
    };

    // --- Build recentTrend (last 10 tests) ---
    const recentTrend = attempts.slice(0, 10).map((a) => {
      const t = a.testId as any;
      const totalMarks = t?.totalMarks || 1;
      const score = a.totalScore || 0;
      return {
        testTitle: t?.title || 'Unknown Test',
        date: a.submittedAt || a.startedAt,
        score,
        totalMarks,
        percentage: Math.round((score / totalMarks) * 10000) / 100,
      };
    });

    // --- Build weakTopics and strongTopics ---
    // Only consider topics with at least 3 questions attempted (correct + incorrect >= 3)
    const topicsWithAccuracy = topicWisePerformance
      .filter((t) => t.correct + t.incorrect >= 3)
      .map((t) => ({
        subject: t.subject,
        topic: t.topic,
        accuracy: t.accuracy,
        totalQuestions: t.totalQuestions,
        correct: t.correct,
      }));

    const weakTopics = [...topicsWithAccuracy]
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    const strongTopics = [...topicsWithAccuracy]
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    return {
      topicWisePerformance,
      subjectWisePerformance,
      difficultyAnalysis,
      overallStats,
      recentTrend,
      weakTopics,
      strongTopics,
    };
  }
}
