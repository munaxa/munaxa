import { Module } from '@nestjs/common';
import { StorageService } from '../common/storage.service';
import { FeePlanController } from './fee-plans/fee-plan.controller';
import { FeePlanService } from './fee-plans/fee-plan.service';
import { FeePlanRepository } from './fee-plans/fee-plan.repository';
import { ChargeController } from './charges/charge.controller';
import { ChargeService } from './charges/charge.service';
import { ChargeRepository } from './charges/charge.repository';
import { TransactionController } from './transactions/transaction.controller';
import { TransactionService } from './transactions/transaction.service';
import { TransactionRepository } from './transactions/transaction.repository';
import { StatementController } from './statement/statement.controller';
import { StatementService } from './statement/statement.service';
import { LedgerController } from './ledger/ledger.controller';
import { LedgerService } from './ledger/ledger.service';
import { BillingRepository } from './ledger/billing.repository';

/**
 * Finance: fee plans, charges, transactions (CliQ/e-wallet receipt uploads → verify/reject),
 * the student statement, and the **billing ledger** (Phase 17): structured deductions
 * (scholarships/discounts/waivers/credit memos), payment→charge allocation with status
 * recompute, and refunds of available credit. There is no online payment gateway. Every
 * financial state change writes an AuditLog in the same transaction.
 */
@Module({
  controllers: [
    FeePlanController,
    ChargeController,
    TransactionController,
    StatementController,
    LedgerController,
  ],
  providers: [
    StorageService,
    FeePlanService,
    FeePlanRepository,
    ChargeService,
    ChargeRepository,
    TransactionService,
    TransactionRepository,
    StatementService,
    LedgerService,
    BillingRepository,
  ],
})
export class FinanceModule {}
