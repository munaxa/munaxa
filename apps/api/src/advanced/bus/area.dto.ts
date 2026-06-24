import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'Khalda' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether transport can be requested for this area (shown in registration).',
  })
  @IsOptional()
  @IsBoolean()
  transportationAvailable?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateAreaDto extends PartialType(CreateAreaDto) {}
