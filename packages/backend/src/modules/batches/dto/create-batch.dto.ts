import { IsNotEmpty, IsOptional, IsString, IsDateString, Matches, MaxLength } from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'Code may only contain letters, numbers, and hyphens' })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
