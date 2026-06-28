import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentLanguage, DocumentType, FeeItemKind } from '@prisma/client';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

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
  @ApiPropertyOptional() @IsOptional() @IsUUID() transactionId?: string;

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

export class EmailDocumentDto {
  @ApiProperty() @IsEmail() to!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
}
