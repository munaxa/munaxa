import { Body, Controller, Delete, Get, HttpCode, Post, Query } from '@nestjs/common';
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

  @Get('installments')
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiQuery({ name: 'studentId', required: true })
  installmentPlan(@Query('studentId') studentId: string) {
    return this.service.getInstallmentPlan(studentId);
  }

  @Delete('installments')
  @HttpCode(204)
  @RequirePermissions(Permission.FINANCE_MANAGE)
  @ApiQuery({ name: 'studentId', required: true })
  deleteInstallmentPlan(@Query('studentId') studentId: string) {
    return this.service.deleteInstallmentPlan(studentId);
  }

  @Get()
  @RequirePermissions(Permission.FINANCE_READ)
  @ApiQuery({ name: 'studentId', required: true })
  list(@Query('studentId') studentId: string) {
    return this.service.listForStudent(studentId);
  }
}
