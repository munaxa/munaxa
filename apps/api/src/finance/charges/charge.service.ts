import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Charge } from '@prisma/client';
import { ChargeRepository } from './charge.repository';
import { FinanceBridgeService } from '../../einvoicing/finance-bridge.service';
import type { CreateChargeDto, CreateInstallmentsDto } from './charge.dto';

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

  listForStudent(studentId: string): Promise<Charge[]> {
    return this.repo.findByStudent(studentId);
  }
}
