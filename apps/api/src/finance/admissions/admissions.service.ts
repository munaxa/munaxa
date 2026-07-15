import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AdmissionStatus, ApprovalStatus, EnrollmentStatus } from '@prisma/client';
import { AdmissionsRepository } from './admissions.repository';
import { QuoteService } from './quote.service';
import { RegistrationAgreementService } from '../../documents/registration-agreement.service';
import { TenantContextStore } from '../../prisma/tenant-context';
import { AddFamilyStudentMode } from './admissions.dto';
import type {
  AddFamilyStudentDto,
  CommitDto,
  CreateArrangementDto,
  CreateFeeItemDto,
  FamilyCommitDto,
  QuoteDto,
  ReEnrollDto,
  UpdateFeeItemDto,
  UpsertGradeFeeItemDto,
} from './admissions.dto';

/**
 * Admissions orchestration (Phase 22): catalog, quotation, atomic registration commit (new +
 * returning), fee-modification approvals, and financial arrangements. Thin layer over
 * {@link AdmissionsRepository} + {@link QuoteService}; all writes are audited in-transaction.
 */
@Injectable()
export class AdmissionsService {
  private readonly logger = new Logger(AdmissionsService.name);

  constructor(
    private readonly repo: AdmissionsRepository,
    private readonly quotes: QuoteService,
    private readonly agreements: RegistrationAgreementService,
  ) {}

  /**
   * Generate the Registration Agreement AFTER the commit response is sent — rendering the bilingual
   * PDF is the slow part of a registration, and the agreement is regenerable from the immutable
   * snapshot, so it must never keep the registrar waiting. The current tenant context is captured and
   * re-bound because the request's async scope has already unwound by the time this runs. Best-effort:
   * tryAutoGenerate never throws, and any failure here is logged, not surfaced to the caller.
   */
  private scheduleAgreement(enrollmentId: string): void {
    const context = TenantContextStore.get();
    const runner = () => this.agreements.tryAutoGenerate(enrollmentId);
    void Promise.resolve()
      .then(() => (context ? TenantContextStore.run(context, runner) : runner()))
      .catch((err) => this.logger.error(`background agreement generation failed: ${String(err)}`));
  }

  // Catalog
  listFeeItems() {
    return this.repo.listFeeItems();
  }
  createFeeItem(dto: CreateFeeItemDto) {
    return this.repo.createFeeItem(dto);
  }
  updateFeeItem(id: string, dto: UpdateFeeItemDto) {
    return this.repo.updateFeeItem(id, dto);
  }
  listGradeFeeItems(academicYearId: string, gradeId?: string) {
    return this.repo.listGradeFeeItems(academicYearId, gradeId);
  }
  upsertGradeFeeItem(dto: UpsertGradeFeeItemDto) {
    return this.repo.upsertGradeFeeItem(dto);
  }

  // Quote
  quote(dto: QuoteDto) {
    return this.quotes.quote(dto);
  }
  getQuote(id: string) {
    return this.repo.getQuote(id);
  }

  // Commit (new or returning). A fee change holds the enrollment in PENDING_APPROVAL (charges
  // deferred) only when the tenant opts into the approval workflow
  // (BillingPolicy.requireFinanceApprovalForFeeChanges, default false). Otherwise the admitting
  // user — who holds fee authority — commits in one step; the change is recorded and
  // auto-approved for audit. See AdmissionsRepository.commit.
  // After a successful commit, automatically generate the Registration Agreement from the committed
  // snapshot. Best-effort and only for COMMITTED enrollments (held/PENDING_APPROVAL ones get their
  // agreement when finance approves — see approve()). Generation is idempotent (one immutable
  // agreement per enrollment) and never blocks/fails the commit.
  async commit(dto: CommitDto) {
    const enrollment = await this.repo.commit(dto);
    if (enrollment.admissionStatus === AdmissionStatus.REGISTERED) {
      // Fire-and-forget: return the committed enrollment immediately; the agreement PDF renders in
      // the background so the registrar isn't blocked on it (see scheduleAgreement).
      this.scheduleAgreement(enrollment.id);
    }
    return enrollment;
  }

