import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type CollectionsStatus,
  type CommunicationMedium,
  type DunningEvent,
  type PromiseToPay,
  type ReminderChannel,
  type ReminderLevel,
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

  /** The tenant's transport-suspension thresholds (installments always set; days/amount optional). */
  transportPolicy(): Promise<{
    installments: number;
    days: number | null;
    amount: Prisma.Decimal | null;
  }> {
    return this.run(async (tx, tenantId) => {
      const policy = await tx.billingPolicy.findUnique({ where: { tenantId } });
      return {
        installments: policy?.suspendTransportAfterOverdue ?? Number.MAX_SAFE_INTEGER,
        days: policy?.suspendTransportAfterDays ?? null,
        amount: policy?.suspendTransportAfterAmount ?? null,
      };
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

  setTransportSuspended(
    studentId: string,
    suspended: boolean,
    opts: { reason?: string | null; manual?: boolean } = {},
  ): Promise<StudentBillingProfile> {
    return this.run(async (tx, tenantId) => {
      const now = new Date();
      const suspendFields = {
        transportSuspended: true,
        transportSuspendedAt: now,
        transportSuspendedReason: opts.reason ?? null,
        transportSuspendedById: this.actor(),
        transportReinstatedAt: null,
      };
      const restoreFields = {
        transportSuspended: false,
        // Keep the reason/at for the record; stamp when it was reinstated.
        transportReinstatedAt: now,
      };
      const data = suspended ? suspendFields : restoreFields;
      const profile = await tx.studentBillingProfile.upsert({
        where: { studentId },
        create: {
          tenantId,
          studentId,
          ...(suspended ? suspendFields : { transportSuspended: false }),
        },
        update: data,
      });
      await this.writeAudit(tx, tenantId, {
        action: suspended ? 'finance.transport.suspend' : 'finance.transport.restore',
        entityType: 'StudentBillingProfile',
        entityId: profile.id,
        metadata: { studentId, manual: opts.manual ?? false, reason: opts.reason ?? null },
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
    level?: ReminderLevel | null;
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
          level: data.level ?? null,
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

  // ─────────────────────────────────────────────────────── Promise to Pay

  /**
   * Record a promise-to-pay under the account's collections case (auto-opening the case), move the
   * case into PROMISE_TO_PAY, log a PROMISE dunning event, and audit it. Returns null if no account.
   */
  createPromise(data: {
    studentId: string;
    amount: Prisma.Decimal;
    promiseBy: Date;
    note: string | null;
  }): Promise<PromiseToPay | null> {
    return this.run(async (tx, tenantId) => {
      const caseId = await this.ensureCaseId(tx, tenantId, data.studentId);
      if (!caseId) return null;
      const promise = await tx.promiseToPay.create({
        data: {
          tenantId,
          caseId,
          amount: data.amount,
          promiseBy: data.promiseBy,
          note: data.note,
          createdById: this.actor(),
        },
      });
      // Reflect the commitment on the case (a promise is an active dunning stage).
      await tx.collectionsCase.update({
        where: { id: caseId },
        data: { status: 'PROMISE_TO_PAY', resolvedAt: null },
      });
      await tx.dunningEvent.create({
        data: {
          tenantId,
          caseId,
          type: 'PROMISE',
          detail: `Promise ${data.amount.toFixed(3)} by ${data.promiseBy.toISOString().slice(0, 10)}${
            data.note ? ` — ${data.note}` : ''
          }`,
          actorId: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.promise.create',
        entityType: 'PromiseToPay',
        entityId: promise.id,
        metadata: {
          studentId: data.studentId,
          amount: data.amount.toString(),
          promiseBy: data.promiseBy.toISOString().slice(0, 10),
        },
      });
      return promise;
    });
  }

  listPromises(studentId: string): Promise<PromiseToPay[]> {
    return this.run(async (tx) => {
      const account = await tx.studentFinancialAccount.findFirst({ where: { studentId } });
      if (!account) return [];
      const kase = await tx.collectionsCase.findUnique({ where: { accountId: account.id } });
      if (!kase) return [];
      return tx.promiseToPay.findMany({
        where: { caseId: kase.id },
        orderBy: { promiseBy: 'desc' },
        take: 50,
      });
    });
  }

  /** Resolve an open promise as kept or broken; logs a STATUS_CHANGE event + audit. */
  resolvePromise(promiseId: string, kept: boolean): Promise<PromiseToPay> {
    return this.run(async (tx, tenantId) => {
      const promise = await tx.promiseToPay.update({
        where: { id: promiseId },
        data: { kept },
      });
      await tx.dunningEvent.create({
        data: {
          tenantId,
          caseId: promise.caseId,
          type: 'STATUS_CHANGE',
          detail: `Promise ${kept ? 'kept' : 'broken'} (${promise.amount.toFixed(3)})`,
          actorId: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.promise.resolve',
        entityType: 'PromiseToPay',
        entityId: promise.id,
        metadata: { kept },
      });
      return promise;
    });
  }

  // ─────────────────────────────────────────────────────── Communication Log

  /**
   * Log a parent contact (call/WhatsApp/meeting/…) as a COMMUNICATION dunning event under the
   * account's case (auto-opened), timestamped + audited. Returns null if the account is missing.
   */
  logCommunication(data: {
    studentId: string;
    medium: CommunicationMedium;
    note: string;
  }): Promise<DunningEvent | null> {
    return this.run(async (tx, tenantId) => {
      const caseId = await this.ensureCaseId(tx, tenantId, data.studentId);
      if (!caseId) return null;
      const event = await tx.dunningEvent.create({
        data: {
          tenantId,
          caseId,
          type: 'COMMUNICATION',
          medium: data.medium,
          detail: data.note,
          actorId: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.communication.log',
        entityType: 'DunningEvent',
        entityId: event.id,
        metadata: { studentId: data.studentId, medium: data.medium },
      });
      return event;
    });
  }

  /** The account's communication log (logged contacts), newest first. */
  listCommunications(studentId: string): Promise<DunningEvent[]> {
    return this.run(async (tx) => {
      const account = await tx.studentFinancialAccount.findFirst({ where: { studentId } });
      if (!account) return [];
      const kase = await tx.collectionsCase.findUnique({ where: { accountId: account.id } });
      if (!kase) return [];
      return tx.dunningEvent.findMany({
        where: { caseId: kase.id, type: 'COMMUNICATION' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  }

  // ─────────────────────────────────────────────────────── Dashboard feeds

  /** Tenant-wide promises + transport suspensions (with student names) for the finance dashboard. */
  dashboardFeeds(): Promise<{
    promises: Array<{
      id: string;
      studentId: string;
      studentName: string;
      amount: Prisma.Decimal;
      promiseBy: Date;
      kept: boolean | null;
    }>;
    suspensions: Array<{ studentId: string; studentName: string; suspendedAt: Date | null }>;
    openCaseCount: number;
  }> {
    return this.run(async (tx) => {
      const [promises, suspensions, openCaseCount] = await Promise.all([
        tx.promiseToPay.findMany({
          include: { case: { select: { account: { select: { studentId: true } } } } },
          orderBy: { promiseBy: 'asc' },
          take: 300,
        }),
        tx.studentBillingProfile.findMany({
          where: { transportSuspended: true },
          select: { studentId: true, transportSuspendedAt: true },
        }),
        tx.collectionsCase.count({ where: { status: { notIn: ['RESOLVED'] } } }),
      ]);
      const ids = [
        ...new Set([
          ...promises.map((p) => p.case.account.studentId),
          ...suspensions.map((s) => s.studentId),
        ]),
      ];
      const students = await tx.student.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstNameEn: true, lastNameEn: true },
      });
      const nameOf = new Map(
        students.map((s) => [s.id, `${s.firstNameEn} ${s.lastNameEn}`.trim()]),
      );
      return {
        promises: promises.map((p) => ({
          id: p.id,
          studentId: p.case.account.studentId,
          studentName: nameOf.get(p.case.account.studentId) ?? '—',
          amount: p.amount,
          promiseBy: p.promiseBy,
          kept: p.kept,
        })),
        suspensions: suspensions.map((s) => ({
          studentId: s.studentId,
          studentName: nameOf.get(s.studentId) ?? '—',
          suspendedAt: s.transportSuspendedAt,
        })),
        openCaseCount,
      };
    });
  }
}
