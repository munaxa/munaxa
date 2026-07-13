import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { FinancialAccountService } from './financial-account.service';
import { StatementService } from '../statement/statement.service';

/**
 * Family Finance — the financial customer (FinancialAccount) is the primary entity. Search is
 * family-first; selecting a family opens the dashboard (family totals by default, with the children).
 */
@ApiTags('finance')
@ApiBearerAuth()
@Controller({ path: 'finance/families', version: '1' })
export class FinancialAccountController {
  constructor(
    private readonly service: FinancialAccountService,
    private readonly statements: StatementService,
  ) {}

  @Get('search')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({
    summary:
      'Search families by guardian / father / mother / family name / phone / national id / student',
  })
  @ApiQuery({ name: 'q', required: true })
  search(@Query('q') q: string) {
    return this.service.search(q ?? '');
  }

  @Get(':id')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({
    summary: 'Family Finance Dashboard: account header, family totals (KPIs), children',
  })
  dashboard(@Param('id') id: string) {
    return this.service.dashboard(id);
  }

  @Get(':id/statement')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiOperation({ summary: 'Family statement: family totals + each child’s per-student totals' })
  statement(@Param('id') id: string) {
    return this.statements.forFamily(id);
  }
}
