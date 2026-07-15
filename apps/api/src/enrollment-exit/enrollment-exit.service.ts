import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { EnrollmentExitRepository } from './enrollment-exit.repository';
import type { CancelAdmissionDto, WithdrawDto } from './enrollment-exit.dto';
import { ChargeService } from '../finance/charges/charge.service';
import { EnrollmentLifecycleService } from '../people/enrollment-lifecycle/enrollment-lifecycle.service';

/**
 * Enrollment exit orchestration (Decision 11). Two DISTINCT operations, both over the EXISTING ledger
 * (no ledger redesign) and both non-destructive — nothing is ever deleted:
 *   • withdraw()        — an ACTIVE student leaves mid-life. Academic event (→ WITHDRAWN via the
 *                         lifecycle service) + a financial settlement (cancel remaining UNPAID charges
 *                         per policy; paid amounts and, by default, the registration fee are kept).
 *   • cancelAdmission() — a NOT-yet-settled admission is voided BEFORE any money is applied (charges
 *                         voided, enrollment CANCELLED). Refuses once any installment is paid — use
 *                         withdraw instead.
 * Refunds/penalties are bespoke and issued through the existing manual finance flows.
 */
@Injectable()
export class EnrollmentExitService {
  constructor(
    private readonly repo: EnrollmentExitRepository,
    private readonly charges: ChargeService,
    private readonly lifecycle: EnrollmentLifecycleService,
  ) {}

  async withdraw(enrollmentId: string, dto: WithdrawDto) {
    const summary = await this.repo.chargeSummary(enrollmentId);
    if (!summary) throw new NotFoundException('Enrollment not found');

    // Academic event first: the lifecycle service stamps WITHDRAWN + withdrawalDate and syncs the
    // derived student status. Illegal transitions (e.g. already graduated) are rejected there.
    await this.lifecycle.transition(enrollmentId, EnrollmentStatus.WITHDRAWN, {
      ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
    });

    const cancelUnpaid = dto.cancelUnpaidCharges ?? true;
    const keepRegistration = dto.keepRegistrationFee ?? true;
    const cancelledChargeIds: string[] = [];
    if (cancelUnpaid) {
      for (const c of summary.charges) {
        if (c.status === 'CANCELLED' || c.status === 'PAID') continue; // nothing to cancel
        if (keepRegistration && c.isRegistration) continue; // keep the registration fee
        // ChargeService.cancel cancels the charge + its UNPAID installments; paid/partial are kept.
        await this.charges.cancel(c.id);
        cancelledChargeIds.push(c.id);
      }
    }

    await this.repo.auditWithdrawalSettlement(enrollmentId, {
      ...(dto.reason ? { reason: dto.reason } : {}),
      cancelUnpaid,
      keepRegistration,
      cancelledChargeIds,
    });

    return { enrollmentId, withdrawn: true, cancelledChargeIds };
  }

  async cancelAdmission(enrollmentId: string, dto: CancelAdmissionDto) {
    const summary = await this.repo.chargeSummary(enrollmentId);
    if (!summary) throw new NotFoundException('Enrollment not found');
    if (summary.hasSettledMoney) {
      throw new BadRequestException(
        'This admission has payments applied — withdraw the student (with a settlement) instead of cancelling',
      );
    }

    // Void every charge (none are paid), then mark the admission + enrollment CANCELLED. History kept.
    const voidedChargeIds: string[] = [];
    for (const c of summary.charges) {
      if (c.status === 'CANCELLED') continue;
      await this.charges.cancel(c.id);
      voidedChargeIds.push(c.id);
    }
    await this.repo.voidAdmission(enrollmentId, dto.reason);

    return { enrollmentId, cancelled: true, voidedChargeIds };
  }
}
