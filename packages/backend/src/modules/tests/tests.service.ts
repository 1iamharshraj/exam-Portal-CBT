import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Test, TestDocument } from './schemas/test.schema';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';

@Injectable()
export class TestsService {
  constructor(
    @InjectModel(Test.name) private testModel: Model<TestDocument>,
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
      throw new NotFoundException(
        'All sections must have enough questions before publishing',
      );
    }

    test.status = 'PUBLISHED' as any;
    return test.save();
  }
}
