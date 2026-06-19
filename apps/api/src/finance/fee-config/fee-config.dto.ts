import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DiscountCalc, DiscountType, TransportDirection } from '@prisma/client';
import {
  IsBoolean,
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

// ── Grade fee schedule (registration + annual tuition, per grade × academic year) ──
export class CreateGradeFeeScheduleDto {
  @ApiProperty() @IsUUID() gradeId!: string;
  @ApiProperty() @IsUUID() academicYearId!: string;

  @ApiProperty({ example: 50, description: 'Registration fee (JOD)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100000000)
  registrationFee!: number;

  @ApiProperty({ example: 1800, description: 'Annual tuition (JOD)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100000000)
  tuitionFee!: number;

  @ApiProperty({ example: '2026-09-01', description: 'Effective-from (ISO date)' })
  @IsString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2027-08-31' })
  @IsOptional()
  @IsString()
  effectiveTo?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateGradeFeeScheduleDto extends PartialType(CreateGradeFeeScheduleDto) {}

// ── Transport fare (per academic year × direction) ──
export class CreateTransportFareDto {
  @ApiProperty() @IsUUID() academicYearId!: string;

  @ApiProperty({ enum: TransportDirection })
  @IsEnum(TransportDirection)
  direction!: TransportDirection;

  @ApiProperty({ example: 300, description: 'Annual transport fee (JOD)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(100000000)
  amount!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateTransportFareDto extends PartialType(CreateTransportFareDto) {}

// ── Discount rule ──
export class CreateDiscountRuleDto {
  @ApiProperty({ example: 'Full payment 5%' }) @IsString() @MaxLength(150) name!: string;
  @ApiProperty({ enum: DiscountType }) @IsEnum(DiscountType) type!: DiscountType;
  @ApiProperty({ enum: DiscountCalc }) @IsEnum(DiscountCalc) calc!: DiscountCalc;

  @ApiProperty({ example: 5, description: 'Percent (0–100) or fixed JOD' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ description: 'Cap for percentage discounts (JOD)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ default: false, description: 'Whether the discount applies to transport' })
  @IsOptional()
  @IsBoolean()
  appliesToTransport?: boolean;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
export class UpdateDiscountRuleDto extends PartialType(CreateDiscountRuleDto) {}

// ── Apply a configured discount rule to a student's charge (records a FeeAdjustment) ──
export class ApplyDiscountRuleDto {
  @ApiProperty() @IsUUID() studentId!: string;
  @ApiProperty() @IsUUID() chargeId!: string;
}

// ── Billing policy (tenant singleton) ──
export class UpsertBillingPolicyDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) @Max(24) minInstallments!: number;
  @ApiProperty({ example: 9 }) @IsInt() @Min(1) @Max(24) maxInstallments!: number;

  @ApiProperty({ example: 5, description: 'Full-payment discount (%)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  fullPaymentDiscountPct!: number;

  @ApiProperty({
    example: 2,
    description: 'Suspend transport after this many overdue installments',
  })
  @IsInt()
  @Min(1)
  @Max(99)
  suspendTransportAfterOverdue!: number;
}
