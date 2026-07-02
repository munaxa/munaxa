import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentLanguage, DocumentType, FeeItemKind } from '@prisma/client';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

/** Generate a finance document for a student. `type` selects the template. */
export class GenerateDocumentDto {
  @ApiProperty({ enum: DocumentType }) @IsEnum(DocumentType) type!: DocumentType;
  @ApiProperty() @IsUUID() studentId!: string;
  @ApiPropertyOptional({ enum: DocumentLanguage })
  @IsOptional()
  @IsEnum(DocumentLanguage)
  language?: DocumentLanguage;

  /** Required for ANNUAL_TUITION_CERTIFICATE. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() academicYearId?: string;

  /** Required for PAYMENT_RECEIPT. */
  @ApiPropertyOptional() @IsOptional() @IsUUID() paymentId?: string;

  /** ANNUAL_TUITION_CERTIFICATE: optional categories to include alongside tuition. */
  @ApiPropertyOptional({ enum: FeeItemKind, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(FeeItemKind, { each: true })
  includeKinds?: FeeItemKind[];
}

/** (Re)generate the registration agreement for an enrollment (creates a new version). */
export class GenerateAgreementDto {
  @ApiProperty() @IsUUID() enrollmentId!: string;
  @ApiPropertyOptional({ enum: DocumentLanguage })
  @IsOptional()
  @IsEnum(DocumentLanguage)
  language?: DocumentLanguage;
}

/**
 * Email a document. With no fields set, it is sent to the student's primary parent. Parent roles can
 * be toggled, and custom addresses / CC / BCC added (custom recipients are permission-controlled by
 * the DOCUMENT_GENERATE requirement on the endpoint).
 */
export class EmailDocumentDto {
  /** Explicit custom recipient addresses (in addition to any selected parent roles). */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  to?: string[];

  @ApiPropertyOptional({ description: 'Send to the primary parent (default true).' })
  @IsOptional()
  @IsBoolean()
  includePrimaryParent?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() includeSecondaryParent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includeGuardian?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiPropertyOptional() @IsOptional() @IsEmail() replyTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
}
