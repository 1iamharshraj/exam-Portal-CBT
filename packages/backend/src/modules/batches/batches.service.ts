import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Batch, BatchDocument } from './schemas/batch.schema';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class BatchesService {
  constructor(
    @InjectModel(Batch.name) private batchModel: Model<BatchDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(createBatchDto: CreateBatchDto, userId: string): Promise<BatchDocument> {
    const existing = await this.batchModel.findOne({ code: createBatchDto.code.toUpperCase() });
    if (existing) {
      throw new ConflictException('Batch code already exists');
    }

    const batch = new this.batchModel({
      ...createBatchDto,
      code: createBatchDto.code.toUpperCase(),
      createdBy: new Types.ObjectId(userId),
    });
    return batch.save();
  }

  async findAll(query: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, search, page = 1, limit = 25 } = query;
    const filter: Record<string, unknown> = {};

    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.batchModel
        .find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.batchModel.countDocuments(filter),
    ]);

    // Attach student count for each batch
    const batchesWithCount = await Promise.all(
      data.map(async (batch) => {
        const studentCount = await this.userModel.countDocuments({ batch: batch.code });
        return { ...batch.toObject(), studentCount };
      }),
    );

    return {
      data: batchesWithCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<BatchDocument> {
    const batch = await this.batchModel.findById(id);
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async update(id: string, updateBatchDto: UpdateBatchDto): Promise<BatchDocument> {
    if (updateBatchDto.code) {
      const existing = await this.batchModel.findOne({
        code: updateBatchDto.code.toUpperCase(),
        _id: { $ne: id },
      });
      if (existing) throw new ConflictException('Batch code already exists');
      updateBatchDto.code = updateBatchDto.code.toUpperCase();
    }

    const batch = await this.batchModel.findByIdAndUpdate(id, updateBatchDto, { new: true });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async delete(id: string): Promise<void> {
    const batch = await this.batchModel.findById(id);
    if (!batch) throw new NotFoundException('Batch not found');

    // Check if students are assigned
    const studentCount = await this.userModel.countDocuments({ batch: batch.code });
    if (studentCount > 0) {
      throw new ConflictException(
        `Cannot delete batch with ${studentCount} assigned student(s). Reassign them first.`,
      );
    }

    await this.batchModel.findByIdAndDelete(id);
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<number> {
    const result = await this.batchModel.updateMany({ _id: { $in: ids } }, { isActive });
    return result.modifiedCount;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    // Only delete batches with no students
    let deleted = 0;
    for (const id of ids) {
      const batch = await this.batchModel.findById(id);
      if (!batch) continue;
      const count = await this.userModel.countDocuments({ batch: batch.code });
      if (count === 0) {
        await this.batchModel.findByIdAndDelete(id);
        deleted++;
      }
    }
    return deleted;
  }

  async getAllCodes(): Promise<string[]> {
    const batches = await this.batchModel.find({ isActive: true }).select('code').sort({ code: 1 });
    return batches.map((b) => b.code);
  }
}
