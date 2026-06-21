import { Injectable } from '@nestjs/common';
import { ApprovalStatus, EnrollmentStatus } from '@prisma/client';
import { AdmissionsRepository } from './admissions.repository';
import { QuoteService } from './quote.service';
import type {
  CommitDto,
  CreateArrangementDto,
  CreateFeeItemDto,
  QuoteDto,
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
  constructor(
    private readonly repo: AdmissionsRepository,
    private readonly quotes: QuoteService,
  ) {}

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

  // Commit (new or returning)
  async commit(dto: CommitDto) {
    const policy = await this.repo.getPolicyFlags();
    return this.repo.commit(dto, policy?.requireFinanceApprovalForFeeChanges ?? false);
  }

  loadReturning(studentId: string) {
    return this.repo.loadReturning(studentId);
  }

  // Enrollments / reporting
  listEnrollments(filter: {
    academicYearId?: string;
    gradeId?: string;
    status?: EnrollmentStatus;
  }) {
    return this.repo.listEnrollments(filter);
  }
  listModifications(status?: ApprovalStatus) {
    return this.repo.listModifications(status);
  }
  approve(modificationId: string, note?: string) {
    return this.repo.decideModification(modificationId, true, note);
  }
  reject(modificationId: string, note?: string) {
    return this.repo.decideModification(modificationId, false, note);
  }
  createArrangement(dto: CreateArrangementDto) {
    return this.repo.createArrangement(dto);
  }
}
