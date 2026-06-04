import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender, ParentRelation, StudentStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstNameEn!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastNameEn!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstNameAr!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastNameAr!: string;

  @ApiPropertyOptional({ description: 'Ministry of Education student number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  moeStudentNumber?: string;

  @ApiPropertyOptional({ description: 'Jordanian National ID (10 digits)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @ApiPropertyOptional({ example: '2015-04-12' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

export class LinkParentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  parentId!: string;

  @ApiProperty({ enum: ParentRelation })
  @IsEnum(ParentRelation)
  relation!: ParentRelation;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ImportStudentsDto {
  @ApiProperty({
    description:
      'CSV text. Header row required: firstNameEn,lastNameEn,firstNameAr,lastNameAr,moeStudentNumber,nationalId,gender',
  })
  @IsString()
  @MinLength(1)
  csv!: string;
}
