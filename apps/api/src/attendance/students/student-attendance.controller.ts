import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Permission } from '@munaxa/domain';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { StudentAttendanceService } from './student-attendance.service';
import { BulkMarkDto, QrMarkDto } from './student-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller({ path: 'attendance/students', version: '1' })
export class StudentAttendanceController {
  constructor(private readonly service: StudentAttendanceService) {}

  @Post('bulk')
  @HttpCode(200)
  @RequirePermissions(Permission.ATTENDANCE_CREATE)
  @ApiOperation({ summary: 'Idempotent bulk attendance marking (offline-sync target)' })
  bulk(@Body() dto: BulkMarkDto) {
    return this.service.bulkMark(dto);
  }

  @Post('qr')
  @HttpCode(200)
  @RequirePermissions(Permission.ATTENDANCE_CREATE)
  @ApiOperation({ summary: 'Mark attendance by scanning a student QR code' })
  qr(@Body() dto: QrMarkDto) {
    return this.service.markByQr(dto);
  }

  @Get()
  @RequirePermissions(Permission.ATTENDANCE_READ)
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'periodIndex', required: false })
  list(
    @Query('sectionId') sectionId: string,
    @Query('date') date: string,
    @Query('periodIndex') periodIndex?: string,
  ) {
    return this.service.listForSection(
      sectionId,
      date,
      periodIndex !== undefined ? Number(periodIndex) : undefined,
    );
  }

  @Get('summary')
  @RequirePermissions(Permission.ATTENDANCE_READ)
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'periodIndex', required: false })
  @ApiOperation({ summary: 'Attendance dashboard summary for a section/date' })
  summary(
    @Query('sectionId') sectionId: string,
    @Query('date') date: string,
    @Query('periodIndex') periodIndex?: string,
  ) {
    return this.service.summary(
      sectionId,
      date,
      periodIndex !== undefined ? Number(periodIndex) : 0,
    );
  }

  @Get(':studentId/history')
  @RequirePermissions(Permission.ATTENDANCE_READ)
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'Student attendance history (parent/student view)' })
  history(
    @Param('studentId') studentId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.studentHistory(studentId, from, to);
  }
}
