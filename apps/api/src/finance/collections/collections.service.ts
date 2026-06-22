import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ReminderChannel, type StudentBillingProfile } from '@prisma/client';
import { BillingRepository } from '../ledger/billing.repository';
import { CollectionsRepository } from './collections.repository';
import { SmsService } from './sms.service';
import { NotificationEventBus } from '../../communication/engine/notification-event-bus';
import { NotificationEventType } from '../../communication/engine/notification-events';
import { agedAmount, qualifiesOutstanding } from './outstanding-filter';
import type { PushOutstandingDto, SendReminderDto, SetCollectionsDto } from './collections.dto';

const ZERO = new Prisma.Decimal(0);

export interface ReminderSnapshot {
  outstanding: string;
  dueThisMonth: string;
  overdue: string;
  overdueCount: number; // number of overdue installments/charges with a remaining balance
  oldestOverdueDays: number; // age in days of the earliest overdue charge (0 if none)
  delinquencyLevel: number; // 0 current, 1 ≤30d, 2 31–60d, 3 61–90d, 4 >90d (from oldest overdue)
  eligible: boolean; // has something due this month or overdue
}

export interface AgingBuckets {
  studentId: string;
  current: string; // balance not yet overdue (incl. undated charges)
  d1_30: string;
  d31_60: string;
  d61_90: string;
  d90plus: string;
  total: string; // total outstanding balance
}

export interface AgingReport {
  rows: AgingBuckets[];
  totals: Omit<AgingBuckets, 'studentId'>;
  /** Collection effectiveness: share of total charged that has been settled (0–100, 2 dp). */
  collectedPct: string;
}

export interface TransportEvaluation {
  studentId: string;
  overdueCount: number;
  threshold: number;
  suspended: boolean; // resulting state
  changed: boolean; // whether this evaluation flipped the state
}

/** Delinquency level from the oldest overdue charge's age. */
function levelFor(oldestOverdueDays: number): number {
  if (oldestOverdueDays <= 0) return 0;
  if (oldestOverdueDays <= 30) return 1;
  if (oldestOverdueDays <= 60) return 2;
  if (oldestOverdueDays <= 90) return 3;
  return 4;
}

export interface SendResult {
  studentId: string;
  recipients: number;
  smsSent: number;
  snapshot: ReminderSnapshot;
}

export interface BatchResult {
  candidates: number;
  sent: number;
  skippedLegal: number;
  skippedNotDue: number;
  totalRecipients: number;
  totalSms: number;
}

export interface PushOutstandingResult {
  filter: { minAgeDays: number | null; minAmount: string | null; match: 'ALL' | 'ANY' };
  candidates: number; // accounts with unpaid charges considered
  matched: number; // accounts that passed the filter
  pushed: number; // accounts an outstanding-balance push was emitted for
  skippedLegal: number; // excluded (LEGAL collections tag)
  skippedNoParent: number; // matched but no parent account to notify
  totalRecipients: number; // total parent notifications created
}

/**
 * Fee collections: per-student legal/collections tagging and late-payment reminders.
 * Reminders bundle "this month's payment" and "late (overdue) payments", and are sent to the
 * student's parents via in-app notification and/or SMS. Students tagged LEGAL
 * ("contact the lawyer") are excluded from reminders.
 */
@Injectable()
export class CollectionsService {
  constructor(
    private readonly repo: CollectionsRepository,
    private readonly billing: BillingRepository,
    private readonly sms: SmsService,
    private readonly notifications: NotificationEventBus,
  ) {}

  // ----------------------------------------------------------------- tagging

