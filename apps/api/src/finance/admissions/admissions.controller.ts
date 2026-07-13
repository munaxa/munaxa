import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApprovalStatus, EnrollmentStatus } from '@prisma/client';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { AdmissionsService } from './admissions.service';
import {
  ApprovalDecisionDto,
  CommitDto,
  CreateArrangementDto,
  CreateFeeItemDto,
  FamilyCommitDto,
  QuoteDto,
  UpdateFeeItemDto,
  UpsertGradeFeeItemDto,
} from './admissions.dto';

/**
 * Admissions: fee-item catalog, persisted quotations, atomic registration commit (new + returning
 * students), registrar fee overrides with mandatory modification tracking, finance approvals, and
 * custom financial arrangements. Built on the existing finance/billing ledger.
 */
@ApiTags('admissions')
@ApiBearerAuth()
@Controller({ path: 'admissions', version: '1' })
export class AdmissionsController {
  constructor(private readonly service: AdmissionsService) {}

  // ── Fee-item catalog ──
  @Get('fee-items')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'List the fee-item catalog' })
  listFeeItems() {
    return this.service.listFeeItems();
  }

  @Post('fee-items')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Create a fee item' })
  createFeeItem(@Body() dto: CreateFeeItemDto) {
    return this.service.createFeeItem(dto);
  }

  @Patch('fee-items/:id')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Update a fee item' })
  updateFeeItem(@Param('id') id: string, @Body() dto: UpdateFeeItemDto) {
    return this.service.updateFeeItem(id, dto);
  }

  @Get('grade-fee-items')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'List per-grade/year fee amounts' })
  listGradeFeeItems(
    @Query('academicYearId') academicYearId: string,
    @Query('gradeId') gradeId?: string,
  ) {
    return this.service.listGradeFeeItems(academicYearId, gradeId);
  }

  @Post('grade-fee-items')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiOperation({ summary: 'Set (supersede) a per-grade/year fee amount' })
  upsertGradeFeeItem(@Body() dto: UpsertGradeFeeItemDto) {
    return this.service.upsertGradeFeeItem(dto);
  }

  // ── Quotation ──
  @Post('quote')
  @RequirePermissions(Permission.ENROLLMENT_MANAGE)
  @ApiOperation({
    summary: 'Compute (and optionally persist) a fee quotation — no student created',
  })
  quote(@Body() dto: QuoteDto) {
    return this.service.quote(dto);
  }

  @Get('quotes/:id')
  @RequirePermissions(Permission.ENROLLMENT_MANAGE)
  @ApiOperation({ summary: 'Fetch a persisted quotation' })
  getQuote(@Param('id') id: string) {
    return this.service.getQuote(id);
  }

  // ── Returning student ──
  @Get('returning/:studentId')
  @RequirePermissions(Permission.ENROLLMENT_MANAGE)
  @ApiOperation({ summary: 'Load a returning student profile, parents and prior enrollments' })
  loadReturning(@Param('studentId') studentId: string) {
    return this.service.loadReturning(studentId);
  }

  // ── Commit ──
  @Post('commit')
  @RequirePermissions(Permission.ENROLLMENT_MANAGE)
  @ApiOperation({ summary: 'Atomically create the student/parent/enrollment/charges (idempotent)' })
  commit(@Body() dto: CommitDto) {
    return this.service.commit(dto);
  }

  @Post('family/commit')
  @RequirePermissions(Permission.ENROLLMENT_MANAGE)
  @ApiOperation({
    summary:
      'Atomic family registration: one guardian/customer, one payment plan, one or more students (idempotent)',
  })
  familyCommit(@Body() dto: FamilyCommitDto) {
    return this.service.familyCommit(dto);
  }

  // ── Enrollments / reporting ──
  @Get('enrollments')
  @RequirePermissions(Permission.ENROLLMENT_MANAGE)
  @ApiOperation({ summary: 'List enrollments (registration & re-enrollment report)' })
  listEnrollments(
    @Query('academicYearId') academicYearId?: string,
    @Query('gradeId') gradeId?: string,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.service.listEnrollments({
      ...(academicYearId ? { academicYearId } : {}),
      ...(gradeId ? { gradeId } : {}),
      ...(status ? { status } : {}),
    });
  }

  // ── Approvals ──
  @Get('fee-modifications')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'List fee modifications (optionally by approval status)' })
  listModifications(@Query('status') status?: ApprovalStatus) {
    return this.service.listModifications(status);
  }

  @Post('fee-modifications/:id/approve')
  @RequirePermissions(Permission.FINANCE_APPROVE)
  @ApiOperation({ summary: 'Approve a fee modification (activates a pending enrollment)' })
  approve(@Param('id') id: string, @Body() dto: ApprovalDecisionDto) {
    return this.service.approve(id, dto.note);
  }

  @Post('fee-modifications/:id/reject')
  @RequirePermissions(Permission.FINANCE_APPROVE)
  @ApiOperation({ summary: 'Reject a fee modification' })
  reject(@Param('id') id: string, @Body() dto: ApprovalDecisionDto) {
    return this.service.reject(id, dto.note);
  }

  // ── Financial arrangements ──
  @Post('arrangements')
  @RequirePermissions(Permission.FEE_OVERRIDE)
  @ApiOperation({ summary: 'Record a custom financial arrangement' })
  createArrangement(@Body() dto: CreateArrangementDto) {
    return this.service.createArrangement(dto);
  }
}
