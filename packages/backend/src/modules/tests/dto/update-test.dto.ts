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
import { TestStatus } from '@exam-portal/shared';

export class UpdateTestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  sections?: Array<{
    name: string;
    subject: string;
    questionCount: number;
    totalMarks: number;
    timeLimit?: number;
    markingScheme: { correct: number; incorrect: number; unanswered: number; partialMarking?: boolean };
    questionIds: string[];
  }>;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalTimeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  hasSectionTimeLimit?: boolean;

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedBatches?: string[];
}