  async getProfile(studentId: string): Promise<{
    studentId: string;
    collectionsStatus: StudentBillingProfile['collectionsStatus'];
    legalNote: string | null;
    flaggedAt: Date | null;
    lastReminderAt: Date | null;
    transportSuspended: boolean;
    transportSuspendedAt: Date | null;
    feeModified: boolean;
    customArrangement: boolean;
    snapshot: ReminderSnapshot;
    reminders: Awaited<ReturnType<CollectionsRepository['listReminders']>>;
  }> {
    if (!(await this.repo.studentExists(studentId))) {
      throw new NotFoundException('Student not found in this tenant');
    }
    const [profile, snapshot, reminders] = await Promise.all([
      this.repo.getProfile(studentId),
      this.snapshot(studentId),
      this.repo.listReminders(studentId),
    ]);
    return {
      studentId,
      collectionsStatus: profile?.collectionsStatus ?? 'NONE',
      legalNote: profile?.legalNote ?? null,
      flaggedAt: profile?.flaggedAt ?? null,
      lastReminderAt: profile?.lastReminderAt ?? null,
      transportSuspended: profile?.transportSuspended ?? false,
      transportSuspendedAt: profile?.transportSuspendedAt ?? null,
      // Permanent financial flags (set by admissions registrar overrides / arrangements).
      feeModified: profile?.feeModified ?? false,
      customArrangement: profile?.customArrangement ?? false,
      snapshot,
      reminders,
    };
  }

  async setCollections(studentId: string, dto: SetCollectionsDto): Promise<StudentBillingProfile> {
    if (!(await this.repo.studentExists(studentId))) {
      throw new NotFoundException('Student not found in this tenant');
    }
    return this.repo.setCollectionsStatus(studentId, dto.status, dto.note ?? null);
  }

  // --------------------------------------------------------------- reminders

  /** Compute this-month-due / overdue / outstanding from the charge balances + due dates. */
  async snapshot(studentId: string): Promise<ReminderSnapshot> {
    const [balances, summary] = await Promise.all([
      this.billing.chargeBalances(studentId),
      this.billing.accountSummary(studentId),
    ]);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let overdue = ZERO;
    let dueThisMonth = ZERO;
    let overdueCount = 0;
    let oldestOverdue: Date | null = null;
    for (const b of balances) {
      const balance = new Prisma.Decimal(b.balance);
      if (balance.lessThanOrEqualTo(ZERO) || !b.charge.dueDate) continue;
      const due = new Date(b.charge.dueDate);
      if (due < startOfDay) {
        overdue = overdue.plus(balance);
        overdueCount += 1;
        if (!oldestOverdue || due < oldestOverdue) oldestOverdue = due;
      } else if (due >= startOfMonth && due <= endOfMonth) {
        dueThisMonth = dueThisMonth.plus(balance);
      }
    }
    const oldestOverdueDays = oldestOverdue
      ? Math.floor((startOfDay.getTime() - oldestOverdue.getTime()) / 86_400_000)
      : 0;
    return {
      outstanding: summary.outstanding,
      dueThisMonth: dueThisMonth.toFixed(3),
      overdue: overdue.toFixed(3),
      overdueCount,
      oldestOverdueDays,
      delinquencyLevel: levelFor(oldestOverdueDays),
      eligible: overdue.greaterThan(ZERO) || dueThisMonth.greaterThan(ZERO),
    };
  }

  // --------------------------------------------------------- aging / reports

