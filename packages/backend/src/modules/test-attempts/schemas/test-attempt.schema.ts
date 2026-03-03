import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AttemptStatus, QuestionStatus } from '@exam-portal/shared';

export type TestAttemptDocument = HydratedDocument<TestAttempt>;

@Schema({ _id: false })
class QuestionResponse {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ required: true })
  sectionIndex: number;

  @Prop({ type: [String], default: [] })
  selectedOptions: string[];

  @Prop()
  numericalAnswer: number;

  @Prop({ required: true, enum: QuestionStatus, default: QuestionStatus.NOT_VISITED })
  status: QuestionStatus;

  @Prop({ default: 0 })
  timeSpent: number;
}

@Schema({ _id: false })
class SectionScore {
  @Prop({ required: true })
  sectionIndex: number;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 0 })
  correct: number;

  @Prop({ default: 0 })
  incorrect: number;

  @Prop({ default: 0 })
  unanswered: number;
}

@Schema({ timestamps: true, collection: 'test_attempts' })
export class TestAttempt {
  @Prop({ type: Types.ObjectId, ref: 'Test', required: true })
  testId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: [QuestionResponse], default: [] })
  responses: QuestionResponse[];

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  submittedAt: Date;

  @Prop({ required: true, enum: AttemptStatus, default: AttemptStatus.IN_PROGRESS })
  status: AttemptStatus;

  @Prop({ default: 0 })
  currentSectionIndex: number;

  @Prop({ default: 0 })
  currentQuestionIndex: number;

  @Prop()
  totalScore: number;

  @Prop({ type: [SectionScore], default: [] })
  sectionScores: SectionScore[];
}

export const TestAttemptSchema = SchemaFactory.createForClass(TestAttempt);

TestAttemptSchema.index({ testId: 1, studentId: 1 });
TestAttemptSchema.index({ studentId: 1, status: 1 });
TestAttemptSchema.index({ testId: 1, status: 1 });
