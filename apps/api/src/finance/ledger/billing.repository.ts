import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type Charge,
  type FeeAdjustment,
  type PaymentAllocation,
  type Refund,
} from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';
import { TenantContextStore } from '../../prisma/tenant-context';
import type { TxClient } from '../../prisma/tenant.helpers';

const ZERO = new Prisma.Decimal(0);

/** Per-charge derived figures. */
export interface ChargeBalance {
  charge: Charge;
  gross: string; // original amount
  discount: string; // active adjustments tied to this charge
  net: string; // gross − discount
  allocated: string; // active allocations to this charge
  balance: string; // net − allocated
}

/** Account-level derived figures for a student. */
export interface AccountSummary {
  charged: string; // Σ active charge amounts (excl. CANCELLED)
  chargeDiscounts: string; // Σ active adjustments tied to a charge
  accountCredits: string; // Σ active account-level credit memos
  netCharged: string; // charged − chargeDiscounts
  paid: string; // Σ verified payments
  refunded: string; // Σ verified refunds
  outstanding: string; // max(netCharged − paid − accountCredits, 0)
  creditBalance: string; // max(paid + accountCredits − netCharged, 0) − refunded
}

/**
 * Data access + derived-figure computation for the student billing ledger. All sums are
 * recomputed from child rows inside the active transaction (no denormalised counters to drift),
 * and a charge's status is recomputed whenever its allocations/adjustments change.
 */
@Injectable()
export class BillingRepository extends TenantRepository {
  // ------------------------------------------------------------- adjustments

  /** Apply a deduction; recompute the affected charge's status. */
  applyAdjustment(data: {
    studentId: string;
    chargeId: string | null;
    type: FeeAdjustment['type'];
    amount: Prisma.Decimal;
    percent: Prisma.Decimal | null;
    reason: string;
  }): Promise<FeeAdjustment> {
    return this.run(async (tx, tenantId) => {
      const adj = await tx.feeAdjustment.create({
        data: {
          tenantId,
          studentId: data.studentId,
          chargeId: data.chargeId,
          type: data.type,
          amount: data.amount,
          percent: data.percent,
          reason: data.reason,
          createdById: TenantContextStore.get()?.actorUserId ?? null,
        },
      });
      if (data.chargeId) await this.recomputeCharge(tx, data.chargeId);
      await this.writeAudit(tx, tenantId, {
        action: 'finance.adjustment.apply',
        entityType: 'FeeAdjustment',
        entityId: adj.id,
        metadata: {
          studentId: data.studentId,
          chargeId: data.chargeId,
          type: data.type,
          amount: data.amount.toString(),
        },
      });
      return adj;
    });
  }

  reverseAdjustment(id: string): Promise<FeeAdjustment> {
    return this.run(async (tx, tenantId) => {
      const adj = await tx.feeAdjustment.update({
        where: { id },
        data: {
          status: 'REVERSED',
          reversedAt: new Date(),
          reversedById: TenantContextStore.get()?.actorUserId ?? null,
        },
      });
      if (adj.chargeId) await this.recomputeCharge(tx, adj.chargeId);
      await this.writeAudit(tx, tenantId, {
        action: 'finance.adjustment.reverse',
        entityType: 'FeeAdjustment',
        entityId: adj.id,
      });
      return adj;
    });
  }

  findAdjustment(id: string): Promise<FeeAdjustment | null> {
    return this.run((tx) => tx.feeAdjustment.findFirst({ where: { id } }));
  }

  // ------------------------------------------------------------- allocations

  /** Apply (part of) a verified payment to a charge; recompute the charge. */
  allocate(data: {
    transactionId: string;
    chargeId: string;
    amount: Prisma.Decimal;
  }): Promise<PaymentAllocation> {
    return this.run(async (tx, tenantId) => {
      const alloc = await tx.paymentAllocation.create({
        data: {
          tenantId,
          transactionId: data.transactionId,
          chargeId: data.chargeId,
          amount: data.amount,
          createdById: TenantContextStore.get()?.actorUserId ?? null,
        },
      });
      await this.recomputeCharge(tx, data.chargeId);
      await this.writeAudit(tx, tenantId, {
        action: 'finance.allocation.create',
        entityType: 'PaymentAllocation',
        entityId: alloc.id,
        metadata: {
          transactionId: data.transactionId,
          chargeId: data.chargeId,
          amount: data.amount.toString(),
        },
      });
      return alloc;
    });
  }

