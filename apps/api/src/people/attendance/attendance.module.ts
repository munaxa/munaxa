import { Module } from '@nestjs/common';
import { ReportingModule } from '../../reporting/reporting.module';
import { AttendanceController, EmployeeAttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';

/**
 * HR Phase 5 — staff (payroll) attendance & payroll preparation. Per-employee daily attendance
 * (check-in/out, overtime, corrections) feeding a payroll-prep summary that aggregates attendance
 * with approved leave. Distinct from academic TeacherAttendance and student StudentAttendance.
 * Reuses the shared {@link ExportService} (via ReportingModule) for csv/xlsx/pdf downloads.
 */
@Module({
  imports: [ReportingModule],
  controllers: [AttendanceController, EmployeeAttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  exports: [AttendanceService], // reused by the self-service portal (Phase 9)
})
export class StaffAttendanceModule {}
