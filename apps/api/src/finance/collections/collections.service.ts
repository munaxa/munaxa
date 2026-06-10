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
import type { SendReminderDto, SetCollectionsDto } from './collections.dto';

const ZERO = new Prisma.Decimal(0);

export interface ReminderSnapshot {
  outstanding: string;
  dueThisMonth: string;
  overdue: string;
  eligible: boolean; // has something due this month or overdue
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
  ) {}

  // ----------------------------------------------------------------- tagging

  async getProfile(studentId: string): Promise<{
    studentId: string;
    collectionsStatus: StudentBillingProfile['collectionsStatus'];
    legalNote: string | null;
    flaggedAt: Date | null;
    lastReminderAt: Date | null;
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
    for (const b of balances) {
      const balance = new Prisma.Decimal(b.balance);
      if (balance.lessThanOrEqualTo(ZERO) || !b.charge.dueDate) continue;
      const due = new Date(b.charge.dueDate);
      if (due < startOfDay) overdue = overdue.plus(balance);
      else if (due >= startOfMonth && due <= endOfMonth) dueThisMonth = dueThisMonth.plus(balance);
    }
    return {
      outstanding: summary.outstanding,
      dueThisMonth: dueThisMonth.toFixed(3),
      overdue: overdue.toFixed(3),
      eligible: overdue.greaterThan(ZERO) || dueThisMonth.greaterThan(ZERO),
    };
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