  /** Bucket a single student's outstanding balance by the age of each charge's due date. */
  async aging(studentId: string): Promise<AgingBuckets> {
    const balances = await this.billing.chargeBalances(studentId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let current = ZERO;
    let d1_30 = ZERO;
    let d31_60 = ZERO;
    let d61_90 = ZERO;
    let d90plus = ZERO;
    for (const b of balances) {
      const bal = new Prisma.Decimal(b.balance);
      if (bal.lessThanOrEqualTo(ZERO)) continue;
      const due = b.charge.dueDate ? new Date(b.charge.dueDate) : null;
      if (!due || due >= startOfDay) {
        current = current.plus(bal);
        continue;
      }
      const days = Math.floor((startOfDay.getTime() - due.getTime()) / 86_400_000);
      if (days <= 30) d1_30 = d1_30.plus(bal);
      else if (days <= 60) d31_60 = d31_60.plus(bal);
      else if (days <= 90) d61_90 = d61_90.plus(bal);
      else d90plus = d90plus.plus(bal);
    }
    const total = current.plus(d1_30).plus(d31_60).plus(d61_90).plus(d90plus);
    return {
      studentId,
      current: current.toFixed(3),
      d1_30: d1_30.toFixed(3),
      d31_60: d31_60.toFixed(3),
      d61_90: d61_90.toFixed(3),
      d90plus: d90plus.toFixed(3),
      total: total.toFixed(3),
    };
  }

  /** Aging report across all accounts with an outstanding balance, plus collection effectiveness. */
  async agingReport(): Promise<AgingReport> {
    const candidates = await this.repo.studentsWithUnpaidCharges();
    const rows: AgingBuckets[] = [];
    const sum = {
      current: ZERO,
      d1_30: ZERO,
      d31_60: ZERO,
      d61_90: ZERO,
      d90plus: ZERO,
      total: ZERO,
    };
    for (const studentId of candidates) {
      const a = await this.aging(studentId);
      if (new Prisma.Decimal(a.total).lessThanOrEqualTo(ZERO)) continue;
      rows.push(a);
      sum.current = sum.current.plus(a.current);
      sum.d1_30 = sum.d1_30.plus(a.d1_30);
      sum.d31_60 = sum.d31_60.plus(a.d31_60);
      sum.d61_90 = sum.d61_90.plus(a.d61_90);
      sum.d90plus = sum.d90plus.plus(a.d90plus);
      sum.total = sum.total.plus(a.total);
    }
    const { charged, paid } = await this.repo.tenantChargedAndPaid();
    const collectedPct = charged.greaterThan(ZERO)
      ? paid.times(100).dividedBy(charged).toFixed(2)
      : '0.00';
    return {
      rows,
      totals: {
        current: sum.current.toFixed(3),
        d1_30: sum.d1_30.toFixed(3),
        d31_60: sum.d31_60.toFixed(3),
        d61_90: sum.d61_90.toFixed(3),
        d90plus: sum.d90plus.toFixed(3),
        total: sum.total.toFixed(3),
      },
      collectedPct,
    };
  }

  // ---------------------------------------------------- transport suspension

  /**
   * Evaluate a student's transport service against the tenant billing policy: suspend when the
   * number of overdue installments reaches BillingPolicy.suspendTransportAfterOverdue, and
   * auto-restore once they fall back below it. Idempotent — only writes (and audits) on a flip.
   */
  async evaluateTransport(studentId: string): Promise<TransportEvaluation> {
    if (!(await this.repo.studentExists(studentId))) {
      throw new NotFoundException('Student not found in this tenant');
    }
    const [{ overdueCount }, threshold, profile] = await Promise.all([
      this.snapshot(studentId),
      this.repo.suspendThreshold(),
      this.repo.getProfile(studentId),
    ]);
    const wasSuspended = profile?.transportSuspended ?? false;
    const shouldSuspend = overdueCount >= threshold;
    let suspended = wasSuspended;
    let changed = false;
    if (shouldSuspend && !wasSuspended) {
      await this.repo.setTransportSuspended(studentId, true);
      suspended = true;
      changed = true;
    } else if (!shouldSuspend && wasSuspended) {
      await this.repo.setTransportSuspended(studentId, false);
      suspended = false;
      changed = true;
    }
    return { studentId, overdueCount, threshold, suspended, changed };
  }

  /** Sweep every student with unpaid charges and reconcile their transport-suspension state. */
  async evaluateTransportBatch(): Promise<{
    evaluated: number;
    suspended: number;
    restored: number;
  }> {
    // Union of students with unpaid charges and those currently suspended (so paid-off accounts
    // are restored even though they no longer have an unpaid charge).
    const [unpaid, suspendedIds] = await Promise.all([
      this.repo.studentsWithUnpaidCharges(),
      this.repo.suspendedStudentIds(),
    ]);
    const candidates = [...new Set([...unpaid, ...suspendedIds])];
    let suspended = 0;
    let restored = 0;
    for (const studentId of candidates) {
      const r = await this.evaluateTransport(studentId);
      if (r.changed && r.suspended) suspended += 1;
      if (r.changed && !r.suspended) restored += 1;
    }
    return { evaluated: candidates.length, suspended, restored };
  }

  /** Send a reminder to one student's parents. Blocked for LEGAL-tagged accounts. */
  async sendForStudent(studentId: string, dto: SendReminderDto): Promise<SendResult> {
    if (!(await this.repo.studentExists(studentId))) {
      throw new NotFoundException('Student not found in this tenant');
    }
    const profile = await this.repo.getProfile(studentId);
    if (profile?.collectionsStatus === 'LEGAL') {
      throw new ConflictException(
        'Student is in legal collections (contact the lawyer) — automated reminders are excluded',
      );
    }
    const snapshot = await this.snapshot(studentId);
    if (!snapshot.eligible) {
      throw new BadRequestException('Nothing due this month or overdue for this student');
    }
    return this.dispatch(studentId, dto.channels, snapshot);
  }

  /** Bulk reminders to every student with dues this month / overdue, excluding LEGAL-tagged. */
  async sendBatch(dto: SendReminderDto): Promise<BatchResult> {
    const candidates = await this.repo.studentsWithUnpaidCharges();
    const profiles = await this.repo.profilesFor(candidates);
    const legal = new Set(
      profiles.filter((p) => p.collectionsStatus === 'LEGAL').map((p) => p.studentId),
    );

    const result: BatchResult = {
      candidates: candidates.length,
      sent: 0,
      skippedLegal: 0,
      skippedNotDue: 0,
      totalRecipients: 0,
      totalSms: 0,
    };

    for (const studentId of candidates) {
      if (legal.has(studentId)) {
        result.skippedLegal += 1;
        continue;
      }
      const snapshot = await this.snapshot(studentId);
      if (!snapshot.eligible) {
        result.skippedNotDue += 1;
        continue;
      }
      const sent = await this.dispatch(studentId, dto.channels, snapshot);
      result.sent += 1;
      result.totalRecipients += sent.recipients;
      result.totalSms += sent.smsSent;
    }
    return result;
  }

  // --------------------------------------------------- push outstanding balance

  /**
   * Admin-triggered: push each qualifying student's outstanding balance to their parents via the
   * notification engine (FCM push, with the platform's email escalation for HIGH-priority finance
   * alerts). Narrowed by aging (>30/60/90 days) and/or a minimum amount. LEGAL-tagged students are
   * excluded. Routes through the engine — no direct sends.
   */
  async pushOutstanding(dto: PushOutstandingDto): Promise<PushOutstandingResult> {
    const candidates = await this.repo.studentsWithUnpaidCharges();
    const profiles = await this.repo.profilesFor(candidates);
    const legal = new Set(
      profiles.filter((p) => p.collectionsStatus === 'LEGAL').map((p) => p.studentId),
    );

    const result: PushOutstandingResult = {
      filter: {
        minAgeDays: dto.minAgeDays ?? null,
        minAmount: dto.minAmount ?? null,
        match: dto.match ?? 'ALL',
      },
      candidates: candidates.length,
      matched: 0,
      pushed: 0,
      skippedLegal: 0,
      skippedNoParent: 0,
      totalRecipients: 0,
    };

    for (const studentId of candidates) {
      if (legal.has(studentId)) {
        result.skippedLegal += 1;
        continue;
      }
      const a = await this.aging(studentId);
      if (!qualifiesOutstanding(a, dto)) continue;
      result.matched += 1;

      const [names, parents] = await Promise.all([
        this.repo.studentNames(studentId),
        this.repo.parentsOf(studentId),
      ]);
      const userIds = parents.map((p) => p.userId).filter((id): id is string => Boolean(id));
      if (userIds.length === 0) {
        result.skippedNoParent += 1;
        continue;
      }

      const overdue = agedAmount(a, dto.minAgeDays);
      const { title, body } = this.buildOutstandingMessage(
        names ?? { en: 'your child', ar: 'ابنكم' },
        a.total,
        overdue,
        dto.minAgeDays,
      );

      const summary = await this.notifications.emit({
        type: NotificationEventType.PaymentOverdue,
        recipients: { userIds },
        title,
        body,
        context: { StudentName: names?.en ?? 'your child', Amount: `${a.total} JOD` },
        data: { studentId, outstanding: a.total, overdue: overdue.toFixed(3) },
        mandatory: dto.mandatory ?? false,
      });

      await this.repo.logReminder({
        studentId,
        channels: ['PUSH'],
        outstanding: new Prisma.Decimal(a.total),
        dueThisMonth: ZERO,
        overdue,
        recipientCount: summary.recipients,
        smsSentCount: 0,
      });

      result.pushed += 1;
      result.totalRecipients += summary.recipients;
    }

    return result;
  }

  /** Concise bilingual outstanding-balance push, optionally noting the overdue age threshold. */
  private buildOutstandingMessage(
    names: { en: string; ar: string },
    total: string,
    overdue: Prisma.Decimal,
    minAgeDays?: 30 | 60 | 90,
  ): { title: string; body: string } {
    const agePartEn = minAgeDays
      ? ` (${overdue.toFixed(3)} JOD overdue more than ${minAgeDays} days)`
      : '';
    const agePartAr = minAgeDays
      ? ` (منها ${overdue.toFixed(3)} دينار متأخرة أكثر من ${minAgeDays} يومًا)`
      : '';
    const en = `Outstanding balance for ${names.en}: ${total} JOD${agePartEn}. Please settle at your earliest convenience.`;
    const ar = `رصيد مستحق للطالب ${names.ar}: ${total} دينار${agePartAr}. نرجو المبادرة بالسداد.`;
    return { title: 'Outstanding balance | رصيد مستحق', body: `${en}\n${ar}` };
  }

  // ------------------------------------------------------------------ helpers

  private async dispatch(
    studentId: string,
    channels: ReminderChannel[],
    snapshot: ReminderSnapshot,
  ): Promise<SendResult> {
    const [names, parents] = await Promise.all([
      this.repo.studentNames(studentId),
      this.repo.parentsOf(studentId),
    ]);
    const { title, body } = this.buildMessage(names ?? { en: 'your child', ar: 'ابنكم' }, snapshot);

    let recipients = 0;
    let smsSent = 0;

    if (channels.includes('IN_APP')) {
      const userIds = parents.map((p) => p.userId).filter((id): id is string => Boolean(id));
      recipients = await this.repo.createNotifications(userIds, { title, body });
    }
    if (channels.includes('SMS')) {
      const messages = parents
        .filter((p) => p.phone)
        .map((p) => ({ to: p.phone!, body: `${title} — ${body}` }));
      smsSent = await this.sms.send(messages);
    }

    await this.repo.logReminder({
      studentId,
      channels,
      outstanding: new Prisma.Decimal(snapshot.outstanding),
      dueThisMonth: new Prisma.Decimal(snapshot.dueThisMonth),
      overdue: new Prisma.Decimal(snapshot.overdue),
      recipientCount: recipients,
      smsSentCount: smsSent,
    });

    return { studentId, recipients, smsSent, snapshot };
  }

  /** Bilingual reminder bundling this month's due + overdue. */
  private buildMessage(
    names: { en: string; ar: string },
    s: ReminderSnapshot,
  ): { title: string; body: string } {
    const en =
      `Payment reminder for ${names.en}: ${s.outstanding} JOD outstanding` +
      (Number(s.dueThisMonth) > 0 ? `, ${s.dueThisMonth} JOD due this month` : '') +
      (Number(s.overdue) > 0 ? `, ${s.overdue} JOD overdue` : '') +
      '. Please settle at your earliest convenience.';
    const ar =
      `تذكير بالدفع للطالب ${names.ar}: المبلغ المستحق ${s.outstanding} دينار` +
      (Number(s.dueThisMonth) > 0 ? `، منها ${s.dueThisMonth} دينار مستحقة هذا الشهر` : '') +
      (Number(s.overdue) > 0 ? `، و${s.overdue} دينار متأخرة` : '') +
      '. نرجو المبادرة بالسداد.';
    return { title: 'Payment reminder | تذكير بالدفع', body: `${en}\n${ar}` };
  }
}
