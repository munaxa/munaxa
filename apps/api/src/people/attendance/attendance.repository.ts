import { Injectable } from '@nestjs/common';
import {
  StaffAttendanceSource,
  StaffAttendanceStatus,
  StaffLeaveStatus,
  type Prisma,
} from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';

const ATTENDANCE_INCLUDE = {
  employee: {
    select: { id: true, firstNameEn: true, lastNameEn: true, employeeNumber: true },
  },
} satisfies Prisma.StaffAttendanceInclude;

export type StaffAttendanceView = Prisma.StaffAttendanceGetPayload<{
  include: typeof ATTENDANCE_INCLUDE;
}>;

/** Fields a caller may set when recording/correcting a day (scalar FK ids handled internally). */
export interface RecordAttendanceData {
  status: StaffAttendanceStatus;
  source?: StaffAttendanceSource;
  checkInAt?: Date | null;
  checkOutAt?: Date | null;
  lateMinutes?: number | null;
  overtimeHours?: number | null;
  note?: string | null;
}

export interface BulkEntry {
  employeeId: string;
  status: StaffAttendanceStatus;
  lateMinutes?: number | null;
  overtimeHours?: number | null;
  note?: string | null;
}

/** Minimal projection of an employee for payroll-prep (avoids over-fetching). */
export type PayrollEmployee = {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  employeeNumber: string | null;
};

export type LeaveSpan = {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  paid: boolean;
};

@Injectable()
export class AttendanceRepository extends TenantRepository {
  employeeExists(employeeId: string): Promise<boolean> {
    return this.run(
      async (tx) =>
        (await tx.employee.findFirst({ where: { id: employeeId, deletedAt: null } })) !== null,
    );
  }

  /**
   * Record or correct one employee's attendance for a day. Upserts on (employee, date); when an
   * existing row's status changes, the previous status is captured into the correction trail
   * (`correctedFromStatus` / `correctedById` / `correctedAt`).
   */
  record(employeeId: string, date: Date, data: RecordAttendanceData): Promise<StaffAttendanceView> {
    const actorId = TenantContextStore.get()?.actorUserId ?? null;
    return this.run(async (tx, tenantId) => {
      const existing = await tx.staffAttendance.findUnique({
        where: { tenantId_employeeId_date: { tenantId, employeeId, date } },
      });
      const scalars = {
        status: data.status,
        source: data.source ?? StaffAttendanceSource.MANUAL,
        checkInAt: data.checkInAt ?? null,
        checkOutAt: data.checkOutAt ?? null,
        lateMinutes: data.lateMinutes ?? null,
        overtimeHours: data.overtimeHours ?? null,
        note: data.note ?? null,
      };

      let row: StaffAttendanceView;
      if (!existing) {
        row = await tx.staffAttendance.create({
          data: { tenantId, employeeId, date, markedById: actorId, ...scalars },
          include: ATTENDANCE_INCLUDE,
        });
      } else {
        const corrected = existing.status !== data.status;
        row = await tx.staffAttendance.update({
          where: { id: existing.id },
          data: {
            ...scalars,
            ...(corrected
              ? {
                  correctedFromStatus: existing.status,
                  correctedById: actorId,
                  correctedAt: new Date(),
                }
              : {}),
          },
          include: ATTENDANCE_INCLUDE,
        });
      }

      await this.writeAudit(tx, tenantId, {
        action: existing ? 'staff_attendance.correct' : 'staff_attendance.record',
        entityType: 'StaffAttendance',
        entityId: row.id,
        metadata: {
          employeeId,
          date: date.toISOString().slice(0, 10),
          status: data.status,
          ...(existing && existing.status !== data.status ? { from: existing.status } : {}),
        },
      });
      return row;
    });
  }

