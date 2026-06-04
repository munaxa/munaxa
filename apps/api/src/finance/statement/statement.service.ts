import { Injectable } from '@nestjs/common';
import type { Charge, Transaction } from '@prisma/client';
import { ChargeRepository } from '../charges/charge.repository';
import { TransactionRepository } from '../transactions/transaction.repository';

export interface StudentStatement {
  studentId: string;
  charges: Charge[];
  transactions: Transaction[];
  totals: {
    charged: string;
    paid: string;
    outstanding: string;
  };
}

/**
 * Computes the outstanding balance for a student:
 *   Outstanding Balance = SUM(Charges) − SUM(verified Transactions)
 * (Charges that are CANCELLED/WAIVED are excluded from the sum.)
 */
@Injectable()
export class StatementService {
  constructor(
    private readonly charges: ChargeRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  async forStudent(studentId: string): Promise<StudentStatement> {
    const [chargeList, txList, charged, paid] = await Promise.all([
      this.charges.findByStudent(studentId),
      this.transactions.findByStudent(studentId),
      this.charges.sumForStudent(studentId),
      this.transactions.sumVerifiedForStudent(studentId),
    ]);
    const outstanding = charged.minus(paid);
    return {
      studentId,
      charges: chargeList,
      transactions: txList,
      totals: {
        charged: charged.toFixed(3),
        paid: paid.toFixed(3),
        outstanding: outstanding.toFixed(3),
      },
    };
  }
}
