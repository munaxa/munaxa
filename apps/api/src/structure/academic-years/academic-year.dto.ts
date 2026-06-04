import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  campusId!: string;

  @ApiProperty({ example: '2025/2026' })
  @IsString()
  @MaxLength(20)
  name!: string;

  @ApiProperty({ example: '2025-09-01', description: 'ISO date' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-06-30', description: 'ISO date' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class UpdateAcademicYearDto extends PartialType(CreateAcademicYearDto) {}
