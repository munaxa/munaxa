import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { ChargeService } from './charge.service';
import { CreateChargeDto, CreateInstallmentsDto } from './charge.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller({ path: 'finance/charges', version: '1' })
export class ChargeController {
  constructor(private readonly service: ChargeService) {}

  @Post()
  @RequirePermissions(Permission.FINANCE_MANAGE)
  create(@Body() dto: CreateChargeDto) {
    return this.service.create(dto);
  }

  @Post('installments')
  @RequirePermissions(Permission.FINANCE_MANAGE)
  createInstallments(@Body() dto: CreateInstallmentsDto) {
    return this.service.createInstallments(dto);
  }

  @Get()
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiQuery({ name: 'studentId', required: true })
  list(@Query('studentId') studentId: string) {
    return this.service.listForStudent(studentId);
  }
}
