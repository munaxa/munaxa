import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type CollectionsStatus,
  type DunningEvent,
  type ReminderChannel,
  type StudentBillingProfile,
} from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';
import type { TxClient } from '../../prisma/tenant.helpers';

export interface ParentContact {
  userId: string | null;
  phone: string | null;
  email: string | null;
  name: string;
}

/** Map the cached profile status to the case workflow status (§12, ADR-010). */
function caseStatusFor(s: CollectionsStatus): 'OPEN' | 'LEGAL' | 'RESOLVED' {
  if (s === 'LEGAL') return 'LEGAL';
  if (s === 'NONE') return 'RESOLVED';
  return 'OPEN';
}

@Injectable()
export class CollectionsRepository extends TenantRepository {
  private actor(): string | null {
    return TenantContextStore.get()?.actorUserId ?? null;
  }

  getProfile(studentId: string): Promise<StudentBillingProfile | null> {
    return this.run((tx) => tx.studentBillingProfile.findUnique({ where: { studentId } }));
  }

  /** Find-or-open the account's CollectionsCase; returns its id (null if the account is missing). */
  private async ensureCaseId(
    tx: TxClient,
    tenantId: string,
    studentId: string,
  ): Promise<string | null> {
    const account = await tx.studentFinancialAccount.findFirst({ where: { studentId } });
    if (!account) return null;
    const existing = await tx.collectionsCase.findUnique({ where: { accountId: account.id } });
    if (existing) return existing.id;
    const created = await tx.collectionsCase.create({
      data: { tenantId, accountId: account.id, status: 'OPEN', openedById: this.actor() },
    });
    return created.id;
  }

  setCollectionsStatus(
    studentId: string,
    status: CollectionsStatus,
    legalNote: string | null,
  ): Promise<StudentBillingProfile> {
    return this.run(async (tx, tenantId) => {
      const flagged = status !== 'NONE';
      const profile = await tx.studentBillingProfile.upsert({
        where: { studentId },
        create: {
          tenantId,
          studentId,
          collectionsStatus: status,
          legalNote,
          ...(flagged ? { flaggedById: this.actor(), flaggedAt: new Date() } : {}),
        },
        update: {
          collectionsStatus: status,
          legalNote,
          flaggedById: flagged ? this.actor() : null,
          flaggedAt: flagged ? new Date() : null,
        },
      });
      const account = await tx.studentFinancialAccount.findFirst({ where: { studentId } });
      if (account) {
        const caseStatus = caseStatusFor(status);
        const existing = await tx.collectionsCase.findUnique({ where: { accountId: account.id } });
        if (existing) {
          await tx.collectionsCase.update({
            where: { id: existing.id },
            data: {
              status: caseStatus,
              lawyerRef: status === 'LEGAL' ? legalNote : existing.lawyerRef,
              ...(caseStatus === 'RESOLVED' ? { resolvedAt: new Date() } : { resolvedAt: null }),
            },
          });
          await tx.dunningEvent.create({
            data: {
              tenantId,
              caseId: existing.id,
              type: 'STATUS_CHANGE',
              detail: status,
              actorId: this.actor(),
            },
          });
        } else if (status !== 'NONE') {
          const created = await tx.collectionsCase.create({
            data: {
              tenantId,
              accountId: account.id,
              status: caseStatus,
              lawyerRef: status === 'LEGAL' ? legalNote : null,
              openedById: this.actor(),
            },
          });
          await tx.dunningEvent.create({
            data: {
              tenantId,
              caseId: created.id,
              type: 'STATUS_CHANGE',
              detail: status,
              actorId: this.actor(),
            },
          });
        }
      }
      await this.writeAudit(tx, tenantId, {
        action: 'finance.collections.set',
        entityType: 'StudentBillingProfile',
        entityId: profile.id,
        metadata: { studentId, status, legalNote },
      });
      return profile;
    });
  }

  parentsOf(studentId: string): Promise<ParentContact[]> {
    return this.run(async (tx) => {
      const links = await tx.parentStudent.findMany({
        where: { studentId },
        select: {
          parent: {
            select: {
              userId: true,
              phone: true,
              email: true,
              firstNameEn: true,
              lastNameEn: true,
            },
          },
        },
      });
      return links.map((l) => ({
        userId: l.parent.userId,
        phone: l.parent.phone,
        email: l.parent.email,
        name: `${l.parent.firstNameEn} ${l.parent.lastNameEn}`.trim(),
      }));
    });
  }