  /**
   * Atomic FAMILY registration commit: one guardian/customer pays for one or more students through a
   * single family payment plan. After commit, generate the ONE family Registration Agreement (from the
   * committed snapshot / family plan) in the background — same fire-and-forget pattern as commit().
   */
  async familyCommit(dto: FamilyCommitDto) {
    const result = await this.repo.familyCommit(dto);
    // The agreement is one-per-guardian+year; scheduling it for any of the family's enrolments
    // produces the single family agreement covering all the children.
    if (result.enrollmentIds.length > 0) this.scheduleAgreement(result.enrollmentIds[0]!);
    return result;
  }

  /**
   * Add a child to an EXISTING family (the existing-family wizard: MERGE / SEPARATE / NEW_PLAN). Never
   * touches paid installments. Regenerates the ONE family agreement from the updated snapshot.
   */
  async addStudentToFamily(financialAccountId: string, dto: AddFamilyStudentDto) {
    const result = await this.repo.addStudentToFamily(financialAccountId, dto);
    if (result.enrollmentId) this.scheduleAgreement(result.enrollmentId);
    return result;
  }

  /**
   * Re-enroll a returning (Case-C) student into a NEW academic year (Decision 3 — reuses the shared
   * enrollment pipeline; the student is NEVER recreated). Derives the student's existing Financial
   * Account, guards against a duplicate enrollment for that year, then delegates to the same
   * add-to-account path as admission. Previous enrollments and ledgers are untouched (Decisions 11, 12).
   */
  async reEnroll(dto: ReEnrollDto) {
    const ctx = await this.repo.reEnrollContext(dto.studentId, dto.quoteId);
    if (ctx.alreadyEnrolled) {
      throw new BadRequestException('Student is already enrolled for that academic year');
    }
    const financialAccountId = dto.financialAccountId ?? ctx.financialAccountId;
    if (!financialAccountId) {
      throw new BadRequestException(
        'This student has no Financial Account yet — provide financialAccountId to bill through',
      );
    }

    const result = await this.repo.addStudentToFamily(financialAccountId, {
      idempotencyKey: dto.idempotencyKey,
      quoteId: dto.quoteId,
      mode: dto.mode ?? AddFamilyStudentMode.NEW_PLAN,
      existingStudentId: dto.studentId,
      ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
      ...(dto.areaId ? { areaId: dto.areaId } : {}),
      ...(dto.transportRequested !== undefined
        ? { transportRequested: dto.transportRequested }
        : {}),
      ...(dto.registrationFeePaid !== undefined
        ? { registrationFeePaid: dto.registrationFeePaid }
        : {}),
      ...(dto.paymentMode ? { paymentMode: dto.paymentMode } : {}),
      ...(dto.installments ? { installments: dto.installments } : {}),
      ...(dto.firstDueDate ? { firstDueDate: dto.firstDueDate } : {}),
      ...(dto.confirm !== undefined ? { confirm: dto.confirm } : {}),
    });
    if (result.enrollmentId) this.scheduleAgreement(result.enrollmentId);
    return result;
  }

  loadReturning(studentId: string) {
    return this.repo.loadReturning(studentId);
  }

  /** Enrollment statistics (participation + admission-funnel breakdowns), optionally by academic year. */
  enrollmentStats(academicYearId?: string) {
    return this.repo.enrollmentStats(academicYearId);
  }

  // Enrollments / reporting
  listEnrollments(filter: {
    academicYearId?: string;
    gradeId?: string;
    status?: EnrollmentStatus;
    admissionStatus?: AdmissionStatus;
  }) {
    return this.repo.listEnrollments(filter);
  }
  listModifications(status?: ApprovalStatus) {
    return this.repo.listModifications(status);
  }
  // Approving a held (fee-modified) enrollment activates it (creates its charges); generate the
  // agreement from the now-committed snapshot. Generation is idempotent — the enrollment keeps its
  // single immutable agreement; later financial changes live in the billing ledger, not a new
  // agreement version — see RegistrationAgreementService.
  async approve(modificationId: string, note?: string) {
    const decision = await this.repo.decideModification(modificationId, true, note);
    const enrollmentId = await this.repo.enrollmentIdForModification(modificationId);
    if (enrollmentId) this.scheduleAgreement(enrollmentId);
    return decision;
  }
  reject(modificationId: string, note?: string) {
    return this.repo.decideModification(modificationId, false, note);
  }
  createArrangement(dto: CreateArrangementDto) {
    return this.repo.createArrangement(dto);
  }
}
