import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentLanguage,
  DocumentType,
  GeneratedDocumentStatus,
  Prisma,
  RegistrationAgreementStatus,
} from '@prisma/client';
import { TenantRepository } from '../common/tenant.repository';
import { TenantContextStore } from '../prisma/tenant-context';
import type { TxClient } from '../prisma/tenant.helpers';

/** Columns returned for archive listings — deliberately excludes the (large) `pdf` bytea. */
const META_SELECT = {
  id: true,
  documentNo: true,
  type: true,
  title: true,
  language: true,
  status: true,
  version: true,
  studentId: true,
  parentId: true,
  academicYearId: true,
  enrollmentId: true,
  transactionId: true,
  checksum: true,
  byteSize: true,
  printedCount: true,
  lastPrintedAt: true,
  generatedById: true,
  generatedAt: true,
  createdAt: true,
} satisfies Prisma.GeneratedDocumentSelect;

export type DocumentMeta = Prisma.GeneratedDocumentGetPayload<{ select: typeof META_SELECT }>;

export interface ArchiveDocumentInput {
  type: DocumentType;
  title: string;
  language: DocumentLanguage;
  studentId?: string | null;
  parentId?: string | null;
  academicYearId?: string | null;
  enrollmentId?: string | null;
  transactionId?: string | null;
  version?: number;
  dataSnapshot: Prisma.InputJsonValue;
  pdf: Buffer;
  checksum: string;
  byteSize: number;
}

@Injectable()
export class DocumentRepository extends TenantRepository {
  private actor(): string | null {
    return TenantContextStore.get()?.actorUserId ?? null;
  }

  /**
   * Allocate the next gapless number for a per-tenant scope (row-locked, lazily created) — identical
   * to the FinanceReceiptCounter / JoFotara ICV pattern, so numbers are sequential with no gaps.
   */
  private async nextNumber(tx: TxClient, tenantId: string, scope: string): Promise<number> {
    await tx.$executeRaw`
      INSERT INTO "DocumentSequence" ("id","tenantId","scope")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${scope})
      ON CONFLICT ("tenantId","scope") DO NOTHING`;
    const rows = await tx.$queryRaw<{ next: number }[]>`
      UPDATE "DocumentSequence" SET "nextNo" = "nextNo" + 1
      WHERE "tenantId" = ${tenantId}::uuid AND "scope" = ${scope}
      RETURNING "nextNo" - 1 AS "next"`;
    return rows[0]!.next;
  }

  /** Archive a freshly-rendered document (own transaction). Audited as a generation event. */
  archiveDocument(input: ArchiveDocumentInput): Promise<DocumentMeta> {
    return this.run(async (tx, tenantId) => this.archiveInTx(tx, tenantId, input));
  }

  /** Archive within an existing transaction (used by the agreement flow). */
  async archiveInTx(
    tx: TxClient,
    tenantId: string,
    input: ArchiveDocumentInput,
  ): Promise<DocumentMeta> {
    const documentNo = await this.nextNumber(tx, tenantId, `DOC:${input.type}`);
    const doc = await tx.generatedDocument.create({
      data: {
        tenantId,
        documentNo,
        type: input.type,
        title: input.title,
        language: input.language,
        version: input.version ?? 1,
        studentId: input.studentId ?? null,
        parentId: input.parentId ?? null,
        academicYearId: input.academicYearId ?? null,
        enrollmentId: input.enrollmentId ?? null,
        transactionId: input.transactionId ?? null,
        dataSnapshot: input.dataSnapshot,
        // Normalise to a plain Uint8Array<ArrayBuffer> for the Prisma Bytes column (Node 22's
        // Buffer<ArrayBufferLike> is not directly assignable).
        pdf: new Uint8Array(input.pdf),
        checksum: input.checksum,
        byteSize: input.byteSize,
        generatedById: this.actor(),
      },
      select: META_SELECT,
    });
    await this.writeAudit(tx, tenantId, {
      action: 'document.generate',
      entityType: 'GeneratedDocument',
      entityId: doc.id,
      metadata: { type: input.type, documentNo, checksum: input.checksum },
    });
    return doc;
  }

  listDocuments(filter: {
    studentId?: string;
    type?: DocumentType;
    enrollmentId?: string;
  }): Promise<DocumentMeta[]> {
    return this.run((tx) =>
      tx.generatedDocument.findMany({
        where: {
          ...(filter.studentId ? { studentId: filter.studentId } : {}),
          ...(filter.type ? { type: filter.type } : {}),
          ...(filter.enrollmentId ? { enrollmentId: filter.enrollmentId } : {}),
        },
        select: META_SELECT,
        orderBy: { generatedAt: 'desc' },
        take: 500,
      }),
    );
  }

