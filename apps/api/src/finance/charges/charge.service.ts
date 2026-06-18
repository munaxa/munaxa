import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Charge } from '@prisma/client';
import { ChargeRepository } from './charge.repository';
import { BillingRepository } from '../ledger/billing.repository';
import { TransactionService } from '../transactions/transaction.service';
import { FinanceBridgeService } from '../../einvoicing/finance-bridge.service';
import type { CreateChargeDto, CreateInstallmentsDto, PayInstallmentDto } from './charge.dto';

/** Convert a JOD amount to integer fils (1/1000 JOD) so splits never drift on rounding. */
const toFils = (n: number): number => Math.round(n * 1000);

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

  /** The student's active installment plan (grouped charges), or null when none exists. */
  async getInstallmentPlan(
    studentId: string,
  ): Promise<{ planId: string; charges: Charge[] } | null> {
    const charges = await this.repo.installmentCharges(studentId);
    if (charges.length === 0) return null;
    return { planId: charges[0]!.installmentPlanId!, charges };
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
   * Pay an installment, keeping the plan total fixed. If the parent pays more than this month's
   * installment, the surplus shrinks the remaining unpaid installments evenly so the plan still
   * sums to the original total — e.g. 3400 / 9 = 377.778 each; paying 500 now leaves 2900 over the
   * other 8 = 362.500 each. Underpaying just leaves a balance on this installment and changes
   * nothing else.
   */
  async payInstallment(
    dto: PayInstallmentDto,
  ): Promise<{ planId: string; charges: Charge[] } | null> {
    const planCharges = await this.repo.installmentCharges(dto.studentId);
    const target = planCharges.find((c) => c.id === dto.chargeId);
    if (!target) {
      throw new BadRequestException('Charge is not part of an active installment plan');
    }

    const balances = await this.billing.chargeBalances(dto.studentId);
    const balOf = (id: string) => balances.find((b) => b.charge.id === id);
    const targetBalFils = toFils(Number(balOf(target.id)?.balance ?? 0));
    const paidBeforeFils = planCharges.reduce(
      (sum, c) => sum + toFils(Number(balOf(c.id)?.allocated ?? 0)),
      0,
    );
    const totalFils = planCharges.reduce((sum, c) => sum + toFils(Number(c.amount)), 0);
    const payFils = toFils(dto.amount);

    // Overpayment beyond this installment's balance → grow it (capped at the whole remaining plan)
    // so the payment fully lands here, then rebalance the rest.
    if (payFils > targetBalFils) {
      const absorbFils = Math.min(payFils, totalFils - paidBeforeFils);
      const targetAllocatedFils = toFils(Number(balOf(target.id)?.allocated ?? 0));
      await this.repo.updateAmount(target.id, (targetAllocatedFils + absorbFils) / 1000);
    }

    // Record + verify the payment so it allocates to this charge immediately.
    const txn = await this.transactions.create({
      studentId: dto.studentId,
      chargeId: dto.chargeId,
      amount: dto.amount,
      method: dto.method,
      ...(dto.reference ? { reference: dto.reference } : {}),
    });
    await this.transactions.verify(txn.id);

    // Rebalance the remaining unpaid installments to carry exactly (total − paid).
    if (payFils > targetBalFils) {
      const after = await this.billing.chargeBalances(dto.studentId);
      const balAfter = (id: string) => after.find((b) => b.charge.id === id);
      const remaining = planCharges.filter(
        (c) => c.id !== target.id && toFils(Number(balAfter(c.id)?.balance ?? 0)) > 0,
      );
      const paidAfterFils = planCharges.reduce(
        (sum, c) => sum + toFils(Number(balAfter(c.id)?.allocated ?? 0)),
        0,
      );
      let remainingDueFils = totalFils - paidAfterFils;
      if (remainingDueFils < 0) remainingDueFils = 0;

      if (remaining.length > 0) {
        if (remainingDueFils === 0) {
          for (const c of remaining) await this.repo.cancelInstallment(c.id);
        } else {
          const perFils = Math.floor(remainingDueFils / remaining.length);
          for (let i = 0; i < remaining.length; i += 1) {
            const c = remaining[i]!;
            const isLast = i === remaining.length - 1;
            const shareFils = isLast
              ? remainingDueFils - perFils * (remaining.length - 1)
              : perFils;
            const allocatedFils = toFils(Number(balAfter(c.id)?.allocated ?? 0));
            await this.repo.updateAmount(c.id, (allocatedFils + shareFils) / 1000);
          }
        }
      }
    }

    return this.getInstallmentPlan(dto.studentId);
  }

  listForStudent(studentId: string): Promise<Charge[]> {
    return this.repo.findByStudent(studentId);
  }
}
