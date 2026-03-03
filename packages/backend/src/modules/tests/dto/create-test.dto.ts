import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { ExamType } from '@exam-portal/shared';

export class CreateTestDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ExamType)
  examType: ExamType;

  @IsArray()
  sections: Array<{
    name: string;
    subject: string;
    questionCount: number;
    totalMarks: number;
    timeLimit?: number;
    markingScheme: { correct: number; incorrect: number; unanswered: number; partialMarking?: boolean };
    questionIds: string[];
  }>;

  @IsNumber()
  @Min(1)
  totalTimeMinutes: number;

  @IsBoolean()
  hasSectionTimeLimit: boolean;

  @IsBoolean()
  randomizeQuestions: boolean;

  @IsBoolean()
  randomizeOptions: boolean;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedBatches?: string[];
}