  getMeta(id: string): Promise<DocumentMeta | null> {
    return this.run((tx) => tx.generatedDocument.findFirst({ where: { id }, select: META_SELECT }));
  }

  /** Internal: fetch the stored PDF + metadata without auditing (used for email attachments). */
  async pdfFor(id: string): Promise<{ meta: DocumentMeta; pdf: Buffer }> {
    return this.run(async (tx) => {
      const doc = await tx.generatedDocument.findFirst({ where: { id } });
      if (!doc) throw new NotFoundException('Document not found');
      const { pdf, ...meta } = doc;
      return { meta: meta as unknown as DocumentMeta, pdf: Buffer.from(pdf) };
    });
  }

  /** Fetch the stored PDF and record a download in the audit log (no counter change). */
  async download(id: string): Promise<{ meta: DocumentMeta; pdf: Buffer }> {
    return this.run(async (tx, tenantId) => {
      const doc = await tx.generatedDocument.findFirst({ where: { id } });
      if (!doc) throw new NotFoundException('Document not found');
      await this.writeAudit(tx, tenantId, {
        action: 'document.download',
        entityType: 'GeneratedDocument',
        entityId: id,
        metadata: { type: doc.type, documentNo: doc.documentNo },
      });
      const { pdf, ...meta } = doc;
      return { meta: meta as unknown as DocumentMeta, pdf: Buffer.from(pdf) };
    });
  }

