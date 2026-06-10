import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type CollectionsStatus,
  type PaymentReminder,
  type ReminderChannel,
  type StudentBillingProfile,
} from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';

export interface ParentContact {
  userId: string | null;
  phone: string | null;
  name: string;
}

@Injectable()
export class CollectionsRepository extends TenantRepository {
  getProfile(studentId: string): Promise<StudentBillingProfile | null> {
    return this.run((tx) => tx.studentBillingProfile.findUnique({ where: { studentId } }));
  }

  setCollectionsStatus(
    studentId: string,
    status: CollectionsStatus,
    legalNote: string | null,
  ): Promise<StudentBillingProfile> {
    return this.run(async (tx, tenantId) => {
      const actor = TenantContextStore.get()?.actorUserId ?? null;
      const flagged = status !== 'NONE';
      const profile = await tx.studentBillingProfile.upsert({
        where: { studentId },
        create: {
          tenantId,
          studentId,
          collectionsStatus: status,
          legalNote,
          ...(flagged ? { flaggedById: actor, flaggedAt: new Date() } : {}),
        },
        update: {
          collectionsStatus: status,
          legalNote,
          flaggedById: flagged ? actor : null,
          flaggedAt: flagged ? new Date() : null,
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.collections.set',
        entityType: 'StudentBillingProfile',
        entityId: profile.id,
        metadata: { studentId, status, legalNote },
      });
      return profile;
    });
  }

  /** The student's linked parents (user id for in-app, phone for SMS). */
  parentsOf(studentId: string): Promise<ParentContact[]> {
    return this.run(async (tx) => {
      const links = await tx.parentStudent.findMany({
        where: { studentId },
        select: {
          parent: {
            select: { userId: true, phone: true, firstNameEn: true, lastNameEn: true },
          },
        },
      });
      return links.map((l) => ({
        userId: l.parent.userId,
        phone: l.parent.phone,
        name: `${l.parent.firstNameEn} ${l.parent.lastNameEn}`.trim(),
      }));
    });
  }

  /** Student ids that have at least one unpaid charge (PENDING/PARTIAL) — reminder candidates. */
  studentsWithUnpaidCharges(): Promise<string[]> {
    return this.run(async (tx) => {
      const rows = await tx.charge.findMany({
        where: { status: { in: ['PENDING', 'PARTIAL'] } },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      return rows.map((r) => r.studentId);
    });
  }

  /** Profiles for a set of students (to filter out LEGAL-tagged in bulk). */
  profilesFor(studentIds: string[]): Promise<StudentBillingProfile[]> {
    if (studentIds.length === 0) return Promise.resolve([]);
    return this.run((tx) =>
      tx.studentBillingProfile.findMany({ where: { studentId: { in: studentIds } } }),
    );
  }

  studentExists(studentId: string): Promise<boolean> {
    return this.run(
      async (tx) =>
        (await tx.student.findFirst({ where: { id: studentId, deletedAt: null } })) !== null,
    );
  }

  /** Bilingual display names for a student (for the reminder body). */
  studentNames(studentId: string): Promise<{ en: string; ar: string } | null> {
    return this.run(async (tx) => {
      const s = await tx.student.findFirst({
        where: { id: studentId },
        select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true },
      });
      if (!s) return null;
      return {
        en: `${s.firstNameEn} ${s.lastNameEn}`.trim(),
        ar: `${s.firstNameAr} ${s.lastNameAr}`.trim(),
      };
    });
  }

  /** Write in-app notifications to the given users (notification center is the source of truth). */
  createNotifications(userIds: string[], data: { title: string; body: string }): Promise<number> {
    if (userIds.length === 0) return Promise.resolve(0);
    return this.run(async (tx, tenantId) => {
      const result = await tx.notification.createMany({
        data: userIds.map((userId) => ({
          tenantId,
          userId,
          title: data.title,
          body: data.body,
          category: 'finance.reminder',
        })),
      });
      return result.count;
    });
  }

  logReminder(data: {
    studentId: string;
    channels: ReminderChannel[];
    outstanding: Prisma.Decimal;
    dueThisMonth: Prisma.Decimal;
    overdue: Prisma.Decimal;
    recipientCount: number;
    smsSentCount: number;
  }): Promise<PaymentReminder> {
    return this.run(async (tx, tenantId) => {
      const reminder = await tx.paymentReminder.create({
        data: { tenantId, ...data, sentById: TenantContextStore.get()?.actorUserId ?? null },
      });
      await tx.studentBillingProfile.upsert({
        where: { studentId: data.studentId },
        create: { tenantId, studentId: data.studentId, lastReminderAt: new Date() },
        update: { lastReminderAt: new Date() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.reminder.sent',
        entityType: 'PaymentReminder',
        entityId: reminder.id,
        metadata: {
          studentId: data.studentId,
          channels: data.channels,
          outstanding: data.outstanding.toString(),
          recipients: data.recipientCount,
        },
      });
      return reminder;
    });
  }

  listReminders(studentId: string): Promise<PaymentReminder[]> {
    return this.run((tx) =>
      tx.paymentReminder.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
  }
}
