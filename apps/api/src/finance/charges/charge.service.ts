import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Charge } from '@prisma/client';
import { ChargeRepository } from './charge.repository';
import { BillingRepository } from '../ledger/billing.repository';
import { LedgerService } from '../ledger/ledger.service';
import { TransactionService } from '../transactions/transaction.service';
import { FinanceBridgeService } from '../../einvoicing/finance-bridge.service';
import type { CreateChargeDto, CreateInstallmentsDto, PayInstallmentDto } from './charge.dto';

/** Convert a JOD amount to integer fils (1/1000 JOD) so splits never drift on rounding. */
const toFils = (n: number): number => Math.round(n * 1000);

/** One installment row, as a ledger entry: schedule + what's been paid against it. */
export interface InstallmentRow {
  id: string;
  description: string;
  dueDate: Date | null;
  /** Scheduled amount for this installment. */
  amount: string;
  /** Amount paid/allocated so far. */
  paid: string;
  /** Remaining balance (scheduled − discounts − paid). */
  balance: string;
  status: string;
}

export interface InstallmentPlanView {
  planId: string;
  charges: InstallmentRow[];
}

/** Adds `n` calendar months to an ISO date, clamping the day to the target month's length. */
function addMonths(iso: string, n: number): Date {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

@Injectable()
export class ChargeService {
  constructor(
    private readonly repo: ChargeRepository,
    private readonly bridge: FinanceBridgeService,
    private readonly billing: BillingRepository,
    private readonly transactions: TransactionService,
    private readonly ledger: LedgerService,
  ) {}

  async create(dto: CreateChargeDto): Promise<Charge> {
    if (!(await this.repo.studentExists(dto.studentId))) {
      throw new BadRequestException('Student not found in this tenant');
    }
    if (dto.feePlanId && !(await this.repo.feePlanExists(dto.feePlanId))) {
      throw new BadRequestException('Fee plan not found in this tenant');
    }
    const charge = await this.repo.create({
      studentId: dto.studentId,
      feePlanId: dto.feePlanId ?? null,
      description: dto.description,
      amount: dto.amount,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
    // Best-effort: auto-issue a JoFotara invoice if the tenant enabled it (never blocks).
    await this.bridge.tryIssueForCharge(charge.id);
    return charge;
  }

  /**
   * Split a total into `months` monthly installment charges so a parent can pay over time. The
   * amount is divided in fils (1/1000 JOD) to avoid rounding drift; the final installment absorbs
   * any remainder so the installments always sum back to the exact total.
   */
  async createInstallments(dto: CreateInstallmentsDto): Promise<Charge[]> {
    if (!(await this.repo.studentExists(dto.studentId))) {
      throw new BadRequestException('Student not found in this tenant');
    }
    // One active plan per student — the parent must delete the existing plan before a new one.
    if ((await this.repo.installmentCharges(dto.studentId)).length > 0) {
      throw new ConflictException(
        'An installment plan already exists for this student. Delete it before creating a new one.',
      );
    }
    const planId = randomUUID();
    const totalFils = Math.round(dto.totalAmount * 1000);
    const perFils = Math.floor(totalFils / dto.months);
    const created: Charge[] = [];
    for (let i = 0; i < dto.months; i += 1) {
      const isLast = i === dto.months - 1;
      const amountFils = isLast ? totalFils - perFils * (dto.months - 1) : perFils;
      const charge = await this.repo.create({
        studentId: dto.studentId,
        feePlanId: null,
        installmentPlanId: planId,
        description: `${dto.description} — ${i + 1}/${dto.months}`,
        amount: amountFils / 1000,
        dueDate: addMonths(dto.firstDueDate, i),
      });
      await this.bridge.tryIssueForCharge(charge.id);
      created.push(charge);
    }
    return created;
  }

  /**
   * The student's active installment plan as a ledger: each installment with its due date,
   * scheduled amount, amount paid, and remaining balance. Null when there is no plan.
   */
  async getInstallmentPlan(studentId: string): Promise<InstallmentPlanView | null> {
    const charges = await this.repo.installmentCharges(studentId);
    if (charges.length === 0) return null;
    const [balances, transactions] = await Promise.all([
      this.billing.chargeBalances(studentId),
      this.transactions.listForStudent(studentId),
    ]);
    // "paid" = what the parent actually handed over toward this installment (its verified payments),
    // so an over-paid month shows e.g. scheduled 377.778, paid 500. "balance" comes from the ledger
    // (scheduled − allocated), so any surplus that prepaid a later installment is reflected there.
    const paidByCharge = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.status === 'VERIFIED' && tx.chargeId) {
        paidByCharge.set(tx.chargeId, (paidByCharge.get(tx.chargeId) ?? 0) + Number(tx.amount));
      }
    }
    const rows: InstallmentRow[] = charges.map((c) => {
      const b = balances.find((x) => x.charge.id === c.id);
      return {
        id: c.id,
        description: c.description,
        dueDate: c.dueDate,
        amount: c.amount.toFixed(3),
        paid: (paidByCharge.get(c.id) ?? 0).toFixed(3),
        balance: b?.balance ?? c.amount.toFixed(3),
        status: c.status,
      };
    });
    return { planId: charges[0]!.installmentPlanId!, charges: rows };
  }

  /**
   * Delete the student's installment plan. Unpaid installments are cancelled (removed from the
   * balance); any installment that already received a payment is detached but kept intact so the
   * ledger and received money are preserved.
   */
  async deleteInstallmentPlan(studentId: string): Promise<void> {
    const charges = await this.repo.installmentCharges(studentId);
    for (const charge of charges) {
      if (charge.status === 'PENDING') {
        await this.repo.cancelInstallment(charge.id);
      } else {
        await this.repo.detachInstallment(charge.id);
      }
    }
  }

  /**
   * Pay an installment as a ledger entry. The installment's scheduled amount never changes — the
   * payment is recorded against it (showing e.g. "scheduled 377.778, paid 500"). Any surplus beyond
   * this installment's balance is allocated to the **latest** unpaid installment(s), so the plan
   * total is preserved and only the last installment's remaining balance shrinks. A true surplus
   * beyond the whole plan stays as account credit.
   */
  async payInstallment(dto: PayInstallmentDto): Promise<InstallmentPlanView | null> {
    const planCharges = await this.repo.installmentCharges(dto.studentId);
    const target = planCharges.find((c) => c.id === dto.chargeId);
    if (!target) {
      throw new BadRequestException('Charge is not part of an active installment plan');
    }

    const before = await this.billing.chargeBalances(dto.studentId);
    const targetBal = Number(before.find((b) => b.charge.id === target.id)?.balance ?? 0);

    // Record + verify the payment; the ledger auto-allocates up to this installment's balance.
    const txn = await this.transactions.create({
      studentId: dto.studentId,
      chargeId: dto.chargeId,
      amount: dto.amount,
      method: dto.method,
      ...(dto.reference ? { reference: dto.reference } : {}),
    });
    await this.transactions.verify(txn.id);

    // Surplus = whatever the installment couldn't absorb. Prepay it onto the latest installments
    // (so the last one is the one that shrinks), leaving any remainder as account credit.
    let surplusFils = toFils(dto.amount) - toFils(Math.min(dto.amount, targetBal));
    if (surplusFils > 0) {
      const after = await this.billing.chargeBalances(dto.studentId);
      const balAfter = (id: string) => Number(after.find((b) => b.charge.id === id)?.balance ?? 0);
      const laterUnpaid = planCharges
        .filter((c) => c.id !== target.id && toFils(balAfter(c.id)) > 0)
        .sort((a, b) => (b.dueDate?.getTime() ?? 0) - (a.dueDate?.getTime() ?? 0)); // latest first

      const allocations: Array<{ chargeId: string; amount: number }> = [];
      for (const c of laterUnpaid) {
        if (surplusFils <= 0) break;
        const take = Math.min(surplusFils, toFils(balAfter(c.id)));
        if (take > 0) {
          allocations.push({ chargeId: c.id, amount: take / 1000 });
          surplusFils -= take;
        }
      }
      if (allocations.length > 0) {
        await this.ledger.allocate({ transactionId: txn.id, allocations });
      }
    }

    return this.getInstallmentPlan(dto.studentId);
  }

  listForStudent(studentId: string): Promise<Charge[]> {
    return this.repo.findByStudent(studentId);
  }
}
