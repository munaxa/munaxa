import { Injectable } from '@nestjs/common';
import type { Credit, FeeAdjustment, Refund } from '@prisma/client';
import { PaymentRepository, type DetailedPayment } from '../payments/payment.repository';
import { AccountRepository } from '../account/account.repository';
import {
  LedgerRepository,
  type AccountSummary,
  type ChargeView,
} from '../ledger/ledger.repository';

export interface StudentStatement {
  studentId: string;
  account: { id: string; currency: string; status: string; payerId: string | null };
  /** Hierarchical: charge (obligation) → plan → installments, with per-node balances (§13). */
  charges: ChargeView[];
  payments: DetailedPayment[];
  adjustments: FeeAdjustment[];
  credits: Array<Credit & { remaining: string }>;
  refunds: Refund[];
  totals: AccountSummary;
}

export interface HouseholdMember {
  studentId: string;
  outstanding: string;
}

/**
 * Student financial statement: the hierarchical account view (Account → Charges → Plans →
 * Installments) plus payments, adjustments, credits, refunds and the derived totals — every
 * figure recomputed from the ledger (the single source of truth), never stored (§13, LR-*).
 */
@Injectable()
export class StatementService {
  constructor(
    private readonly ledger: LedgerRepository,
    private readonly payments: PaymentRepository,
    private readonly accounts: AccountRepository,
  ) {}

  async forStudent(studentId: string): Promise<StudentStatement> {
    const account = await this.accounts.ensureAccount(studentId);
    const [charges, payments, adjustments, credits, refunds, totals] = await Promise.all([
      this.ledger.chargeViews(studentId),
      this.payments.findDetailedByStudent(studentId),
      this.ledger.listAdjustments(studentId),
      this.ledger.listCredits(studentId),
      this.ledger.listRefunds(studentId),
      this.ledger.accountSummary(studentId),
    ]);
    return {
      studentId,
      account: {
        id: account.id,
        currency: account.currency,
        status: account.status,
        payerId: account.payerId,
      },
      charges,
      payments,
      adjustments,
      credits,
      refunds,
      totals,
    };
  }

  /** Siblings (students sharing a guardian) with each one's outstanding balance. */
  async household(studentId: string): Promise<HouseholdMember[]> {
    const siblings = await this.accounts.siblingsOf(studentId);
    return Promise.all(
      siblings.map(async (id) => ({
        studentId: id,
        outstanding: (await this.ledger.accountSummary(id)).outstanding,
      })),
    );
  }
}