  /** Student ids that have at least one unpaid charge (PENDING/PARTIAL) — reminder candidates. */
  studentsWithUnpaidCharges(): Promise<string[]> {
    return this.run(async (tx) => {
      const rows = await tx.charge.findMany({
        where: { status: { in: ['PENDING', 'PARTIAL'] }, student: { deletedAt: null } },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      return rows.map((r) => r.studentId);
    });
  }

  /** Tenant-wide charged (excl. cancelled) and verified-paid totals — for collection effectiveness. */
  tenantChargedAndPaid(): Promise<{ charged: Prisma.Decimal; paid: Prisma.Decimal }> {
    return this.run(async (tx) => {
      const [chargeAgg, paidAgg] = await Promise.all([
        tx.charge.aggregate({
          where: { status: { notIn: ['CANCELLED', 'WRITTEN_OFF'] } },
          _sum: { amount: true },
        }),
        tx.payment.aggregate({ where: { status: 'VERIFIED' }, _sum: { amount: true } }),
      ]);
      return {
        charged: chargeAgg._sum.amount ?? new Prisma.Decimal(0),
        paid: paidAgg._sum.amount ?? new Prisma.Decimal(0),
      };
    });
  }

  suspendThreshold(): Promise<number> {
    return this.run(async (tx, tenantId) => {
      const policy = await tx.billingPolicy.findUnique({ where: { tenantId } });
      return policy?.suspendTransportAfterOverdue ?? Number.MAX_SAFE_INTEGER;
    });
  }

  suspendedStudentIds(): Promise<string[]> {
    return this.run(async (tx) => {
      const rows = await tx.studentBillingProfile.findMany({
        where: { transportSuspended: true },
        select: { studentId: true },
      });
      return rows.map((r) => r.studentId);
    });
  }

  setTransportSuspended(studentId: string, suspended: boolean): Promise<StudentBillingProfile> {
    return this.run(async (tx, tenantId) => {
      const profile = await tx.studentBillingProfile.upsert({
        where: { studentId },
        create: {
          tenantId,
          studentId,
          transportSuspended: suspended,
          transportSuspendedAt: suspended ? new Date() : null,
        },
        update: {
          transportSuspended: suspended,
          transportSuspendedAt: suspended ? new Date() : null,
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: suspended ? 'finance.transport.suspend' : 'finance.transport.restore',
        entityType: 'StudentBillingProfile',
        entityId: profile.id,
        metadata: { studentId },
      });
      return profile;
    });
  }

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

  createNotifications(userIds: string[], data: { title: string; body: string }): Promise<number> {
    if (userIds.length === 0) return Promise.resolve(0);
    return this.run(async (tx, tenantId) => {
      const result = await tx.notification.createMany({
        data: userIds.map((userId) => ({
          tenantId,
          userId,
          title: data.title,
          body: data.body,
          type: 'PaymentReminder',
          category: 'FINANCE' as const,
        })),
      });
      return result.count;
    });
  }

  /** Record a reminder as a DunningEvent under the account's CollectionsCase (§12). */
  logReminder(data: {
    studentId: string;
    channels: ReminderChannel[];
    outstanding: Prisma.Decimal;
    dueThisMonth: Prisma.Decimal;
    overdue: Prisma.Decimal;
    recipientCount: number;
    smsSentCount: number;
  }): Promise<DunningEvent | null> {
    return this.run(async (tx, tenantId) => {
      const caseId = await this.ensureCaseId(tx, tenantId, data.studentId);
      if (!caseId) return null;
      const event = await tx.dunningEvent.create({
        data: {
          tenantId,
          caseId,
          type: 'REMINDER',
          channels: data.channels,
          outstanding: data.outstanding,
          dueThisMonth: data.dueThisMonth,
          overdue: data.overdue,
          recipientCount: data.recipientCount,
          smsSentCount: data.smsSentCount,
          actorId: this.actor(),
        },
      });
      await tx.studentBillingProfile.upsert({
        where: { studentId: data.studentId },
        create: { tenantId, studentId: data.studentId, lastReminderAt: new Date() },
        update: { lastReminderAt: new Date() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.reminder.sent',
        entityType: 'DunningEvent',
        entityId: event.id,
        metadata: {
          studentId: data.studentId,
          channels: data.channels,
          outstanding: data.outstanding.toString(),
          recipients: data.recipientCount,
        },
      });
      return event;
    });
  }

  listReminders(studentId: string): Promise<DunningEvent[]> {
    return this.run(async (tx) => {
      const account = await tx.studentFinancialAccount.findFirst({ where: { studentId } });
      if (!account) return [];
      const kase = await tx.collectionsCase.findUnique({ where: { accountId: account.id } });
      if (!kase) return [];
      return tx.dunningEvent.findMany({
        where: { caseId: kase.id, type: 'REMINDER' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  }
}
