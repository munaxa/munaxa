import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto, UpdateAcademicYearDto } from './academic-year.dto';

@ApiTags('academic-years')
@ApiBearerAuth()
@Controller({ path: 'academic-years', version: '1' })
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}

  @Post()
  @RequirePermissions(Permission.ACADEMICYEAR_MANAGE)
  create(@Body() dto: CreateAcademicYearDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.ACADEMICYEAR_MANAGE)
  @ApiQuery({ name: 'campusId', required: false })
  list(@Query('campusId') campusId?: string) {
    return this.service.list(campusId);
  }

  @Get(':id')
  @RequirePermissions(Permission.ACADEMICYEAR_MANAGE)
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ACADEMICYEAR_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateAcademicYearDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.ACADEMICYEAR_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
