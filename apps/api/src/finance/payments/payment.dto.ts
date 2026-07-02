import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import {
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

export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ example: 750, description: 'Amount received in JOD' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(100000000)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ description: 'CliQ reference / e-wallet transfer id' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reference?: string;

  @ApiPropertyOptional({ description: 'S3 key of an uploaded receipt (from presign)' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  receiptKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class PresignReceiptDto {
  @ApiProperty({ example: 'receipt.jpg' })
  @IsString()
  @MaxLength(200)
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MaxLength(150)
  contentType!: string;

  @ApiProperty({ example: 204800, description: 'Bytes' })
  @IsInt()
  @Min(1)
  @Max(15728640) // 15 MB
  size!: number;
}

export class RejectPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
