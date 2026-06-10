import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { DashboardRepository } from './dashboard.repository';

/** Tenant-wide KPI overview for the admin landing dashboard. */
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly repo: DashboardRepository) {}

  @Get('overview')
  @RequirePermissions(Permission.REPORT_READ)
  @ApiOperation({
    summary: 'Students, staff, today attendance, finance, e-invoice, recent activity',
  })
  overview() {
    return this.repo.overview();
  }
}
