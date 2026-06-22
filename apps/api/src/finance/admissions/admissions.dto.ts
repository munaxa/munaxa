import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FeeItemKind,
  Gender,
  ParentRelation,
  QuotePaymentMode,
  TransportDirection,
} from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Fee-item catalog ──
export class CreateFeeItemDto {
  @ApiProperty({ enum: FeeItemKind }) @IsEnum(FeeItemKind) kind!: FeeItemKind;
  @ApiProperty() @IsString() nameEn!: string;
  @ApiProperty() @IsString() nameAr!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mandatory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() discountable?: boolean;
}

export class UpdateFeeItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() nameEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mandatory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() discountable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpsertGradeFeeItemDto {
  @ApiProperty() @IsUUID() feeItemId!: string;
  @ApiProperty() @IsUUID() gradeId!: string;
  @ApiProperty() @IsUUID() academicYearId!: string;
  @ApiProperty() @IsNumber() amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mandatory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() discountable?: boolean;
  @ApiPropertyOptional({ example: '2026-09-01' }) @IsOptional() @IsString() effectiveFrom?: string;
}

// ── Registrar fee override on a quote line ──
export class FeeOverrideDto {
  @ApiProperty({ enum: FeeItemKind }) @IsEnum(FeeItemKind) kind!: FeeItemKind;
  @ApiProperty({ description: 'New (overridden) amount in JOD' }) @IsNumber() amount!: number;
  @ApiProperty() @IsString() reason!: string;
}

// ── Quote ──
export class QuoteDto {
  @ApiProperty() @IsUUID() gradeId!: string;
  @ApiProperty() @IsUUID() academicYearId!: string;
  @ApiPropertyOptional({ description: 'Returning student to attach the quote to' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ enum: TransportDirection, default: TransportDirection.NONE })
  @IsOptional()
  @IsEnum(TransportDirection)
  transportDirection?: TransportDirection;

  @ApiPropertyOptional({ enum: QuotePaymentMode, default: QuotePaymentMode.INSTALLMENTS })
  @IsOptional()
  @IsEnum(QuotePaymentMode)
  paymentMode?: QuotePaymentMode;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  installments?: number;

  @ApiPropertyOptional({ example: '2026-09-01' }) @IsOptional() @IsString() firstDueDate?: string;

  @ApiPropertyOptional({ type: [FeeOverrideDto], description: 'Registrar fee overrides' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeOverrideDto)
  overrides?: FeeOverrideDto[];

  @ApiPropertyOptional({ default: false, description: 'Persist this quote for later commit' })
  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}

// ── Registration commit ──
class StudentInfoDto {
  @ApiProperty() @IsString() firstNameEn!: string;
  @ApiProperty() @IsString() lastNameEn!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstNameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastNameAr?: string;
  @ApiPropertyOptional({ enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiPropertyOptional({ example: '2015-05-01' }) @IsOptional() @IsString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalId?: string;
}

class ParentInfoDto {
  @ApiProperty() @IsString() firstNameEn!: string;
  @ApiProperty() @IsString() lastNameEn!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstNameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastNameAr?: string;
  @ApiProperty({ description: 'Primary mobile number (mandatory)' })
  @IsString()
  @MinLength(1)
  phone!: string;
  @ApiPropertyOptional({ description: 'Secondary/alternate mobile number' })
  @IsOptional()
  @IsString()
  phoneAlt?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional({ enum: ParentRelation, description: 'Relation to the student' })
  @IsOptional()
  @IsEnum(ParentRelation)
  relation?: ParentRelation;
}

export class CommitDto {
  @ApiProperty({ description: 'Persisted quote id from POST /admissions/quote' })
  @IsUUID()
  quoteId!: string;

  @ApiProperty() @IsString() idempotencyKey!: string;

  @ApiPropertyOptional({ description: 'Existing student id (returning student re-enrollment)' })
  @IsOptional()
  @IsUUID()
  existingStudentId?: string;

  @ApiPropertyOptional({ type: StudentInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentInfoDto)
  student?: StudentInfoDto;

  @ApiPropertyOptional({ type: ParentInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ParentInfoDto)
  parent?: ParentInfoDto;

  @ApiPropertyOptional({ description: 'Section to place the student into' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;
}

// ── Approvals & arrangements ──
export class ApprovalDecisionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class CreateArrangementDto {
  @ApiProperty() @IsUUID() studentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() enrollmentId?: string;
  @ApiProperty() @IsString() description!: string;
}
