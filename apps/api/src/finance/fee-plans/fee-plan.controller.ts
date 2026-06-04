import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { FeePlanService } from './fee-plan.service';
import { CreateFeePlanDto, UpdateFeePlanDto } from './fee-plan.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller({ path: 'finance/fee-plans', version: '1' })
export class FeePlanController {
  constructor(private readonly service: FeePlanService) {}

  @Post()
  @RequirePermissions(Permission.FINANCE_MANAGE)
  create(@Body() dto: CreateFeePlanDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.FINANCE_READ)
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermissions(Permission.FINANCE_READ)
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateFeePlanDto) {
    return this.service.update(id, dto);
  }
}
