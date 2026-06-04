import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { SlotService } from './slot.service';
import { CreateSlotDto, UpdateSlotDto } from './slot.dto';

@ApiTags('timetable-slots')
@ApiBearerAuth()
@Controller({ path: 'timetable/slots', version: '1' })
export class SlotController {
  constructor(private readonly service: SlotService) {}

  @Post()
  @RequirePermissions(Permission.TIMETABLE_MANAGE)
  create(@Body() dto: CreateSlotDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.TIMETABLE_READ)
  @ApiQuery({ name: 'sectionId', required: true })
  list(@Query('sectionId') sectionId: string) {
    return this.service.listBySection(sectionId);
  }

  @Get(':id')
  @RequirePermissions(Permission.TIMETABLE_READ)
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TIMETABLE_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateSlotDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.TIMETABLE_MANAGE)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
