import { Injectable } from '@nestjs/common';
import type { Charge, FeeAdjustment, Refund, Transaction } from '@prisma/client';
import { ChargeRepository } from '../charges/charge.repository';
import { TransactionRepository } from '../transactions/transaction.repository';
import { BillingRepository, type ChargeBalance } from '../ledger/billing.repository';

export interface StudentStatement {
  studentId: string;
  charges: Charge[];
  transactions: Transaction[];
  adjustments: FeeAdjustment[];
  refunds: Refund[];
  /** Per-charge gross/discount/net/allocated/balance. */
  chargeBalances: ChargeBalance[];
  totals: {
    // Back-compat fields (unchanged formula when there are no deductions/refunds):
    charged: string;
    paid: string;
    outstanding: string;
    // New ledger fields:
    discounts: string; // deductions tied to charges
    credits: string; // account-level credit memos
    refunded: string; // verified refunds
    creditBalance: string; // unapplied credit available to refund
  };
}

export interface HouseholdMember {
  studentId: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  outstanding: string;
}

/**
 * Student financial statement. The headline numbers stay sum-based for back-compat —
 *   outstanding = (Σ charges − Σ charge-discounts − Σ account-credits) − Σ verified payments
 * — while the ledger detail (per-charge balances, deductions, refunds, credit) comes from the
 * billing repository.
 */
@Injectable()
export class StatementService {
  constructor(
    private readonly charges: ChargeRepository,
    private readonly transactions: TransactionRepository,
    private readonly billing: BillingRepository,
  ) {}

  /** Siblings (students sharing a guardian) with each one's outstanding balance. */
  async household(studentId: string): Promise<HouseholdMember[]> {
    const siblings = await this.billing.siblingsOf(studentId);
    return Promise.all(
      siblings.map(async (s) => ({
        studentId: s.id,
        firstNameEn: s.firstNameEn,
        lastNameEn: s.lastNameEn,
        firstNameAr: s.firstNameAr,
        lastNameAr: s.lastNameAr,
        outstanding: (await this.billing.accountSummary(s.id)).outstanding,
      })),
    );
  }

  async forStudent(studentId: string): Promise<StudentStatement> {
    const [chargeList, txList, adjustments, refunds, chargeBalances, summary] = await Promise.all([
      this.charges.findByStudent(studentId),
      this.transactions.findByStudent(studentId),
      this.billing.listAdjustments(studentId),
      this.billing.listRefunds(studentId),
      this.billing.chargeBalances(studentId),
      this.billing.accountSummary(studentId),
    ]);
    return {
      studentId,
      charges: chargeList,
      transactions: txList,
      adjustments,
      refunds,
      chargeBalances,
      totals: {
        charged: summary.charged,
        paid: summary.paid,
        outstanding: summary.outstanding,
        discounts: summary.chargeDiscounts,
        credits: summary.accountCredits,
        refunded: summary.refunded,
        creditBalance: summary.creditBalance,
      },
    };
  }
}
