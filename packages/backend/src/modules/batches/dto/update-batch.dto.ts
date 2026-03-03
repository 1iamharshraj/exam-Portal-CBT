import { IsBoolean, IsDateString, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateBatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'Code may only contain letters, numbers, and hyphens' })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
