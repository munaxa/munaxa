import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { TimetableConfigService } from './config.service';
import { UpsertTimetableConfigDto } from './config.dto';

@ApiTags('timetable-config')
@ApiBearerAuth()
@Controller({ path: 'timetable/config', version: '1' })
export class TimetableConfigController {
  constructor(private readonly service: TimetableConfigService) {}

  @Get(':campusId')
  @RequirePermissions(Permission.TIMETABLE_READ)
  @ApiOperation({ summary: 'Get a campus timetable config (Ramadan mode)' })
  get(@Param('campusId') campusId: string) {
    return this.service.get(campusId);
  }

  @Put(':campusId')
  @RequirePermissions(Permission.TIMETABLE_MANAGE)
  @ApiOperation({ summary: 'Set a campus timetable config (Ramadan mode + window)' })
  upsert(@Param('campusId') campusId: string, @Body() dto: UpsertTimetableConfigDto) {
    return this.service.upsert(campusId, dto);
  }
}
