import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AttendanceSourceMode,
  BusEventType,
  PresenceEventType,
  PresenceMethod,
  TransportMethod,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePresenceEventDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: PresenceEventType })
  @IsEnum(PresenceEventType)
  eventType!: PresenceEventType;

  @ApiPropertyOptional({ enum: PresenceMethod })
  @IsOptional()
  @IsEnum(PresenceMethod)
  method?: PresenceMethod;

  @ApiPropertyOptional({ description: 'When the event happened (defaults to now)' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) deviceId?: string;

  @ApiPropertyOptional({ description: 'Offline-queue id — idempotent replay key' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientRef?: string;
}

export class CreateBusEventDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  busId!: string;

  @ApiProperty({ enum: BusEventType })
  @IsEnum(BusEventType)
  eventType!: BusEventType;

  @ApiPropertyOptional({ enum: TransportMethod })
  @IsOptional()
  @IsEnum(TransportMethod)
  method?: TransportMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({ description: 'Offline-queue id — idempotent replay key' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  clientRef?: string;
}

export class ListEventsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;
}

export class UpdateAttendanceSettingsDto {
  @ApiPropertyOptional({ enum: AttendanceSourceMode })
  @IsOptional()
  @IsEnum(AttendanceSourceMode)
  mode?: AttendanceSourceMode;

  @ApiPropertyOptional({ enum: TransportMethod })
  @IsOptional()
  @IsEnum(TransportMethod)
  busMethod?: TransportMethod;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() presenceEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() transportEnabled?: boolean;
}
