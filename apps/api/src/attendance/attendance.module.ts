import { Module } from '@nestjs/common';
import { StudentAttendanceController } from './students/student-attendance.controller';
import { StudentAttendanceService } from './students/student-attendance.service';
import { StudentAttendanceRepository } from './students/student-attendance.repository';
import { TeacherAttendanceController } from './teachers/teacher-attendance.controller';
import { TeacherAttendanceService } from './teachers/teacher-attendance.service';
import { TeacherAttendanceRepository } from './teachers/teacher-attendance.repository';

/**
 * Attendance: idempotent student marking (manual + QR, the offline-sync target), teacher
 * attendance, the section dashboard summary, and student history (parent/student view).
 */
@Module({
  controllers: [StudentAttendanceController, TeacherAttendanceController],
  providers: [
    StudentAttendanceService,
    StudentAttendanceRepository,
    TeacherAttendanceService,
    TeacherAttendanceRepository,
  ],
})
export class AttendanceModule {}
