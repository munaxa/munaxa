'use client';

import { authFetch } from './auth';

/** Family Finance domain client — the financial customer (FinancialAccount) is the primary entity. */

export type FinancialAccountOwnerType =
  | 'GUARDIAN'
  | 'GRANDPARENT'
  | 'COMPANY'
  | 'CHARITY'
  | 'SPONSOR'
  | 'GOVERNMENT'
  | 'SCHOLARSHIP_ORG'
  | 'COURT_ORDER'
  | 'RELATIVE'
  | 'OTHER';

export interface FamilySearchHit {
  financialAccountId: string | null;
  parentId: string | null;
  ownerType: FinancialAccountOwnerType;
  nameEn: string;
  nameAr: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  studentCount: number;
}

export interface FamilySummary {
  charged: string;
  discounts: string;
  netCharged: string;
  paid: string;
  outstanding: string;
  creditBalance: string;
  refunded: string;
  nextDue: { dueDate: string; amount: string } | null;
  lastPayment: { date: string; amount: string } | null;
  collectionStatus: 'NONE' | 'FINANCIAL_ISSUE' | 'LEGAL';
  childrenCount: number;
}

export interface FamilyStudent {
  studentId: string;
  studentAccountId: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  gradeNameEn: string | null;
  gradeNameAr: string | null;
}

export interface FamilyDashboard {
  account: {
    id: string;
    ownerType: FinancialAccountOwnerType;
    nameEn: string;
    nameAr: string;
    phone: string | null;
    email: string | null;
    currency: string;
    status: string;
  };
  summary: FamilySummary;
  students: FamilyStudent[];
}

export interface FamilyStatement {
  financialAccountId: string;
  totals: FamilySummary;
  children: Array<{
    studentId: string;
    firstNameEn: string;
    lastNameEn: string;
    firstNameAr: string;
    lastNameAr: string;
    gradeNameEn: string | null;
    gradeNameAr: string | null;
    totals: {
      charged: string;
      discounts: string;
      netCharged: string;
      paid: string;
      outstanding: string;
      creditBalance: string;
      refunded: string;
    };
  }>;
  payments: Array<{
    id: string;
    amount: string;
    method: string;
    status: string;
    createdAt: string;
    receiptNo: number | null;
  }>;
}

export type PaymentMethod = 'CASH' | 'CLIQ' | 'EWALLET' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const familiesApi = {
  search: (q: string) =>
    authFetch(`/finance/families/search?q=${encodeURIComponent(q)}`).then((r) =>
      json<FamilySearchHit[]>(r),
    ),
  dashboard: (financialAccountId: string) =>
    authFetch(`/finance/families/${financialAccountId}`).then((r) => json<FamilyDashboard>(r)),
  byParent: (parentId: string) =>
    authFetch(`/finance/families/by-parent/${parentId}`).then((r) =>
      json<{
        account: { id: string; nameEn: string; ownerType: FinancialAccountOwnerType } | null;
        students: FamilyStudent[];
      }>(r),
    ),
  statement: (financialAccountId: string) =>
    authFetch(`/finance/families/${financialAccountId}/statement`).then((r) =>
      json<FamilyStatement>(r),
    ),
  recordPayment: (
    financialAccountId: string,
    data: { amount: number; method: PaymentMethod; reference?: string; note?: string },
  ) =>
    authFetch(`/finance/payments/family/${financialAccountId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json<{ id: string; status: string }>(r)),
  outstandingReport: (groupBy: 'family' | 'student') =>
    authFetch(`/finance/reports/outstanding?groupBy=${groupBy}`).then((r) =>
      json<
        Array<{
          dimId: string | null;
          label: string;
          gross: string;
          discount: string;
          net: string;
          paid: string;
          outstanding: string;
          chargeCount: number;
        }>
      >(r),
    ),
};
