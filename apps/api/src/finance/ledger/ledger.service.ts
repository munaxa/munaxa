import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type FeeAdjustment, type PaymentAllocation, type Refund } from '@prisma/client';
import { BillingRepository } from './billing.repository';
import { FinanceBridgeService } from '../../einvoicing/finance-bridge.service';
import type { ApplyAdjustmentDto, AllocatePaymentDto, CreateRefundDto } from './ledger.dto';

const ZERO = new Prisma.Decimal(0);

/**
 * Student billing ledger: structured deductions (scholarships/discounts/waivers/credit memos),
 * payment→charge allocation, and refunds of available credit. Every figure is recomputed from
 * the source rows, so the ledger can always be traced and never drifts.
 */
@Injectable()
export class LedgerService {
  constructor(
    private readonly repo: BillingRepository,
    private readonly bridge: FinanceBridgeService,
  ) {}

  // ------------------------------------------------------------- deductions

  async applyAdjustment(dto: ApplyAdjustmentDto): Promise<FeeAdjustment> {
    if (!(await this.repo.studentExists(dto.studentId))) {
      throw new BadRequestException('Student not found in this tenant');
    }
    if (dto.amount === undefined && dto.percent === undefined) {
      throw new BadRequestException('Provide either an amount or a percent');
    }
    if (dto.percent !== undefined && !dto.chargeId) {
      throw new BadRequestException('A percent deduction requires a chargeId to compute against');
    }

    let amount: Prisma.Decimal;
    let chargeId: string | null = dto.chargeId ?? null;

    if (dto.chargeId) {
      const charge = await this.repo.chargeById(dto.chargeId);
      if (!charge || charge.studentId !== dto.studentId) {
        throw new BadRequestException('Charge not found for this student');
      }
      if (charge.status === 'CANCELLED') {
        throw new ConflictException('Cannot adjust a cancelled charge');
      }
      // Net currently remaining to discount = amount − already-applied discounts.
      const balances = await this.repo.chargeBalances(dto.studentId);
      const cb = balances.find((b) => b.charge.id === dto.chargeId)!;
      const net = new Prisma.Decimal(cb.net);
      amount =
        dto.percent !== undefined
          ? net.times(dto.percent).dividedBy(100)
          : new Prisma.Decimal(dto.amount!);
      if (amount.greaterThan(net)) {
        throw new BadRequestException(
          `Deduction ${amount.toFixed(3)} exceeds the charge's remaining net ${net.toFixed(3)}`,
        );
      }
    } else {
      // Account-level credit memo.
      if (dto.type !== 'CREDIT_MEMO') {
        throw new BadRequestException('Only a CREDIT_MEMO may be account-level (no chargeId)');
      }
      amount = new Prisma.Decimal(dto.amount!);
      chargeId = null;
    }

    const adjustment = await this.repo.applyAdjustment({
      studentId: dto.studentId,
      chargeId,
      type: dto.type,
      amount,
      percent: dto.percent !== undefined ? new Prisma.Decimal(dto.percent) : null,
      reason: dto.reason,
    });
    // Best-effort: if this reduced an already-invoiced charge, auto-issue a 381 credit note.
    if (chargeId) {
      await this.bridge.tryCreditForCharge(chargeId, Number(amount), dto.reason);
    }
    return adjustment;
  }

  async reverseAdjustment(id: string): Promise<FeeAdjustment> {
    const adj = await this.repo.findAdjustment(id);
    if (!adj) throw new NotFoundException('Adjustment not found');
    if (adj.status === 'REVERSED') throw new ConflictException('Adjustment is already reversed');
    return this.repo.reverseAdjustment(id);
  }

  // ------------------------------------------------------------ allocations

  /** Apply a verified payment to one or more charges (manual allocation). */
  async allocate(dto: AllocatePaymentDto): Promise<PaymentAllocation[]> {
    const txn = await this.repo.transactionById(dto.transactionId);
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.status !== 'VERIFIED') {
      throw new ConflictException('Only a verified payment can be allocated');
    }
    const requested = dto.allocations.reduce((s, a) => s.plus(a.amount), ZERO);
    const unallocated = await this.repo.unallocatedFor(dto.transactionId);
    if (requested.greaterThan(unallocated)) {
      throw new BadRequestException(
        `Allocation ${requested.toFixed(3)} exceeds the unallocated payment ${unallocated.toFixed(3)}`,
      );
    }

    const balances = await this.repo.chargeBalances(txn.studentId);
    const results: PaymentAllocation[] = [];
    for (const line of dto.allocations) {
      const cb = balances.find((b) => b.charge.id === line.chargeId);
      if (!cb) throw new BadRequestException(`Charge ${line.chargeId} not found for this student`);
      const balance = new Prisma.Decimal(cb.balance);
      if (new Prisma.Decimal(line.amount).greaterThan(balance)) {
        throw new BadRequestException(
          `Allocation ${line.amount} exceeds charge balance ${cb.balance}`,
        );
      }
      results.push(
        await this.repo.allocate({
          transactionId: dto.transactionId,
          chargeId: line.chargeId,
          amount: new Prisma.Decimal(line.amount),
        }),
      );
    }
    return results;
  }

  /**
   * Best-effort auto-allocation when a payment is verified against a specific charge
   * (called from the transaction verify flow). Caps at the charge's remaining balance.
   */
  async autoAllocateOnVerify(transactionId: string, chargeId: string): Promise<void> {
    const balances = await this.repo.chargeBalances(
      (await this.repo.transactionById(transactionId))!.studentId,
    );
    const cb = balances.find((b) => b.charge.id === chargeId);
    if (!cb) return;
    const balance = new Prisma.Decimal(cb.balance);
    const unallocated = await this.repo.unallocatedFor(transactionId);
    const amount = Prisma.Decimal.min(balance, unallocated);
    if (amount.greaterThan(ZERO)) {
      await this.repo.allocate({ transactionId, chargeId, amount });
    }
  }

  // ---------------------------------------------------------------- refunds

  async createRefund(dto: CreateRefundDto): Promise<Refund> {
    if (!(await this.repo.studentExists(dto.studentId))) {
      throw new BadRequestException('Student not found in this tenant');
    }
    const available = await this.repo.availableCredit(dto.studentId);
    if (new Prisma.Decimal(dto.amount).greaterThan(available)) {
      throw new BadRequestException(
        `Refund ${dto.amount} exceeds the available credit balance ${available.toFixed(3)}`,
      );
    }
    return this.repo.createRefund({
      studentId: dto.studentId,
      amount: new Prisma.Decimal(dto.amount),
      method: dto.method,
      reference: dto.reference ?? null,
      reason: dto.reason,
    });
  }

  async verifyRefund(id: string): Promise<Refund> {
    const refund = await this.requirePendingRefund(id);
    // Re-check at verify time: the credit balance may have changed since the request.
    const available = await this.repo.availableCredit(refund.studentId);
    if (refund.amount.greaterThan(available)) {
      throw new ConflictException(
        `Refund ${refund.amount.toFixed(3)} now exceeds the available credit ${available.toFixed(3)}`,
      );
    }
    return this.repo.setRefundStatus(id, 'VERIFIED');
  }

  async rejectRefund(id: string, note?: string): Promise<Refund> {
    await this.requirePendingRefund(id);
    return this.repo.setRefundStatus(id, 'REJECTED', note);
  }

  private async requirePendingRefund(id: string): Promise<Refund> {
    const refund = await this.repo.findRefund(id);
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status !== 'PENDING')
      throw new ConflictException(`Refund is already ${refund.status}`);
    return refund;
  }
}
