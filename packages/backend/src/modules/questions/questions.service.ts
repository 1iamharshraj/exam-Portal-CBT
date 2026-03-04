import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Question, QuestionDocument } from './schemas/question.schema';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
  ) {}

  async create(
    dto: CreateQuestionDto,
    userId: string,
  ): Promise<QuestionDocument> {
    const question = new this.questionModel({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
    return question.save();
  }

  async findAll(query: {
    subject?: string;
    topic?: string;
    subtopic?: string;
    questionType?: string;
    difficultyLevel?: string;
    search?: string;
    tags?: string;
    createdBy?: string;
    excludeIds?: string[];
    page?: number;
    limit?: number;
  }) {
    const {
      subject,
      topic,
      subtopic,
      questionType,
      difficultyLevel,
      search,
      tags,
      createdBy,
      excludeIds,
      page = 1,
      limit = 25,
    } = query;

    const filter: Record<string, unknown> = { isActive: true };

    if (subject) filter.subject = subject;
    if (topic) filter.topic = topic;
    if (subtopic) filter.subtopic = subtopic;
    if (questionType) filter.questionType = questionType;
    if (difficultyLevel) filter.difficultyLevel = difficultyLevel;
    if (createdBy) filter.createdBy = new Types.ObjectId(createdBy);
    if (tags) filter.tags = { $in: tags.split(',') };
    if (excludeIds && excludeIds.length > 0) {
      filter._id = { $nin: excludeIds.map((id) => new Types.ObjectId(id)) };
    }
    if (search) {
      filter.$or = [
        { questionText: { $regex: search, $options: 'i' } },
        { 'options.text': { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.questionModel
        .find(filter)
        .populate('createdBy', 'firstName lastName')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.questionModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<QuestionDocument> {
    const question = await this.questionModel
      .findById(id)
      .populate('createdBy', 'firstName lastName');
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async update(
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionDocument> {
    const question = await this.questionModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async delete(id: string): Promise<void> {
    const result = await this.questionModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Question not found');
  }

  async bulkCreate(
    questions: CreateQuestionDto[],
    userId: string,
  ): Promise<{
    created: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    const results = {
      created: 0,
      errors: [] as Array<{ index: number; error: string }>,
    };

    for (let i = 0; i < questions.length; i++) {
      try {
        const question = new this.questionModel({
          ...questions[i],
          createdBy: new Types.ObjectId(userId),
        });
        await question.save();
        results.created++;
      } catch (err) {
        results.errors.push({
          index: i,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async getStats(userId?: string) {
    const match: Record<string, unknown> = { isActive: true };
    if (userId) match.createdBy = new Types.ObjectId(userId);

    const [bySubject, byDifficulty, byType, total] = await Promise.all([
      this.questionModel.aggregate([
        { $match: match },
        { $group: { _id: '$subject', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.questionModel.aggregate([
        { $match: match },
        { $group: { _id: '$difficultyLevel', count: { $sum: 1 } } },
      ]),
      this.questionModel.aggregate([
        { $match: match },
        { $group: { _id: '$questionType', count: { $sum: 1 } } },
      ]),
      this.questionModel.countDocuments(match),
    ]);

    return { total, bySubject, byDifficulty, byType };
  }
}