  /** Mark many employees for a single date in one transaction. Returns the affected row count. */
  bulkRecord(date: Date, source: StaffAttendanceSource, entries: BulkEntry[]): Promise<number> {
    const actorId = TenantContextStore.get()?.actorUserId ?? null;
    return this.run(async (tx, tenantId) => {
      let count = 0;
      for (const entry of entries) {
        const existing = await tx.staffAttendance.findUnique({
          where: { tenantId_employeeId_date: { tenantId, employeeId: entry.employeeId, date } },
        });
        const scalars = {
          status: entry.status,
          source,
          lateMinutes: entry.lateMinutes ?? null,
          overtimeHours: entry.overtimeHours ?? null,
          note: entry.note ?? null,
        };
        if (!existing) {
          await tx.staffAttendance.create({
            data: { tenantId, employeeId: entry.employeeId, date, markedById: actorId, ...scalars },
          });
        } else {
          const corrected = existing.status !== entry.status;
          await tx.staffAttendance.update({
            where: { id: existing.id },
            data: {
              ...scalars,
              ...(corrected
                ? {
                    correctedFromStatus: existing.status,
                    correctedById: actorId,
                    correctedAt: new Date(),
                  }
                : {}),
            },
          });
        }
        count += 1;
      }
      await this.writeAudit(tx, tenantId, {
        action: 'staff_attendance.bulk',
        entityType: 'StaffAttendance',
        metadata: { date: date.toISOString().slice(0, 10), count },
      });
      return count;
    });
  }

  listForEmployee(employeeId: string, from?: Date, to?: Date): Promise<StaffAttendanceView[]> {
    return this.run((tx) => {
      const where: Prisma.StaffAttendanceWhereInput = { employeeId };
      if (from || to) {
        where.date = {};
        if (from) where.date.gte = from;
        if (to) where.date.lte = to;
      }
      return tx.staffAttendance.findMany({
        where,
        include: ATTENDANCE_INCLUDE,
        orderBy: { date: 'desc' },
      });
    });
  }

  listForDate(date: Date): Promise<StaffAttendanceView[]> {
    return this.run((tx) =>
      tx.staffAttendance.findMany({
        where: { date },
        include: ATTENDANCE_INCLUDE,
        orderBy: [{ employee: { lastNameEn: 'asc' } }, { employee: { firstNameEn: 'asc' } }],
      }),
    );
  }

  // ----- Payroll-prep sources ----------------------------------------------
  listActiveEmployees(): Promise<PayrollEmployee[]> {
    return this.run((tx) =>
      tx.employee.findMany({
        where: { deletedAt: null },
        select: { id: true, firstNameEn: true, lastNameEn: true, employeeNumber: true },
        orderBy: [{ lastNameEn: 'asc' }, { firstNameEn: 'asc' }],
      }),
    );
  }

  attendanceInRange(
    from: Date,
    to: Date,
  ): Promise<
    Array<{
      employeeId: string;
      status: StaffAttendanceStatus;
      lateMinutes: number | null;
      overtimeHours: Prisma.Decimal | null;
    }>
  > {
    return this.run((tx) =>
      tx.staffAttendance.findMany({
        where: { date: { gte: from, lte: to } },
        select: { employeeId: true, status: true, lateMinutes: true, overtimeHours: true },
      }),
    );
  }

  /** Approved leave requests overlapping [from, to], with their paid/unpaid treatment. */
  approvedLeaveInRange(from: Date, to: Date): Promise<LeaveSpan[]> {
    return this.run(async (tx) => {
      const rows = await tx.staffLeaveRequest.findMany({
        where: {
          status: StaffLeaveStatus.APPROVED,
          startDate: { lte: to },
          endDate: { gte: from },
        },
        select: {
          employeeId: true,
          startDate: true,
          endDate: true,
          leaveType: { select: { paid: true } },
        },
      });
      return rows.map((r) => ({
        employeeId: r.employeeId,
        startDate: r.startDate,
        endDate: r.endDate,
        paid: r.leaveType.paid,
      }));
    });
  }
}
