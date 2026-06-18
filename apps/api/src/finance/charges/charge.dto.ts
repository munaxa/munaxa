import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateChargeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  feePlanId?: string;

  @ApiProperty({ example: 'Tuition — Term 1' })
  @IsString()
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: 750, description: 'Amount in JOD' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100000000)
  amount!: number;

  @ApiPropertyOptional({ example: '2025-10-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class CreateInstallmentsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ example: 'Tuition — 2025/2026' })
  @IsString()
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: 1200, description: 'Total amount in JOD, split across the installments' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.003)
  @Max(100000000)
  totalAmount!: number;

  @ApiProperty({ example: 10, description: 'Number of monthly installments (2–60)' })
  @IsInt()
  @Min(2)
  @Max(60)
  months!: number;

  @ApiProperty({ example: '2025-10-01', description: 'Due date of the first installment' })
  @IsDateString()
  firstDueDate!: string;
}

export class PayInstallmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ format: 'uuid', description: 'The installment charge being paid' })
  @IsUUID()
  chargeId!: string;

  @ApiProperty({ example: 500, description: 'Amount paid in JOD (may exceed the installment)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(100000000)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ description: 'CliQ reference / receipt id' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reference?: string;
}
