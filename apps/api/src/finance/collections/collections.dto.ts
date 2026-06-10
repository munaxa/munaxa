import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionsStatus, ReminderChannel } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetCollectionsDto {
  @ApiProperty({
    enum: CollectionsStatus,
    description: 'NONE clears the flag; LEGAL = "contact the lawyer" (excluded from reminders)',
  })
  @IsEnum(CollectionsStatus)
  status!: CollectionsStatus;

  @ApiPropertyOptional({ description: 'Legal/collections note (e.g. lawyer contact, case ref)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class SendReminderDto {
  @ApiProperty({ enum: ReminderChannel, isArray: true, example: ['IN_APP', 'SMS'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ReminderChannel, { each: true })
  channels!: ReminderChannel[];
}
