import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { ExceptionService } from './exception.service';
import { CreateExceptionDto, UpdateExceptionDto } from './exception.dto';

@ApiTags('timetable-exceptions')
@ApiBearerAuth()
@Controller({ path: 'timetable/exceptions', version: '1' })
export class ExceptionController {
  constructor(private readonly service: ExceptionService) {}

  @Post()
  @RequirePermissions(Permission.TIMETABLE_MANAGE)
  create(@Body() dto: CreateExceptionDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.TIMETABLE_READ)
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'ISO date' })
  list(@Query('sectionId') sectionId?: string, @Query('date') date?: string) {
    return this.service.list(sectionId, date);
  }

  @Get(':id')
  @RequirePermissions(Permission.TIMETABLE_READ)
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TIMETABLE_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateExceptionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.TIMETABLE_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
