import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CollectionsService } from './collections.service';
import { PushOutstandingDto, SendReminderDto, SetCollectionsDto } from './collections.dto';

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

  @Post('reminders/push-outstanding')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({
    summary:
      'Push outstanding balances to parents, filtered by overdue age (>30/60/90 days) and/or a minimum amount',
  })
  pushOutstanding(@Body() dto: PushOutstandingDto) {
    return this.service.pushOutstanding(dto);
  }

  @Get('aging')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({
    summary: 'Aging report (outstanding by 30/60/90-day buckets) + collection effectiveness',
  })
  aging() {
    return this.service.agingReport();
  }

  @Get('students/:studentId/aging')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'Outstanding balance bucketed by age for one student' })
  studentAging(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.service.aging(studentId);
  }

  @Post('students/:studentId/transport/evaluate')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({
    summary: 'Reconcile this student transport suspension against the overdue policy threshold',
  })
  evaluateTransport(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.service.evaluateTransport(studentId);
  }

  @Post('transport/evaluate')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({
    summary: 'Sweep all accounts: suspend overdue transport and restore those caught up',
  })
  evaluateTransportAll() {
    return this.service.evaluateTransportBatch();
  }
}
