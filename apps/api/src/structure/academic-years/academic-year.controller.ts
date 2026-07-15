import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import {
  RequirePermissions,
  RequireAnyPermission,
} from '../../auth/decorators/require-permissions.decorator';
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

  // Admissions roles (registrar/finance) need to list/read academic years to build a quote.
  @Get()
  @RequireAnyPermission(Permission.ACADEMICYEAR_MANAGE, Permission.ENROLLMENT_MANAGE)
  @ApiQuery({ name: 'campusId', required: false })
  list(@Query('campusId') campusId?: string) {
    return this.service.list(campusId);
  }

  @Get(':id')
  @RequireAnyPermission(Permission.ACADEMICYEAR_MANAGE, Permission.ENROLLMENT_MANAGE)
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ACADEMICYEAR_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateAcademicYearDto) {
    return this.service.update(id, dto);
  }

  // Close an academic year (administrative event; never mutates Student/Enrollment). Decision 8.
  @Post(':id/close')
  @RequirePermissions(Permission.ACADEMICYEAR_MANAGE)
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  // Academic years are never deletable (Decision 8) — the service refuses with 400. Kept so the route
  // returns a clear "use close instead" error rather than a 404.
  @Delete(':id')
  @RequirePermissions(Permission.ACADEMICYEAR_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
