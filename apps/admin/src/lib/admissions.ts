'use client';

import { authFetch } from './auth';

export type TransportDirection = 'NONE' | 'ONE_WAY' | 'TWO_WAY';
export type QuotePaymentMode = 'FULL' | 'INSTALLMENTS';
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

export interface QuoteLine {
  kind: FeeItemKind;
  feeItemId: string | null;
  label: string;
  amount: string;
  discountable: boolean;
  discountAmount: string;
  overridden: boolean;
  originalAmount: string | null;
}
export interface QuoteInstallment {
  index: number;
  dueDate: string;
  amount: string;
}
export interface ComputedQuote {
  academicYearId: string;
  gradeId: string;
  studentId: string | null;
  transportDirection: TransportDirection;
  paymentMode: QuotePaymentMode;
  installments: number;
  firstDueDate: string | null;
  lines: QuoteLine[];
  totalFees: string;
  discountEligible: string;
  nonDiscountEligible: string;
  discountAmount: string;
  grandTotal: string;
  schedule: QuoteInstallment[];
  feeModified: boolean;
  warnings: string[];
  quoteId?: string;
}

export interface FeeOverride {
  kind: FeeItemKind;
  amount: number;
  reason: string;
}

export interface QuoteRequest {
  gradeId: string;
  academicYearId: string;
  studentId?: string;
  transportDirection?: TransportDirection;
  paymentMode?: QuotePaymentMode;
  installments?: number;
  firstDueDate?: string;
  overrides?: FeeOverride[];
  persist?: boolean;
}

export interface CommitRequest {
  quoteId: string;
  idempotencyKey: string;
  existingStudentId?: string;
  student?: {
    firstNameEn: string;
    lastNameEn: string;
    firstNameAr?: string;
    lastNameAr?: string;
    gender?: 'MALE' | 'FEMALE';
    dateOfBirth?: string;
    nationalId?: string;
  };
  parent?: {
    firstNameEn: string;
    lastNameEn: string;
    firstNameAr?: string;
    lastNameAr?: string;
    phone?: string;
    email?: string;
  };
  sectionId?: string;
}

export interface EnrollmentRow {
  id: string;
  status: string;
  feeModified: boolean;
  transportDirection: TransportDirection;
  paymentMode: QuotePaymentMode;
  createdAt: string;
  student: { id: string; firstNameEn: string; lastNameEn: string };
  grade: { nameEn: string };
  academicYear: { name: string };
}

export interface ReturningStudent {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  billingProfile: { feeModified: boolean; customArrangement: boolean } | null;
  parentLinks: Array<{
    parent: { id: string; firstNameEn: string; lastNameEn: string; phone: string | null };
  }>;
  enrollments: Array<{
    id: string;
    grade: { nameEn: string };
    academicYear: { name: string };
    transportDirection: TransportDirection;
  }>;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const admissionsApi = {
  quote: (req: QuoteRequest) =>
    authFetch('/admissions/quote', { method: 'POST', body: JSON.stringify(req) }).then((r) =>
      json<ComputedQuote>(r),
    ),
  commit: (req: CommitRequest) =>
    authFetch('/admissions/commit', { method: 'POST', body: JSON.stringify(req) }).then((r) =>
      json<{ id: string; status: string }>(r),
    ),
  loadReturning: (studentId: string) =>
    authFetch(`/admissions/returning/${studentId}`).then((r) => json<ReturningStudent>(r)),
  listEnrollments: (
    params: { academicYearId?: string; gradeId?: string; status?: string } = {},
  ) => {
    const sp = new URLSearchParams();
    if (params.academicYearId) sp.set('academicYearId', params.academicYearId);
    if (params.gradeId) sp.set('gradeId', params.gradeId);
    if (params.status) sp.set('status', params.status);
    const qs = sp.toString();
    return authFetch(`/admissions/enrollments${qs ? `?${qs}` : ''}`).then((r) =>
      json<EnrollmentRow[]>(r),
    );
  },
};
