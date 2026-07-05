import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentAccessAction,
  DocumentAccessStatus,
  DocumentLanguage,
  DocumentPersistence,
  DocumentType,
  GeneratedDocumentStatus,
  Prisma,
  RegistrationAgreementStatus,
} from '@prisma/client';
import { TenantRepository } from '../common/tenant.repository';
import { TenantContextStore } from '../prisma/tenant-context';
import type { TxClient } from '../prisma/tenant.helpers';
import type { AccessContext } from './document.types';

/** Columns returned for archive listings — deliberately excludes the (large) `pdf` bytea. */
const META_SELECT = {
  id: true,
  documentNo: true,
  type: true,
  persistence: true,
  title: true,
  language: true,
  status: true,
  version: true,
  studentId: true,
  parentId: true,
  academicYearId: true,
  enrollmentId: true,
  paymentId: true,
  checksum: true,
  byteSize: true,
  printedCount: true,
  downloadCount: true,
  emailCount: true,
  lastPrintedAt: true,
  lastDownloadedAt: true,
  lastEmailedAt: true,
  lastPrintedById: true,
  lastDownloadedById: true,
  lastEmailedById: true,
  generatedById: true,
  generatedAt: true,
  createdAt: true,
} satisfies Prisma.GeneratedDocumentSelect;

export type DocumentMeta = Prisma.GeneratedDocumentGetPayload<{ select: typeof META_SELECT }>;

export interface ArchiveDocumentInput {
  type: DocumentType;
  title: string;
  language: DocumentLanguage;
  persistence?: DocumentPersistence;
  studentId?: string | null;
  parentId?: string | null;
  academicYearId?: string | null;
  enrollmentId?: string | null;
  paymentId?: string | null;
  version?: number;
  dataSnapshot?: Prisma.InputJsonValue;
  pdf: Buffer;
  checksum: string;
  byteSize: number;
}

/** Metadata-only persistence for a DYNAMIC document (no PDF; rebuilt on demand from `params`). */
export interface DynamicMetadataInput {
  type: DocumentType;
  title: string;
  language: DocumentLanguage;
  studentId?: string | null;
  parentId?: string | null;
  academicYearId?: string | null;
  enrollmentId?: string | null;
  paymentId?: string | null;
  params: Prisma.InputJsonValue;
}

@Injectable()
export class DocumentRepository extends TenantRepository {
  private actor(): string | null {
    return TenantContextStore.get()?.actorUserId ?? null;
  }

