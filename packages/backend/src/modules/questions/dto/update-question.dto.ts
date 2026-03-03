import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { QuestionType, DifficultyLevel } from '@exam-portal/shared';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  questionText?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @IsOptional()
  @IsArray()
  options?: Array<{ text: string; isCorrect: boolean }>;

  @IsOptional()
  correctAnswer?: string[] | { value: number; tolerance: number };

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  subtopic?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  marks?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  negativeMarks?: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
