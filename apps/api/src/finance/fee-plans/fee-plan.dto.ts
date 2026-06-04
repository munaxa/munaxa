import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FeeRecurrence } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFeePlanDto {
  @ApiProperty({ example: 'Annual Tuition' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 1500, description: 'Amount in JOD' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100000000)
  amount!: number;

  @ApiPropertyOptional({ enum: FeeRecurrence, default: FeeRecurrence.ONE_TIME })
  @IsOptional()
  @IsEnum(FeeRecurrence)
  recurrence?: FeeRecurrence;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFeePlanDto extends PartialType(CreateFeePlanDto) {}
