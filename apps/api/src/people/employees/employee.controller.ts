import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';

@ApiTags('employees')
@ApiBearerAuth()
@Controller({ path: 'employees', version: '1' })
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Post()
  @RequirePermissions(Permission.EMPLOYEE_MANAGE)
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.EMPLOYEE_MANAGE)
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermissions(Permission.EMPLOYEE_MANAGE)
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.EMPLOYEE_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.EMPLOYEE_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
