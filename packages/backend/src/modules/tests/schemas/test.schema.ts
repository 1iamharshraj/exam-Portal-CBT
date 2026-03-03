import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExamType, TestStatus } from '@exam-portal/shared';

export type TestDocument = HydratedDocument<Test>;

@Schema({ _id: false })
class MarkingScheme {
  @Prop({ required: true })
  correct: number;

  @Prop({ required: true })
  incorrect: number;

  @Prop({ default: 0 })
  unanswered: number;

  @Prop({ default: false })
  partialMarking: boolean;
}

@Schema({ _id: false })
class TestSection {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  questionCount: number;

  @Prop({ required: true })
  totalMarks: number;

  @Prop()
  timeLimit: number;

  @Prop({ type: MarkingScheme, required: true })
  markingScheme: MarkingScheme;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Question' }], default: [] })
  questionIds: Types.ObjectId[];
}

@Schema({ timestamps: true, collection: 'tests' })
export class Test {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: ExamType })
  examType: ExamType;

  @Prop({ type: [TestSection], default: [] })
  sections: TestSection[];

  @Prop({ required: true })
  totalTimeMinutes: number;

  @Prop({ default: false })
  hasSectionTimeLimit: boolean;

  @Prop({ default: 0 })
  totalMarks: number;

  @Prop({ default: false })
  randomizeQuestions: boolean;

  @Prop({ default: false })
  randomizeOptions: boolean;

  @Prop()
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ required: true, enum: TestStatus, default: TestStatus.DRAFT })
  status: TestStatus;

  @Prop({ type: [String], default: [] })
  assignedBatches: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const TestSchema = SchemaFactory.createForClass(Test);

TestSchema.index({ status: 1 });
TestSchema.index({ examType: 1 });
TestSchema.index({ createdBy: 1 });
TestSchema.index({ startTime: 1, endTime: 1 });
