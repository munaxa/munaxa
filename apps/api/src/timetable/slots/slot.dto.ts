import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DayOfWeek, ScheduleType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateSlotDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sectionId!: string;

  @ApiPropertyOptional({ enum: ScheduleType, default: ScheduleType.REGULAR })
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(20)
  periodIndex!: number;

  @ApiProperty({ example: '08:00' })
  @Matches(TIME, { message: 'startTime must be HH:MM' })
  startTime!: string;

  @ApiProperty({ example: '08:45' })
  @Matches(TIME, { message: 'endTime must be HH:MM' })
  endTime!: string;

  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @MaxLength(120)
  subject!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classroomId?: string;
}

export class UpdateSlotDto extends PartialType(CreateSlotDto) {}
