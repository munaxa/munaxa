import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { ResolverService } from './resolver.service';

@ApiTags('timetable')
@ApiBearerAuth()
@Controller({ path: 'timetable/sections', version: '1' })
export class ResolverController {
  constructor(private readonly service: ResolverService) {}

  @Get(':sectionId/day')
  @RequirePermissions(Permission.TIMETABLE_READ)
  @ApiQuery({ name: 'date', required: false, description: 'ISO date (defaults to today)' })
  @ApiOperation({
    summary: "Resolve a section's schedule for a date (exceptions + Ramadan applied)",
  })
  day(@Param('sectionId') sectionId: string, @Query('date') date?: string) {
    return this.service.resolveDay(sectionId, this.parseDate(date));
  }

  @Get(':sectionId/current')
  @RequirePermissions(Permission.TIMETABLE_READ)
  @ApiQuery({ name: 'at', required: false, description: 'ISO datetime (defaults to now)' })
  @ApiOperation({ summary: 'Resolve the current and next class for a section' })
  current(@Param('sectionId') sectionId: string, @Query('at') at?: string) {
    return this.service.currentClass(sectionId, this.parseDate(at));
  }

  private parseDate(input?: string): Date {
    if (!input) return new Date();
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    return date;
  }
}
