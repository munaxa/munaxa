import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { GradeRecord, Student } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';

export interface AttendanceSummary {
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
}

@Injectable()
export class DashboardRepository extends TenantRepository {
  student(studentId: string): Promise<Student | null> {
    return this.run((tx) => tx.student.findFirst({ where: { id: studentId, deletedAt: null } }));
  }

  /** Attendance status tallies for a student since `since`. */
  async attendanceSummary(studentId: string, since: Date): Promise<AttendanceSummary> {
    const rows = await this.run((tx) =>
      tx.studentAttendance.groupBy({
        by: ['status'],
        where: { studentId, date: { gte: since } },
        _count: { _all: true },
      }),
    );
    const summary: AttendanceSummary = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const row of rows) {
      summary[row.status] = row._count._all;
    }
    return summary;
  }

  /** Count of upcoming homework for the student's section. */
  upcomingHomeworkCount(sectionId: string | null, from: Date): Promise<number> {
    if (!sectionId) return Promise.resolve(0);
    return this.run((tx) =>
      tx.homework.count({ where: { sectionId, deletedAt: null, dueDate: { gte: from } } }),
    );
  }

  recentGrades(studentId: string): Promise<GradeRecord[]> {
    return this.run((tx) =>
      tx.gradeRecord.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    );
  }

  /** Outstanding balance = SUM(active charges) − SUM(verified transactions). */
  async outstandingBalance(studentId: string): Promise<string> {
    const [charges, paid] = await this.run((tx) =>
      Promise.all([
        tx.charge.aggregate({
          _sum: { amount: true },
          where: { studentId, status: { notIn: ['CANCELLED', 'WAIVED'] } },
        }),
        tx.payment.aggregate({
          _sum: { amount: true },
          where: { studentId, status: 'VERIFIED' },
        }),
      ]),
    );
    const charged = charges._sum.amount ?? new Prisma.Decimal(0);
    const settled = paid._sum.amount ?? new Prisma.Decimal(0);
    return charged.minus(settled).toFixed(3);
  }

  pendingLeaveCount(studentId: string): Promise<number> {
    return this.run((tx) => tx.leaveRequest.count({ where: { studentId, status: 'PENDING' } }));
  }

  upcomingPtmCount(studentId: string, from: Date): Promise<number> {
    return this.run((tx) =>
      tx.ptmBooking.count({
        where: { studentId, status: 'BOOKED', slot: { startsAt: { gte: from } } },
      }),
    );
  }

  documentCount(studentId: string): Promise<number> {
    return this.run((tx) => tx.document.count({ where: { studentId, deletedAt: null } }));
  }

  /** Unread in-app notifications for the acting user. */
  unreadNotificationCount(): Promise<number> {
    const userId = TenantContextStore.get()?.actorUserId;
    if (!userId) return Promise.resolve(0);
    return this.run((tx) => tx.notification.count({ where: { userId, readAt: null } }));
  }
}