  /** Reprint: increments the print counter, stamps lastPrintedAt, audits, returns the stored PDF. */
  async print(id: string): Promise<{ meta: DocumentMeta; pdf: Buffer }> {
    return this.run(async (tx, tenantId) => {
      const existing = await tx.generatedDocument.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException('Document not found');
      const doc = await tx.generatedDocument.update({
        where: { id },
        data: { printedCount: { increment: 1 }, lastPrintedAt: new Date() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'document.print',
        entityType: 'GeneratedDocument',
        entityId: id,
        metadata: { type: doc.type, documentNo: doc.documentNo, printedCount: doc.printedCount },
      });
      const { pdf, ...meta } = doc;
      return { meta: meta as unknown as DocumentMeta, pdf: Buffer.from(pdf) };
    });
  }

  /** Audit an email send for a document (the PDF is read separately for attachment). */
  logEmail(id: string, to: string): Promise<unknown> {
    return this.run((tx, tenantId) =>
      this.writeAudit(tx, tenantId, {
        action: 'document.email',
        entityType: 'GeneratedDocument',
        entityId: id,
        metadata: { to },
      }),
    );
  }

  // ── Registration agreements ────────────────────────────────────────────────

  /**
   * Persist a registration-agreement version atomically: archive any current active version,
   * allocate the agreement + document numbers, store the agreement snapshot + the rendered PDF,
   * and link them. Returns the new agreement with its document metadata.
   */
  persistAgreementVersion(input: {
    enrollmentId: string;
    studentId: string;
    parentId: string | null;
    academicYearId: string;
    campusId: string | null;
    gradeId: string | null;
    sectionId: string | null;
    registrationDate: Date;
    paymentMode: 'FULL' | 'INSTALLMENTS';
    installments: number;
    feeBreakdown: Prisma.InputJsonValue;
    installmentSchedule: Prisma.InputJsonValue;
    grandTotal: Prisma.Decimal;
    title: string;
    language: DocumentLanguage;
    dataSnapshot: Prisma.InputJsonValue;
    pdf: Buffer;
    checksum: string;
    byteSize: number;
  }) {
    return this.run(async (tx, tenantId) => {
      // Archive the prior active version (never overwrite) — Part: Versioning.
      const prior = await tx.registrationAgreement.findFirst({
        where: {
          enrollmentId: input.enrollmentId,
          status: { in: [RegistrationAgreementStatus.COMMITTED, RegistrationAgreementStatus.SIGNED] },
        },
        orderBy: { version: 'desc' },
      });
      if (prior) {
        await tx.registrationAgreement.update({
          where: { id: prior.id },
          data: { status: RegistrationAgreementStatus.ARCHIVED },
        });
        if (prior.documentId) {
          await tx.generatedDocument.update({
            where: { id: prior.documentId },
            data: { status: GeneratedDocumentStatus.SUPERSEDED },
          });
        }
      }
      const version = (prior?.version ?? 0) + 1;

      const agreementNo = await this.nextNumber(tx, tenantId, 'AGREEMENT');
      const document = await this.archiveInTx(tx, tenantId, {
        type: DocumentType.REGISTRATION_AGREEMENT,
        title: input.title,
        language: input.language,
        studentId: input.studentId,
        parentId: input.parentId,
        academicYearId: input.academicYearId,
        enrollmentId: input.enrollmentId,
        version,
        dataSnapshot: input.dataSnapshot,
        pdf: input.pdf,
        checksum: input.checksum,
        byteSize: input.byteSize,
      });

      const agreement = await tx.registrationAgreement.create({
        data: {
          tenantId,
          agreementNo,
          version,
          status: RegistrationAgreementStatus.COMMITTED,
          enrollmentId: input.enrollmentId,
          studentId: input.studentId,
          parentId: input.parentId,
          academicYearId: input.academicYearId,
          campusId: input.campusId,
          gradeId: input.gradeId,
          sectionId: input.sectionId,
          registrationDate: input.registrationDate,
          paymentMode: input.paymentMode,
          installments: input.installments,
          feeBreakdown: input.feeBreakdown,
          installmentSchedule: input.installmentSchedule,
          grandTotal: input.grandTotal,
          documentId: document.id,
          supersedesId: prior?.id ?? null,
          registrarId: this.actor(),
        },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'document.registrationAgreement.generate',
        entityType: 'RegistrationAgreement',
        entityId: agreement.id,
        metadata: { agreementNo, version, enrollmentId: input.enrollmentId },
      });
      return { agreement, document };
    });
  }

  listAgreements(filter: { studentId?: string; enrollmentId?: string }) {
    return this.run((tx) =>
      tx.registrationAgreement.findMany({
        where: {
          ...(filter.studentId ? { studentId: filter.studentId } : {}),
          ...(filter.enrollmentId ? { enrollmentId: filter.enrollmentId } : {}),
        },
        orderBy: [{ enrollmentId: 'asc' }, { version: 'desc' }],
        take: 500,
      }),
    );
  }

  // ── Context reads (data the templates render) ──────────────────────────────

  /** Enrollment + quote + people/placement for building an agreement snapshot. */
  enrollmentContext(enrollmentId: string) {
    return this.run(async (tx) => {
      const enrollment = await tx.enrollment.findFirst({
        where: { id: enrollmentId },
        include: {
          quote: { include: { items: true } },
          academicYear: { select: { id: true, name: true, campusId: true } },
          grade: { select: { id: true, nameEn: true, nameAr: true } },
          student: {
            include: {
              section: { select: { id: true, name: true } },
              parentLinks: { include: { parent: true }, orderBy: { isPrimary: 'desc' } },
            },
          },
        },
      });
      return enrollment;
    });
  }

  /** A student's identity + primary guardian + current enrollment (for finance documents). */
  studentContext(studentId: string) {
    return this.run(async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: studentId, deletedAt: null },
        include: {
          section: { include: { grade: { select: { nameEn: true, nameAr: true } } } },
          parentLinks: { include: { parent: true }, orderBy: { isPrimary: 'desc' } },
          enrollments: {
            orderBy: { createdAt: 'desc' },
            include: { academicYear: { select: { id: true, name: true } } },
          },
        },
      });
      return student;
    });
  }

  /** Verified payments allocated to the charges of a given installment plan / student in a year. */
  transactionContext(transactionId: string) {
    return this.run((tx) =>
      tx.transaction.findFirst({
        where: { id: transactionId },
        include: {
          charge: { select: { description: true } },
          allocations: { include: { charge: { select: { description: true } } } },
          student: {
            include: { parentLinks: { include: { parent: true }, orderBy: { isPrimary: 'desc' } } },
          },
        },
      }),
    );
  }

  academicYears() {
    return this.run((tx) =>
      tx.academicYear.findMany({
        select: { id: true, name: true, isCurrent: true },
        orderBy: { startDate: 'desc' },
      }),
    );
  }

  /** The student's enrollment for a given academic year, with its immutable fee quote. */
  yearEnrollment(studentId: string, academicYearId: string) {
    return this.run((tx) =>
      tx.enrollment.findFirst({
        where: { studentId, academicYearId },
        include: { quote: { include: { items: true } }, academicYear: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  /** Sum of verified payments allocated to the charges of one installment plan (paid toward a year). */
  async paidAllocatedToPlan(installmentPlanId: string): Promise<string> {
    return this.run(async (tx) => {
      const agg = await tx.paymentAllocation.aggregate({
        where: { reversedAt: null, charge: { installmentPlanId } },
        _sum: { amount: true },
      });
      return (agg._sum.amount ?? new Prisma.Decimal(0)).toFixed(3);
    });
  }

  /** Display name (or email) of a user — used for the cashier/registrar line on documents. */
  async userName(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    return this.run(async (tx) => {
      const u = await tx.user.findFirst({
        where: { id: userId },
        select: { firstNameEn: true, lastNameEn: true, email: true },
      });
      if (!u) return null;
      const name = [u.firstNameEn, u.lastNameEn].filter(Boolean).join(' ').trim();
      return name || u.email;
    });
  }
}
