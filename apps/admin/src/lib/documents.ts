'use client';

import { authFetch } from './auth';

export type DocumentType =
  | 'REGISTRATION_AGREEMENT'
  | 'PAYMENT_RECEIPT'
  | 'ANNUAL_TUITION_CERTIFICATE'
  | 'OUTSTANDING_BALANCE_CERTIFICATE'
  | 'CLEARANCE_CERTIFICATE'
  | 'ACCOUNT_STATEMENT'
  | 'PAYMENT_HISTORY'
  | 'FEE_BREAKDOWN'
  | 'STUDENT_FINANCIAL_SUMMARY';

export type DocumentLanguage = 'EN' | 'AR' | 'BILINGUAL';

export type FeeItemKind =
  | 'REGISTRATION'
  | 'TUITION'
  | 'BOOKS'
  | 'UNIFORM'
  | 'INSURANCE'
  | 'ACTIVITY'
  | 'TECHNOLOGY'
  | 'EXAM'
  | 'LABORATORY'
  | 'TRANSPORT'
  | 'CUSTOM';

export type DocumentPersistence = 'SNAPSHOT' | 'DYNAMIC';

export interface DocumentMeta {
  id: string;
  documentNo: number;
  type: DocumentType;
  persistence: DocumentPersistence;
  title: string;
  language: DocumentLanguage;
  status: 'ARCHIVED' | 'SUPERSEDED' | 'CANCELLED';
  version: number;
  studentId?: string | null;
  academicYearId?: string | null;
  enrollmentId?: string | null;
  paymentId?: string | null;
  checksum?: string | null;
  byteSize?: number | null;
  printedCount: number;
  downloadCount: number;
  emailCount: number;
  lastPrintedAt?: string | null;
  lastDownloadedAt?: string | null;
  lastEmailedAt?: string | null;
  generatedAt: string;
}

export interface DocumentAccessLog {
  id: string;
  action: 'GENERATE' | 'PRINT' | 'DOWNLOAD' | 'EMAIL' | 'VIEW';
  status: 'SUCCESS' | 'FAILED';
  actorUserId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface EmailDocumentInput {
  to?: string[];
  includePrimaryParent?: boolean;
  includeSecondaryParent?: boolean;
  includeGuardian?: boolean;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject?: string;
  message?: string;
}

export type AgreementStatus =
  | 'DRAFT'
  | 'COMMITTED'
  | 'GENERATED'
  | 'PRINTED'
  | 'SIGNED'
  | 'CANCELLED'
  | 'ARCHIVED';

export interface RegistrationAgreementRow {
  id: string;
  agreementNo: number;
  version: number;
  status: AgreementStatus;
  /** Derived lifecycle status shown in the UI (SIGNED > PRINTED > GENERATED). */
  effectiveStatus: AgreementStatus;
  enrollmentId: string;
  studentId: string;
  grandTotal: string;
  documentId?: string | null;
  registrationDate: string;
  createdAt: string;
  printedCount: number;
  lastPrintedAt?: string | null;
  signedFileName?: string | null;
  signedFileType?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
  signedUploadedAt?: string | null;
  signedUploadedByName?: string | null;
  hasSigned: boolean;
}

export interface AcademicYearOption {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface GenerateDocumentInput {
  type: DocumentType;
  studentId: string;
  language?: DocumentLanguage;
  academicYearId?: string;
  paymentId?: string;
  includeKinds?: FeeItemKind[];
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Open a PDF Response (download/print/agreement) in a new browser tab. */
async function openPdf(res: Response): Promise<void> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  // Revoke after a delay so the new tab has time to load the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const qs = (params: Record<string, string | undefined>) => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  const s = usp.toString();
  return s ? `?${s}` : '';
};

export const documentsApi = {
  list: (studentId: string, type?: DocumentType) =>
    authFetch(`/documents${qs({ studentId, type })}`).then((r) => json<DocumentMeta[]>(r)),

  listAgreements: (studentId: string) =>
    authFetch(`/documents/agreements${qs({ studentId })}`).then((r) =>
      json<RegistrationAgreementRow[]>(r),
    ),

  academicYears: () =>
    authFetch('/documents/academic-years').then((r) => json<AcademicYearOption[]>(r)),

  generate: (input: GenerateDocumentInput) =>
    authFetch('/documents/generate', { method: 'POST', body: JSON.stringify(input) }).then((r) =>
      json<DocumentMeta>(r),
    ),

  generateAgreement: (enrollmentId: string, language?: DocumentLanguage) =>
    authFetch('/documents/agreements', {
      method: 'POST',
      body: JSON.stringify({ enrollmentId, ...(language ? { language } : {}) }),
    }).then((r) => json<{ agreement: RegistrationAgreementRow; document: DocumentMeta }>(r)),

  download: (id: string) => authFetch(`/documents/${id}/download`).then(openPdf),

  print: (id: string) =>
    authFetch(`/documents/${id}/print`, { method: 'POST', body: '{}' }).then(openPdf),

  email: (id: string, input: EmailDocumentInput) =>
    authFetch(`/documents/${id}/email`, {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => json<{ sent: boolean }>(r)),

  history: (id: string) =>
    authFetch(`/documents/${id}/history`).then((r) => json<DocumentAccessLog[]>(r)),

  /**
   * Upload (or replace) the parent's countersigned agreement: presign a tenant-scoped key, PUT the
   * file straight to storage, then confirm so the API records it as the school's legal copy.
   */
  uploadSignedAgreement: async (
    agreementId: string,
    file: File,
    opts: { signedBy?: string; signedAt?: string; replace?: boolean } = {},
  ): Promise<{ signed: boolean }> => {
    const presign = await authFetch(`/documents/agreements/${agreementId}/signed/presign`, {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
    }).then((r) => json<{ uploadUrl: string; fileKey: string }>(r));

    const put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!put.ok) throw new Error(`Upload to storage failed (${put.status})`);

    return authFetch(`/documents/agreements/${agreementId}/signed`, {
      method: opts.replace ? 'PUT' : 'POST',
      body: JSON.stringify({
        fileKey: presign.fileKey,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        ...(opts.signedBy ? { signedBy: opts.signedBy } : {}),
        ...(opts.signedAt ? { signedAt: opts.signedAt } : {}),
      }),
    }).then((r) => json<{ signed: boolean }>(r));
  },

  /** Open the signed agreement in a new tab via a short-lived, tenant-scoped storage URL. */
  viewSignedAgreement: async (agreementId: string): Promise<void> => {
    const { url } = await authFetch(`/documents/agreements/${agreementId}/signed`).then((r) =>
      json<{ url: string }>(r),
    );
    window.open(url, '_blank', 'noopener');
  },

  deleteSignedAgreement: (agreementId: string) =>
    authFetch(`/documents/agreements/${agreementId}/signed`, { method: 'DELETE' }).then((r) =>
      json<{ deleted: boolean }>(r),
    ),
};
