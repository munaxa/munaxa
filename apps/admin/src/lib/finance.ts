'use client';

import { authFetch } from './auth';

export interface Transaction {
  id: string;
  amount: string;
  method: string;
  status: string;
  reference?: string | null;
  chargeId?: string | null;
}

export interface Charge {
  id: string;
  description: string;
  amount: string;
  status: string;
  dueDate?: string | null;
}

export interface ChargeBalance {
  charge: Charge;
  gross: string;
  discount: string;
  net: string;
  allocated: string;
  balance: string;
}

export interface Adjustment {
  id: string;
  type: string;
  amount: string;
  percent: string | null;
  reason: string;
  status: string;
  chargeId: string | null;
  createdAt: string;
}

export interface Refund {
  id: string;
  amount: string;
  method: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface Statement {
  studentId: string;
  totals: {
    charged: string;
    paid: string;
    outstanding: string;
    discounts: string;
    credits: string;
    refunded: string;
    creditBalance: string;
  };
  charges: Charge[];
  transactions: Transaction[];
  adjustments: Adjustment[];
  refunds: Refund[];
  chargeBalances: ChargeBalance[];
}

export interface InstallmentCharge {
  id: string;
  description: string;
  amount: string;
  status: string;
  dueDate?: string | null;
}

export interface InstallmentPlan {
  planId: string;
  charges: InstallmentCharge[];
}

export interface HouseholdMember {
  studentId: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  outstanding: string;
}

export type CollectionsStatus = 'NONE' | 'FINANCIAL_ISSUE' | 'LEGAL';

export interface CollectionsProfile {
  studentId: string;
  collectionsStatus: CollectionsStatus;
  legalNote: string | null;
  flaggedAt: string | null;
  lastReminderAt: string | null;
  snapshot: { outstanding: string; dueThisMonth: string; overdue: string; eligible: boolean };
  reminders: Array<{
    id: string;
    channels: string[];
    outstanding: string;
    dueThisMonth: string;
    overdue: string;
    recipientCount: number;
    smsSentCount: number;
    createdAt: string;
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

export const financeApi = {
  // Charges & payments
  createCharge: (data: {
    studentId: string;
    description: string;
    amount: number;
    dueDate?: string;
  }) =>
    authFetch('/finance/charges', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json(r),
    ),
  statement: (studentId: string) =>
    authFetch(`/finance/students/${studentId}/statement`).then((r) => json<Statement>(r)),
  household: (studentId: string) =>
    authFetch(`/finance/students/${studentId}/household`).then((r) => json<HouseholdMember[]>(r)),
  createInstallments: (data: {
    studentId: string;
    description: string;
    totalAmount: number;
    months: number;
    firstDueDate: string;
  }) =>
    authFetch('/finance/charges/installments', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json(r)),
  installmentPlan: (studentId: string) =>
    authFetch(`/finance/charges/installments?studentId=${encodeURIComponent(studentId)}`).then(
      (r) => json<InstallmentPlan | null>(r),
    ),
  deleteInstallmentPlan: (studentId: string) =>
    authFetch(`/finance/charges/installments?studentId=${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
    }).then(() => undefined),
  recordPayment: (data: {
    studentId: string;
    chargeId?: string;
    amount: number;
    method: string;
    reference?: string;
  }) =>
    authFetch('/finance/transactions', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<{ id: string }>(r),
    ),
  payInstallment: (data: {
    studentId: string;
    chargeId: string;
    amount: number;
    method: string;
    reference?: string;
  }) =>
    authFetch('/finance/charges/installments/pay', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json(r)),
  verify: (id: string) =>
    authFetch(`/finance/transactions/${id}/verify`, { method: 'POST' }).then((r) => json(r)),
  reject: (id: string) =>
    authFetch(`/finance/transactions/${id}/reject`, { method: 'POST', body: '{}' }).then((r) =>
      json(r),
    ),

  // Ledger — deductions, allocation, refunds
  applyAdjustment: (data: {
    studentId: string;
    chargeId?: string;
    type: string;
    amount?: number;
    percent?: number;
    reason: string;
  }) =>
    authFetch('/finance/ledger/adjustments', { method: 'POST', body: JSON.stringify(data) }).then(
      (r) => json(r),
    ),
  reverseAdjustment: (id: string) =>
    authFetch(`/finance/ledger/adjustments/${id}/reverse`, { method: 'POST' }).then((r) => json(r)),
  createRefund: (data: { studentId: string; amount: number; method: string; reason: string }) =>
    authFetch('/finance/ledger/refunds', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json(r),
    ),
  verifyRefund: (id: string) =>
    authFetch(`/finance/ledger/refunds/${id}/verify`, { method: 'POST' }).then((r) => json(r)),

  // Collections & reminders
  collections: (studentId: string) =>
    authFetch(`/finance/collections/students/${studentId}`).then((r) =>
      json<CollectionsProfile>(r),
    ),
  setCollections: (studentId: string, data: { status: CollectionsStatus; note?: string }) =>
    authFetch(`/finance/collections/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((r) => json(r)),
  remind: (studentId: string, channels: string[]) =>
    authFetch(`/finance/collections/students/${studentId}/reminders`, {
      method: 'POST',
      body: JSON.stringify({ channels }),
    }).then((r) => json<{ recipients: number; smsSent: number }>(r)),
};

// --------------------------------------------------------------------------- Fee plans

export type FeeRecurrence = 'ONE_TIME' | 'MONTHLY' | 'TERM' | 'ANNUAL';

export const FEE_RECURRENCES: FeeRecurrence[] = ['ONE_TIME', 'MONTHLY', 'TERM', 'ANNUAL'];

export interface FeePlan {
  id: string;
  name: string;
  description?: string | null;
  amount: string;
  recurrence: FeeRecurrence;
  isActive: boolean;
}

export interface CreateFeePlanInput {
  name: string;
  description?: string;
  amount: number;
  recurrence?: FeeRecurrence;
  isActive?: boolean;
}

export const feePlansApi = {
  list: () => authFetch('/finance/fee-plans').then((r) => json<FeePlan[]>(r)),
  create: (data: CreateFeePlanInput) =>
    authFetch('/finance/fee-plans', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<FeePlan>(r),
    ),
  update: (id: string, data: Partial<CreateFeePlanInput>) =>
    authFetch(`/finance/fee-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then(
      (r) => json<FeePlan>(r),
    ),
};