  /**
   * Allocate the next gapless number for a per-tenant scope (row-locked, lazily created) — identical
   * to the PaymentReceiptCounter / JoFotara ICV pattern, so numbers are sequential with no gaps.
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

  /** Archive a SNAPSHOT document within an existing transaction (used by the agreement flow). */
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
        persistence: input.persistence ?? DocumentPersistence.SNAPSHOT,
        title: input.title,
        language: input.language,
        version: input.version ?? 1,
        studentId: input.studentId ?? null,
        parentId: input.parentId ?? null,
        academicYearId: input.academicYearId ?? null,
        enrollmentId: input.enrollmentId ?? null,
        paymentId: input.paymentId ?? null,
        dataSnapshot: input.dataSnapshot ?? Prisma.JsonNull,
        // Normalise to a plain Uint8Array<ArrayBuffer> for the Prisma Bytes column (Node 22's
        // Buffer<ArrayBufferLike> is not directly assignable).
        pdf: new Uint8Array(input.pdf),
        checksum: input.checksum,
        byteSize: input.byteSize,
        generatedById: this.actor(),
      },
      select: META_SELECT,
    });
    await this.recordAccessInTx(tx, tenantId, doc.id, input.type, DocumentAccessAction.GENERATE);
    await this.writeAudit(tx, tenantId, {
      action: 'document.generate',
      entityType: 'GeneratedDocument',
      entityId: doc.id,
      metadata: { type: input.type, documentNo, checksum: input.checksum },
    });
    return doc;
  }

  /** Persist a DYNAMIC document as metadata only (no PDF). The GENERATE action is recorded. */
  persistDynamicMetadata(input: DynamicMetadataInput): Promise<DocumentMeta> {
    return this.run(async (tx, tenantId) => {
      const documentNo = await this.nextNumber(tx, tenantId, `DOC:${input.type}`);
      const doc = await tx.generatedDocument.create({
        data: {
          tenantId,
          documentNo,
          type: input.type,
          persistence: DocumentPersistence.DYNAMIC,
          title: input.title,
          language: input.language,
          studentId: input.studentId ?? null,
          parentId: input.parentId ?? null,
          academicYearId: input.academicYearId ?? null,
          enrollmentId: input.enrollmentId ?? null,
          paymentId: input.paymentId ?? null,
          params: input.params,
          generatedById: this.actor(),
        },
        select: META_SELECT,
      });
      await this.recordAccessInTx(tx, tenantId, doc.id, input.type, DocumentAccessAction.GENERATE);
      await this.writeAudit(tx, tenantId, {
        action: 'document.generate',
        entityType: 'GeneratedDocument',
        entityId: doc.id,
        metadata: { type: input.type, documentNo, persistence: 'DYNAMIC' },
      });
      return doc;
    });
  }

  /** Write a DocumentAccessLog row + bump the matching denormalised counter (within a tx). */
  private async recordAccessInTx(
    tx: TxClient,
    tenantId: string,
    documentId: string,
    documentType: DocumentType,
    action: DocumentAccessAction,
    ctx?: AccessContext,
    status: DocumentAccessStatus = DocumentAccessStatus.SUCCESS,
  ): Promise<void> {
    await tx.documentAccessLog.create({
      data: {
        tenantId,
        documentId,
        documentType,
        action,
        status,
        actorUserId: this.actor(),
        ip: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
      },
    });
    if (status !== DocumentAccessStatus.SUCCESS) return;
    const now = new Date();
    const actor = this.actor();
    const counter: Prisma.GeneratedDocumentUpdateInput =
      action === DocumentAccessAction.PRINT
        ? { printedCount: { increment: 1 }, lastPrintedAt: now, lastPrintedById: actor }
        : action === DocumentAccessAction.DOWNLOAD
          ? { downloadCount: { increment: 1 }, lastDownloadedAt: now, lastDownloadedById: actor }
          : action === DocumentAccessAction.EMAIL
            ? { emailCount: { increment: 1 }, lastEmailedAt: now, lastEmailedById: actor }
            : {};
    if (Object.keys(counter).length > 0) {
      await tx.generatedDocument.update({ where: { id: documentId }, data: counter });
    }
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

  /**
   * Load a document for serving: its metadata, persistence strategy, the stored PDF (SNAPSHOT only)
   * and the re-render params (DYNAMIC only). No side effects — the caller records the access action.
   */
  async documentForServe(id: string): Promise<{
    meta: DocumentMeta;
    persistence: DocumentPersistence;
    pdf: Buffer | null;
    params: unknown;
  }> {
    return this.run(async (tx) => {
      const doc = await tx.generatedDocument.findFirst({ where: { id } });
      if (!doc) throw new NotFoundException('Document not found');
      const { pdf, params, ...rest } = doc;
      return {
        meta: rest as unknown as DocumentMeta,
        persistence: doc.persistence,
        pdf: pdf ? Buffer.from(pdf) : null,
        params: params ?? null,
      };
    });
  }

  /** Record an access action (PRINT/DOWNLOAD/EMAIL/VIEW) in its own transaction + mirror to audit. */
  recordAccess(
    id: string,
    action: DocumentAccessAction,
    ctx?: AccessContext,
    status: DocumentAccessStatus = DocumentAccessStatus.SUCCESS,
  ): Promise<void> {
    return this.run(async (tx, tenantId) => {
      const doc = await tx.generatedDocument.findFirst({
        where: { id },
        select: { id: true, type: true, documentNo: true },
      });
      if (!doc) throw new NotFoundException('Document not found');
      await this.recordAccessInTx(tx, tenantId, id, doc.type, action, ctx, status);
      await this.writeAudit(tx, tenantId, {
        action: `document.${action.toLowerCase()}`,
        entityType: 'GeneratedDocument',
        entityId: id,
        metadata: { type: doc.type, documentNo: doc.documentNo, status },
      });
    });
  }

  /** Full per-action access history for a document (newest first). */
  accessHistory(id: string) {
    return this.run((tx) =>
      tx.documentAccessLog.findMany({
        where: { documentId: id },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    );
  }

  /** Persist email-delivery metadata (no attachment stored). */
  logDocumentEmail(input: {
    documentId: string;
    recipients: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string | null;
    providerResponse?: string | null;
    status: DocumentAccessStatus;
    retryCount?: number;
  }): Promise<unknown> {
    return this.run((tx, tenantId) =>
      tx.documentEmailLog.create({
        data: {
          tenantId,
          documentId: input.documentId,
          sentById: this.actor(),
          recipients: input.recipients,
          cc: input.cc ?? [],
          bcc: input.bcc ?? [],
          subject: input.subject ?? null,
          providerResponse: input.providerResponse ?? null,
          status: input.status,
          retryCount: input.retryCount ?? 0,
        },
      }),
    );
  }

  emailHistory(id: string) {
    return this.run((tx) =>
      tx.documentEmailLog.findMany({
        where: { documentId: id },
        orderBy: { sentAt: 'desc' },
        take: 200,
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
          status: {
            in: [RegistrationAgreementStatus.COMMITTED, RegistrationAgreementStatus.SIGNED],
          },
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

  /** A verified payment with its allocations (→ installment → charge) for the receipt. */
  paymentContext(paymentId: string) {
    return this.run((tx) =>
      tx.payment.findFirst({
        where: { id: paymentId },
        include: {
          allocations: {
            include: { installment: { include: { charge: { select: { description: true } } } } },
          },
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

  /** Sum of verified payments allocated to the installments of an enrollment's charges (paid/year). */
  async paidForEnrollment(enrollmentId: string): Promise<string> {
    return this.run(async (tx) => {
      const agg = await tx.paymentAllocation.aggregate({
        where: { reversedAt: null, installment: { charge: { enrollmentId } } },
        _sum: { amount: true },
      });
      return (agg._sum.amount ?? new Prisma.Decimal(0)).toFixed(3);
    });
  }

  /** Resolve a student's parent emails by role for document email delivery. */
  async recipientEmails(
    studentId: string,
  ): Promise<{ primary: string | null; secondary: string | null; guardian: string | null }> {
    return this.run(async (tx) => {
      const links = await tx.parentStudent.findMany({
        where: { studentId },
        include: { parent: { select: { email: true } } },
        orderBy: { isPrimary: 'desc' },
      });
      const withEmail = links.filter((l) => l.parent.email);
      const guardianLink = withEmail.find((l) => l.relation === 'GUARDIAN');
      return {
        primary: withEmail[0]?.parent.email ?? null,
        secondary: withEmail[1]?.parent.email ?? null,
        guardian: guardianLink?.parent.email ?? null,
      };
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
