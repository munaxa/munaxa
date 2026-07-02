import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { FinanceReportsRepository, type FinanceDimension } from './reports.repository';

/**
 * Dimensional finance reports (RR-3): revenue / collected / outstanding grouped by academic year,
 * grade, campus or fee category. Read-only; requires finance:read.
 */
@ApiTags('finance')
@ApiBearerAuth()
@Controller({ path: 'finance/reports', version: '1' })
export class FinanceReportsController {
  constructor(private readonly repo: FinanceReportsRepository) {}

  @Get('summary')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'Revenue/outstanding grouped by a finance dimension' })
  @ApiQuery({ name: 'dimension', enum: ['academicYear', 'grade', 'campus', 'category'] })
  summary(@Query('dimension') dimension: FinanceDimension = 'category') {
    return this.repo.summaryByDimension(dimension);
  }
}
