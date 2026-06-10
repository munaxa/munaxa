import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CollectionsService } from './collections.service';
import { SendReminderDto, SetCollectionsDto } from './collections.dto';

/**
 * Fee collections (Phase 18): the per-student legal/collections tag shown on the finance card,
 * and late-payment reminders (in-app + SMS) to parents. LEGAL-tagged students are excluded
 * from reminders.
 */
@ApiTags('finance')
@ApiBearerAuth()
@Controller({ path: 'finance/collections', version: '1' })
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get('students/:studentId')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({
    summary: 'Collections tag + reminder snapshot + reminder history (finance card)',
  })
  profile(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.service.getProfile(studentId);
  }

  @Put('students/:studentId')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Set the collections/legal tag (NONE / FINANCIAL_ISSUE / LEGAL)' })
  setStatus(@Param('studentId', ParseUUIDPipe) studentId: string, @Body() dto: SetCollectionsDto) {
    return this.service.setCollections(studentId, dto);
  }

  @Post('students/:studentId/reminders')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: "Send a late-payment reminder to this student's parents (in-app/SMS)" })
  remind(@Param('studentId', ParseUUIDPipe) studentId: string, @Body() dto: SendReminderDto) {
    return this.service.sendForStudent(studentId, dto);
  }

  @Post('reminders/send')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({
    summary: 'Bulk late-payment reminders to all due/overdue accounts (excludes LEGAL-tagged)',
  })
  remindAll(@Body() dto: SendReminderDto) {
    return this.service.sendBatch(dto);
  }
}
