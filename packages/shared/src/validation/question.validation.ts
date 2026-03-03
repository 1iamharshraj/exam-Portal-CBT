import { z } from 'zod';
import { QuestionType, DifficultyLevel } from '../types/question.types';

const optionSchema = z.object({
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean(),
});

const numericalAnswerSchema = z.object({
  value: z.number(),
  tolerance: z.number().min(0).default(0),
});

export const createQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.nativeEnum(QuestionType),
  options: z.array(optionSchema).optional(),
  correctAnswer: z.union([z.array(z.string()), numericalAnswerSchema]),
  subject: z.string().min(1, 'Subject is required'),
  topic: z.string().min(1, 'Topic is required'),
  subtopic: z.string().optional(),
  difficultyLevel: z.nativeEnum(DifficultyLevel),
  marks: z.number().min(0).default(4),
  negativeMarks: z.number().min(0).default(1),
  explanation: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export type CreateQuestionFormData = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionFormData = z.infer<typeof updateQuestionSchema>;
