import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BatchDocument = HydratedDocument<Batch>;

@Schema({ timestamps: true, collection: 'batches' })
export class Batch {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  code: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const BatchSchema = SchemaFactory.createForClass(Batch);

BatchSchema.index({ code: 1 }, { unique: true });
BatchSchema.index({ isActive: 1 });
BatchSchema.index({ startDate: -1 });
