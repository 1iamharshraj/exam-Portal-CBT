import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { QuestionType, DifficultyLevel } from '@exam-portal/shared';

export type QuestionDocument = HydratedDocument<Question>;

@Schema({ timestamps: true, collection: 'questions' })
export class Question {
  @Prop({ required: true })
  questionText: string;

  @Prop({ required: true, enum: QuestionType })
  questionType: QuestionType;

  @Prop({ type: [{ text: String, isCorrect: Boolean }], default: [] })
  options: Array<{ text: string; isCorrect: boolean }>;

  @Prop({ type: Object, required: true })
  correctAnswer: string[] | { value: number; tolerance: number };

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  topic: string;

  @Prop()
  subtopic: string;

  @Prop({ required: true, enum: DifficultyLevel })
  difficultyLevel: DifficultyLevel;

  @Prop({ default: 4 })
  marks: number;

  @Prop({ default: 1 })
  negativeMarks: number;

  @Prop()
  explanation: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

QuestionSchema.index({ subject: 1, topic: 1 });
QuestionSchema.index({ difficultyLevel: 1 });
QuestionSchema.index({ questionType: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index(
  { questionText: 'text', 'options.text': 'text' },
  { name: 'question_text_search' },
);
