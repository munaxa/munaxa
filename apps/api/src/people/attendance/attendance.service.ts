import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StaffAttendanceSource } from '@prisma/client';
import { AttendanceRepository, type StaffAttendanceView } from './attendance.repository';
import { workingDaysBetween } from '../leave/leave-days.logic';
import {
  overlapWorkingDays,
  summarizeAttendance,
  type AttendanceDayInput,
  type PayrollPrepSummary,
} from './payroll-prep.logic';
import type { ReportTable } from '../../reporting/export/report.types';
import type {
  BulkAttendanceDto,
  ListAttendanceQueryDto,
  PayrollPrepQueryDto,
  RecordAttendanceDto,
} from './attendance.dto';

export interface PayrollPrepRow extends PayrollPrepSummary {
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
}

export interface PayrollPrepResult {
  from: string;
  to: string;
  workingDays: number;
  rows: PayrollPrepRow[];
}

/** Parse an ISO date (YYYY-MM-DD) into a UTC midnight Date, matching how `@db.Date` is stored. */
function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

@Injectable()
export class AttendanceService {
  constructor(private readonly repo: AttendanceRepository) {}

  async record(employeeId: string, dto: RecordAttendanceDto): Promise<StaffAttendanceView> {
    await this.assertEmployee(employeeId);
    return this.repo.record(employeeId, parseDate(dto.date), {
      status: dto.status,
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.checkInAt !== undefined ? { checkInAt: new Date(dto.checkInAt) } : {}),
      ...(dto.checkOutAt !== undefined ? { checkOutAt: new Date(dto.checkOutAt) } : {}),
      ...(dto.lateMinutes !== undefined ? { lateMinutes: dto.lateMinutes } : {}),
      ...(dto.overtimeHours !== undefined ? { overtimeHours: dto.overtimeHours } : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    });
  }

  async bulk(dto: BulkAttendanceDto): Promise<{ count: number }> {
    const date = parseDate(dto.date);
    const source = dto.source ?? StaffAttendanceSource.MANUAL;
    const count = await this.repo.bulkRecord(
      date,
      source,
      dto.entries.map((e) => ({
        employeeId: e.employeeId,
        status: e.status,
        ...(e.lateMinutes !== undefined ? { lateMinutes: e.lateMinutes } : {}),
        ...(e.overtimeHours !== undefined ? { overtimeHours: e.overtimeHours } : {}),
        ...(e.note !== undefined ? { note: e.note } : {}),
      })),
    );
    return { count };
  }

  async listForEmployee(
    employeeId: string,
    query: ListAttendanceQueryDto,
  ): Promise<StaffAttendanceView[]> {
    await this.assertEmployee(employeeId);
    return this.repo.listForEmployee(
      employeeId,
      query.from ? parseDate(query.from) : undefined,
      query.to ? parseDate(query.to) : undefined,
    );
  }

  listForDate(date: string): Promise<StaffAttendanceView[]> {
    return this.repo.listForDate(parseDate(date));
  }

  // ----- Payroll preparation ------------------------------------------------
  async payrollPrep(query: PayrollPrepQueryDto): Promise<PayrollPrepResult> {
    const from = parseDate(query.from);
    const to = parseDate(query.to);
    if (to < from) throw new BadRequestException('`to` must be on or after `from`');

    const workingDays = workingDaysBetween(from, to);
    const [employees, attendance, leave] = await Promise.all([
      this.repo.listActiveEmployees(),
      this.repo.attendanceInRange(from, to),
      this.repo.approvedLeaveInRange(from, to),
    ]);

    // Group attendance + leave coverage by employee.
    const daysByEmployee = new Map<string, AttendanceDayInput[]>();
    for (const row of attendance) {
      const list = daysByEmployee.get(row.employeeId) ?? [];
      list.push({
        status: row.status,
        lateMinutes: row.lateMinutes,
        overtimeHours: row.overtimeHours === null ? null : Number(row.overtimeHours),
      });
      daysByEmployee.set(row.employeeId, list);
    }

    const leaveByEmployee = new Map<string, { paidLeaveDays: number; unpaidLeaveDays: number }>();
    for (const span of leave) {
      const days = overlapWorkingDays(from, to, span.startDate, span.endDate);
      if (days <= 0) continue;
      const acc = leaveByEmployee.get(span.employeeId) ?? { paidLeaveDays: 0, unpaidLeaveDays: 0 };
      if (span.paid) acc.paidLeaveDays += days;
      else acc.unpaidLeaveDays += days;
      leaveByEmployee.set(span.employeeId, acc);
    }

    const rows: PayrollPrepRow[] = employees.map((emp) => {
      const summary = summarizeAttendance(
        workingDays,
        daysByEmployee.get(emp.id) ?? [],
        leaveByEmployee.get(emp.id) ?? { paidLeaveDays: 0, unpaidLeaveDays: 0 },
      );
      return {
        employeeId: emp.id,
        employeeName: `${emp.firstNameEn} ${emp.lastNameEn}`,
        employeeNumber: emp.employeeNumber,
        ...summary,
      };
    });

    return { from: query.from.slice(0, 10), to: query.to.slice(0, 10), workingDays, rows };
  }

  /** Build a generic {@link ReportTable} of a payroll-prep result for CSV/xlsx/pdf export. */
  toReportTable(result: PayrollPrepResult): ReportTable {
    return {
      title: 'Payroll preparation',
      subtitle: `${result.from} → ${result.to} · ${result.workingDays} working days`,
      columns: [
        { key: 'employeeNumber', header: 'Employee #' },
        { key: 'employeeName', header: 'Name' },
        { key: 'workingDays', header: 'Working days' },
        { key: 'presentDays', header: 'Present' },
        { key: 'remoteDays', header: 'Remote' },
        { key: 'absentDays', header: 'Absent' },
        { key: 'lateDays', header: 'Late' },
        { key: 'lateMinutes', header: 'Late minutes' },
        { key: 'overtimeHours', header: 'Overtime hours' },
        { key: 'paidLeaveDays', header: 'Paid leave' },
        { key: 'unpaidLeaveDays', header: 'Unpaid leave' },
        { key: 'payableDays', header: 'Payable days' },
      ],
      rows: result.rows.map((r) => ({
        employeeNumber: r.employeeNumber ?? '',
        employeeName: r.employeeName,
        workingDays: r.workingDays,
        presentDays: r.presentDays,
        remoteDays: r.remoteDays,
        absentDays: r.absentDays,
        lateDays: r.lateDays,
        lateMinutes: r.lateMinutes,
        overtimeHours: r.overtimeHours,
        paidLeaveDays: r.paidLeaveDays,
        unpaidLeaveDays: r.unpaidLeaveDays,
        payableDays: r.payableDays,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  private async assertEmployee(employeeId: string) {
    if (!(await this.repo.employeeExists(employeeId))) {
      throw new NotFoundException('Employee not found');
    }
  }
}
