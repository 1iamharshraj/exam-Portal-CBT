import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType, DifficultyLevel } from '@exam-portal/shared';

class OptionDto {
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsString()
  questionText: string;

  @IsEnum(QuestionType)
  questionType: QuestionType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];

  correctAnswer: string[] | { value: number; tolerance: number };

  @IsString()
  subject: string;

  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  subtopic?: string;

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsNumber()
  @Min(0)
  marks: number;

  @IsNumber()
  @Min(0)
  negativeMarks: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
