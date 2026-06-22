'use client';

import { authFetch } from './auth';

export interface Transaction {
  id: string;
  amount: string;
  method: string;
  status: string;
  reference?: string | null;
  chargeId?: string | null;
  /** ISO timestamp when the parent was emailed about this settled payment (null = not sent). */
  parentNotifiedAt?: string | null;
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
  dueDate?: string | null;
  /** Scheduled amount for this installment. */
  amount: string;
  /** Amount paid/allocated against it so far. */
  paid: string;
  /** Remaining balance. */
  balance: string;
  status: string;
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
  transportSuspended: boolean;
  transportSuspendedAt: string | null;
  feeModified: boolean;
  customArrangement: boolean;
  snapshot: {
    outstanding: string;
    dueThisMonth: string;
    overdue: string;
    overdueCount: number;
    oldestOverdueDays: number;
    delinquencyLevel: number;
    eligible: boolean;
  };
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

export interface AgingBuckets {
  studentId: string;
  /** Resolved student display name (present on aging-report rows). */
  studentName?: string;
  current: string;
  d1_30: string;
  d31_60: string;
  d61_90: string;
  d90plus: string;
  total: string;
}

export interface AgingReport {
  rows: AgingBuckets[];
  totals: Omit<AgingBuckets, 'studentId' | 'studentName'>;
  collectedPct: string;
}

export interface PushOutstandingInput {
  /** Only balances overdue by more than this many days. */
  minAgeDays?: 30 | 60 | 90;
  /** Only accounts whose total outstanding is ≥ this amount (JOD). */
  minAmount?: string;
  /** Combine the age + amount filters (default ALL). */
  match?: 'ALL' | 'ANY';
  /** Bypass parents' notification preferences (school-enforced finance notice). */
  mandatory?: boolean;
  /** Also email the assigned parent(s) beside the push (default true). */
  email?: boolean;
}

export interface PushOutstandingResult {
  filter: { minAgeDays: number | null; minAmount: string | null; match: 'ALL' | 'ANY' };
  candidates: number;
  matched: number;
  pushed: number;
  skippedLegal: number;
  skippedNoParent: number;
  totalRecipients: number;
  totalEmails: number;
}

export interface TransportEvaluation {
  studentId: string;
  overdueCount: number;
  threshold: number;
  suspended: boolean;
  changed: boolean;
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
  notifyParent: (id: string) =>
    authFetch(`/finance/transactions/${id}/notify-parent`, { method: 'POST' }).then((r) =>
      json<Transaction>(r),
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
  /** Cascade a verified payment across open charges, earliest due first (down payment). */
  allocateFifo: (transactionId: string) =>
    authFetch('/finance/ledger/allocate/fifo', {
      method: 'POST',
      body: JSON.stringify({ transactionId }),
    }).then((r) => json(r)),
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
  /** Push outstanding balances to parents, filtered by overdue age and/or minimum amount. */
  pushOutstanding: (data: PushOutstandingInput) =>
    authFetch('/finance/collections/reminders/push-outstanding', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json<PushOutstandingResult>(r)),

  // Aging / collection effectiveness
  aging: () => authFetch('/finance/collections/aging').then((r) => json<AgingReport>(r)),
  studentAging: (studentId: string) =>
    authFetch(`/finance/collections/students/${studentId}/aging`).then((r) =>
      json<AgingBuckets>(r),
    ),

  // Transport suspension (non-payment)
  evaluateTransport: (studentId: string) =>
    authFetch(`/finance/collections/students/${studentId}/transport/evaluate`, {
      method: 'POST',
    }).then((r) => json<TransportEvaluation>(r)),
  evaluateTransportAll: () =>
    authFetch('/finance/collections/transport/evaluate', { method: 'POST' }).then((r) =>
      json<{ evaluated: number; suspended: number; restored: number }>(r),
    ),
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

// ── Enrollment & billing configuration (Phase 1) ──
export type DiscountType = 'FULL_PAYMENT' | 'SIBLING' | 'SCHOLARSHIP' | 'PROMOTIONAL' | 'MANUAL';
export type DiscountCalc = 'FIXED' | 'PERCENT';
export type TransportDirection = 'NONE' | 'ONE_WAY' | 'TWO_WAY';

export interface GradeFeeSchedule {
  id: string;
  gradeId: string;
  academicYearId: string;
  registrationFee: string;
  tuitionFee: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}
export interface TransportFare {
  id: string;
  academicYearId: string;
  direction: TransportDirection;
  amount: string;
  isActive: boolean;
}
export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountType;
  calc: DiscountCalc;
  value: string;
  maxAmount: string | null;
  appliesToTransport: boolean;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}
export interface BillingPolicy {
  id: string;
  minInstallments: number;
  maxInstallments: number;
  fullPaymentDiscountPct: string;
  suspendTransportAfterOverdue: number;
}

export const feeConfigApi = {
  gradeFees: (academicYearId?: string) =>
    authFetch(
      `/finance/fee-config/grade-fees${academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : ''}`,
    ).then((r) => json<GradeFeeSchedule[]>(r)),
  createGradeFee: (data: {
    gradeId: string;
    academicYearId: string;
    registrationFee: number;
    tuitionFee: number;
    effectiveFrom: string;
    effectiveTo?: string;
  }) =>
    authFetch('/finance/fee-config/grade-fees', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json<GradeFeeSchedule>(r)),
  updateGradeFee: (
    id: string,
    data: Partial<{
      gradeId: string;
      academicYearId: string;
      registrationFee: number;
      tuitionFee: number;
      effectiveFrom: string;
      effectiveTo: string;
      isActive: boolean;
    }>,
  ) =>
    authFetch(`/finance/fee-config/grade-fees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then((r) => json<GradeFeeSchedule>(r)),

  transportFares: (academicYearId?: string) =>
    authFetch(
      `/finance/fee-config/transport-fares${academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : ''}`,
    ).then((r) => json<TransportFare[]>(r)),
  createTransportFare: (data: {
    academicYearId: string;
    direction: TransportDirection;
    amount: number;
  }) =>
    authFetch('/finance/fee-config/transport-fares', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json<TransportFare>(r)),
  updateTransportFare: (
    id: string,
    data: Partial<{
      academicYearId: string;
      direction: TransportDirection;
      amount: number;
      isActive: boolean;
    }>,
  ) =>
    authFetch(`/finance/fee-config/transport-fares/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then((r) => json<TransportFare>(r)),

  discountRules: () =>
    authFetch('/finance/fee-config/discount-rules').then((r) => json<DiscountRule[]>(r)),
  createDiscountRule: (data: {
    name: string;
    type: DiscountType;
    calc: DiscountCalc;
    value: number;
    maxAmount?: number;
    appliesToTransport?: boolean;
  }) =>
    authFetch('/finance/fee-config/discount-rules', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json<DiscountRule>(r)),
  updateDiscountRule: (
    id: string,
    data: Partial<{
      name: string;
      type: DiscountType;
      calc: DiscountCalc;
      value: number;
      maxAmount: number;
      appliesToTransport: boolean;
      isActive: boolean;
    }>,
  ) =>
    authFetch(`/finance/fee-config/discount-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then((r) => json<DiscountRule>(r)),

  policy: () => authFetch('/finance/fee-config/policy').then((r) => json<BillingPolicy | null>(r)),
  upsertPolicy: (data: {
    minInstallments: number;
    maxInstallments: number;
    fullPaymentDiscountPct: number;
    suspendTransportAfterOverdue: number;
  }) =>
    authFetch('/finance/fee-config/policy', {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then((r) => json<BillingPolicy>(r)),
};

// ── Enrollment quote (Phase 2) ──
export interface EnrollmentQuote {
  registrationFee: string;
  tuitionFee: string;
  tuitionDiscount: string;
  transportFee: string;
  total: string;
  fullPayment: boolean;
  installments: number;
  lines: { key: 'registration' | 'tuition' | 'transport' | 'discount'; amount: string }[];
  schedule: { index: number; dueDate: string; amount: string }[];
  warnings: string[];
}

export const enrollmentApi = {
  quote: (data: {
    gradeId: string;
    academicYearId: string;
    transportDirection?: TransportDirection;
    fullPayment?: boolean;
    installments?: number;
    firstDueDate?: string;
  }) =>
    authFetch('/enrollment/quote', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<EnrollmentQuote>(r),
    ),
};
