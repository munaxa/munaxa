import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ExceptionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExceptionDto {
  @ApiProperty({ example: '2026-03-01', description: 'ISO date the exception applies to' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Section; omit for a school-wide exception' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ example: 2, description: 'Period; omit for a whole-day exception' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  periodIndex?: number;

  @ApiProperty({ enum: ExceptionType })
  @IsEnum(ExceptionType)
  type!: ExceptionType;

  @ApiPropertyOptional({ description: 'Replacement subject (REPLACEMENT)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Replacement teacher (REPLACEMENT)' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Substitute teacher (SUBSTITUTION)' })
  @IsOptional()
  @IsUUID()
  substituteTeacherId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class UpdateExceptionDto extends PartialType(CreateExceptionDto) {}