  /** Unallocated portion of a verified transaction = amount − Σ active allocations. */
  unallocatedFor(transactionId: string): Promise<Prisma.Decimal> {
    return this.run(async (tx) => this.unallocatedTx(tx, transactionId));
  }

  private async unallocatedTx(tx: TxClient, transactionId: string): Promise<Prisma.Decimal> {
    const txn = await tx.transaction.findFirst({ where: { id: transactionId } });
    if (!txn) return ZERO;
    const allocated = await tx.paymentAllocation.aggregate({
      where: { transactionId, reversedAt: null },
      _sum: { amount: true },
    });
    return txn.amount.minus(allocated._sum.amount ?? ZERO);
  }

  // ----------------------------------------------------------------- refunds

  createRefund(data: {
    studentId: string;
    amount: Prisma.Decimal;
    method: Refund['method'];
    reference: string | null;
    reason: string;
  }): Promise<Refund> {
    return this.run(async (tx, tenantId) => {
      const refund = await tx.refund.create({
        data: { tenantId, ...data, recordedById: TenantContextStore.get()?.actorUserId ?? null },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'finance.refund.create',
        entityType: 'Refund',
        entityId: refund.id,
        metadata: { studentId: data.studentId, amount: data.amount.toString() },
      });
      return refund;
    });
  }

