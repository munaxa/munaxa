import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { LedgerService } from './ledger.service';
import { AllocatePaymentDto, ApplyAdjustmentDto, CreateRefundDto, RejectDto } from './ledger.dto';

/**
 * Student billing ledger endpoints (Phase 17): deductions, payment allocation, and refunds.
 * All writes require `finance:manage`. Reads are folded into the student statement.
 */
@ApiTags('finance')
@ApiBearerAuth()
@Controller({ path: 'finance/ledger', version: '1' })
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  // ---- Deductions -----------------------------------------------------------

  @Post('adjustments')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Apply a deduction (scholarship/discount/waiver/credit memo)' })
  applyAdjustment(@Body() dto: ApplyAdjustmentDto) {
    return this.service.applyAdjustment(dto);
  }

  @Post('adjustments/:id/reverse')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  reverseAdjustment(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.reverseAdjustment(id);
  }

  // ---- Allocation -----------------------------------------------------------

  @Post('allocate')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Apply a verified payment to one or more charges' })
  allocate(@Body() dto: AllocatePaymentDto) {
    return this.service.allocate(dto);
  }

  // ---- Refunds --------------------------------------------------------------

  @Post('refunds')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Request a refund of available credit (PENDING → verify)' })
  createRefund(@Body() dto: CreateRefundDto) {
    return this.service.createRefund(dto);
  }

  @Post('refunds/:id/verify')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  verifyRefund(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.verifyRefund(id);
  }

  @Post('refunds/:id/reject')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  rejectRefund(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectDto) {
    return this.service.rejectRefund(id, dto.note);
  }
}
