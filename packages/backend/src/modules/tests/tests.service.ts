import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Test, TestDocument } from './schemas/test.schema';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { QuestionsService } from '../questions/questions.service';

@Injectable()
export class TestsService {
  constructor(
    @InjectModel(Test.name) private testModel: Model<TestDocument>,
    private readonly questionsService: QuestionsService,
  ) {}

  async create(dto: CreateTestDto, userId: string): Promise<TestDocument> {
    const totalMarks = dto.sections.reduce(
      (sum, s) => sum + s.totalMarks,
      0,
    );

    const sections = dto.sections.map((s) => ({
      ...s,
      questionIds: s.questionIds.map((id) => new Types.ObjectId(id)),
    }));

    const test = new this.testModel({
      ...dto,
      sections,
      totalMarks,
      createdBy: new Types.ObjectId(userId),
    });
    return test.save();
  }

  async findAll(query: {
    status?: string;
    examType?: string;
    search?: string;
    createdBy?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, examType, search, createdBy, page = 1, limit = 25 } = query;
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (examType) filter.examType = examType;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.testModel
        .find(filter)
        .populate('createdBy', 'firstName lastName')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.testModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string): Promise<TestDocument> {
    const test = await this.testModel
      .findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('sections.questionIds');
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async update(id: string, dto: UpdateTestDto): Promise<TestDocument> {
    const updateData: Record<string, unknown> = { ...dto };

    if (dto.sections) {
      updateData.sections = dto.sections.map((s) => ({
        ...s,
        questionIds: s.questionIds.map((qid) => new Types.ObjectId(qid)),
      }));
      updateData.totalMarks = dto.sections.reduce(
        (sum, s) => sum + s.totalMarks,
        0,
      );
    }

    const test = await this.testModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (!test) throw new NotFoundException('Test not found');
    return test;
  }

  async delete(id: string): Promise<void> {
    const result = await this.testModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Test not found');
  }

  async publish(id: string): Promise<TestDocument> {
    const test = await this.testModel.findById(id);
    if (!test) throw new NotFoundException('Test not found');

    const hasQuestions = test.sections.every(
      (s) => s.questionIds.length >= s.questionCount,
    );
    if (!hasQuestions) {
      throw new BadRequestException(
        'All sections must have enough questions before publishing',
      );
    }

    test.status = 'PUBLISHED' as any;
    return test.save();
  }

  async updateSectionQuestions(
    testId: string,
    sectionIndex: number,
    questionIds: string[],
  ): Promise<TestDocument> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');
    if (sectionIndex < 0 || sectionIndex >= test.sections.length) {
      throw new BadRequestException('Invalid section index');
    }

    test.sections[sectionIndex].questionIds = questionIds.map(
      (id) => new Types.ObjectId(id),
    );
    return test.save();
  }

  async autoPickQuestions(
    testId: string,
    sectionIndex: number,
    filters: { subject?: string; topic?: string; difficultyLevel?: string; count: number },
  ): Promise<TestDocument> {
    const test = await this.testModel.findById(testId);
    if (!test) throw new NotFoundException('Test not found');
    if (sectionIndex < 0 || sectionIndex >= test.sections.length) {
      throw new BadRequestException('Invalid section index');
    }

    const section = test.sections[sectionIndex];
    const existingIds = section.questionIds.map((id) => id.toString());

    const query: Record<string, unknown> = { isActive: true };
    const subject = filters.subject || section.subject;
    if (subject) query.subject = subject;
    if (filters.topic) query.topic = filters.topic;
    if (filters.difficultyLevel) query.difficultyLevel = filters.difficultyLevel;
    if (existingIds.length > 0) {
      query._id = { $nin: existingIds.map((id) => new Types.ObjectId(id)) };
    }

    const result = await this.questionsService.findAll({
      ...query,
      subject: subject as string,
      topic: filters.topic,
      difficultyLevel: filters.difficultyLevel,
      page: 1,
      limit: filters.count,
    });

    const newIds = result.data.map((q) => q._id);
    section.questionIds = [
      ...section.questionIds,
      ...newIds.map((id) => new Types.ObjectId(id.toString())),
    ];

    return test.save();
  }
}