  setRefundStatus(id: string, status: 'VERIFIED' | 'REJECTED', note?: string): Promise<Refund> {
    return this.run(async (tx, tenantId) => {
      const refund = await tx.refund.update({
        where: { id },
        data: {
          status,
          verifiedById: TenantContextStore.get()?.actorUserId ?? null,
          verifiedAt: new Date(),
          ...(note !== undefined ? { note } : {}),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: status === 'VERIFIED' ? 'finance.refund.verify' : 'finance.refund.reject',
        entityType: 'Refund',
        entityId: refund.id,
        metadata: { amount: refund.amount.toString(), status },
      });
      return refund;
    });
  }

  findRefund(id: string): Promise<Refund | null> {
    return this.run((tx) => tx.refund.findFirst({ where: { id } }));
  }

  // -------------------------------------------------------------- summaries

  /** Recompute and persist a single charge's status from its adjustments + allocations. */
  private async recomputeCharge(tx: TxClient, chargeId: string): Promise<void> {
    const charge = await tx.charge.findFirst({ where: { id: chargeId } });
    if (!charge || charge.status === 'CANCELLED') return;
    const [discountAgg, allocAgg] = await Promise.all([
      tx.feeAdjustment.aggregate({
        where: { chargeId, status: 'APPLIED' },
        _sum: { amount: true },
      }),
      tx.paymentAllocation.aggregate({
        where: { chargeId, reversedAt: null },
        _sum: { amount: true },
      }),
    ]);
    const discount = discountAgg._sum.amount ?? ZERO;
    const allocated = allocAgg._sum.amount ?? ZERO;
    const net = charge.amount.minus(discount);
    let status: Charge['status'];
    if (net.lessThanOrEqualTo(ZERO))
      status = 'WAIVED'; // fully discounted
    else if (allocated.greaterThanOrEqualTo(net)) status = 'PAID';
    else if (allocated.greaterThan(ZERO) || discount.greaterThan(ZERO)) status = 'PARTIAL';
    else status = 'PENDING';
    if (status !== charge.status) {
      await tx.charge.update({ where: { id: chargeId }, data: { status } });
    }
  }

  /** Per-charge balances for a student (active charges first). */
  chargeBalances(studentId: string): Promise<ChargeBalance[]> {
    return this.run(async (tx) => {
      const charges = await tx.charge.findMany({
        where: { studentId },
        orderBy: { createdAt: 'asc' },
      });
      return Promise.all(
        charges.map(async (charge) => {
          const [discountAgg, allocAgg] = await Promise.all([
            tx.feeAdjustment.aggregate({
              where: { chargeId: charge.id, status: 'APPLIED' },
              _sum: { amount: true },
            }),
            tx.paymentAllocation.aggregate({
              where: { chargeId: charge.id, reversedAt: null },
              _sum: { amount: true },
            }),
          ]);
          const discount = discountAgg._sum.amount ?? ZERO;
          const allocated = allocAgg._sum.amount ?? ZERO;
          const net = charge.amount.minus(discount);
          return {
            charge,
            gross: charge.amount.toFixed(3),
            discount: discount.toFixed(3),
            net: net.toFixed(3),
            allocated: allocated.toFixed(3),
            balance: net.minus(allocated).toFixed(3),
          };
        }),
      );
    });
  }

  /** Account-level summary (the numbers behind the statement). */
  accountSummary(studentId: string): Promise<AccountSummary> {
    return this.run(async (tx) => {
      const [chargeAgg, chargeDiscAgg, creditAgg, paidAgg, refundAgg] = await Promise.all([
        tx.charge.aggregate({
          where: { studentId, status: { not: 'CANCELLED' } },
          _sum: { amount: true },
        }),
        tx.feeAdjustment.aggregate({
          where: { studentId, status: 'APPLIED', chargeId: { not: null } },
          _sum: { amount: true },
        }),
        tx.feeAdjustment.aggregate({
          where: { studentId, status: 'APPLIED', chargeId: null },
          _sum: { amount: true },
        }),
        tx.transaction.aggregate({
          where: { studentId, status: 'VERIFIED' },
          _sum: { amount: true },
        }),
        tx.refund.aggregate({ where: { studentId, status: 'VERIFIED' }, _sum: { amount: true } }),
      ]);
      const charged = chargeAgg._sum.amount ?? ZERO;
      const chargeDiscounts = chargeDiscAgg._sum.amount ?? ZERO;
      const accountCredits = creditAgg._sum.amount ?? ZERO;
      const paid = paidAgg._sum.amount ?? ZERO;
      const refunded = refundAgg._sum.amount ?? ZERO;
      const netCharged = charged.minus(chargeDiscounts);
      const coverage = paid.plus(accountCredits);
      const outstanding = Prisma.Decimal.max(netCharged.minus(coverage), ZERO);
      const creditBalance = Prisma.Decimal.max(coverage.minus(netCharged), ZERO).minus(refunded);
      return {
        charged: charged.toFixed(3),
        chargeDiscounts: chargeDiscounts.toFixed(3),
        accountCredits: accountCredits.toFixed(3),
        netCharged: netCharged.toFixed(3),
        paid: paid.toFixed(3),
        refunded: refunded.toFixed(3),
        outstanding: outstanding.toFixed(3),
        creditBalance: creditBalance.toFixed(3),
      };
    });
  }

  /** Available credit a refund can draw from = creditBalance (already net of prior refunds). */
  async availableCredit(studentId: string): Promise<Prisma.Decimal> {
    return new Prisma.Decimal((await this.accountSummary(studentId)).creditBalance);
  }

  /** Siblings of a student = other students who share at least one parent/guardian. */
  siblingsOf(studentId: string): Promise<
    Array<{
      id: string;
      firstNameEn: string;
      lastNameEn: string;
      firstNameAr: string;
      lastNameAr: string;
    }>
  > {
    return this.run(async (tx) => {
      const links = await tx.parentStudent.findMany({
        where: { studentId },
        select: { parentId: true },
      });
      const parentIds = links.map((l) => l.parentId);
      if (parentIds.length === 0) return [];
      const sibLinks = await tx.parentStudent.findMany({
        where: { parentId: { in: parentIds }, studentId: { not: studentId } },
        select: { studentId: true },
      });
      const ids = [...new Set(sibLinks.map((s) => s.studentId))];
      if (ids.length === 0) return [];
      return tx.student.findMany({
        where: { id: { in: ids }, deletedAt: null },
        select: {
          id: true,
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
        },
        orderBy: { firstNameEn: 'asc' },
      });
    });
  }

  listAdjustments(studentId: string): Promise<FeeAdjustment[]> {
    return this.run((tx) =>
      tx.feeAdjustment.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  listRefunds(studentId: string): Promise<Refund[]> {
    return this.run((tx) =>
      tx.refund.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  chargeById(id: string): Promise<Charge | null> {
    return this.run((tx) => tx.charge.findFirst({ where: { id } }));
  }

  transactionById(id: string) {
    return this.run((tx) => tx.transaction.findFirst({ where: { id } }));
  }

  studentExists(studentId: string): Promise<boolean> {
    return this.run(
      async (tx) =>
        (await tx.student.findFirst({ where: { id: studentId, deletedAt: null } })) !== null,
    );
  }
}
