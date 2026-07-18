'use client';

import { authFetch } from './auth';
import type { BillingCycle, PlanTier, PlanView, SubscriptionStatus } from './subscription';

export interface DashboardMetrics {
  schools: number;
  subscriptions: number;
  pendingUpgradeRequests: number;
  activeTrials: number;
  subscriptionsByStatus: Record<string, number>;
  subscriptionsByTier: Record<string, number>;
  revenue: RevenueView;
}

export interface RevenueView {
  mrr: number;
  arr: number;
  currency: string;
  perTier: Record<string, number>;
}

export interface SchoolRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: { tier: PlanTier; name: string } | null;
  subscriptionStatus: SubscriptionStatus;
  billingCycle: BillingCycle | null;
  renewal: string | null;
  trialEndsAt: string | null;
  students: number;
  campuses: number;
  users: number;
  storageGb: number;
  createdAt: string;
}

export interface SchoolDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  counts: { students: number; campuses: number; users: number };
  subscription: {
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    plan: PlanView;
    coupon: string | null;
  } | null;
  trial: {
    planId: string;
    planName: string;
    endsAt: string;
    convertedAt: string | null;
    expiredAt: string | null;
  } | null;
  billingProfile: Record<string, unknown> | null;
  usage: Array<{ metric: string; value: number }>;
  overrides: Array<{
    key: string;
    enabled: boolean | null;
    limitOverride: number | null;
    reason: string | null;
    expiresAt: string | null;
  }>;
  planChanges: Array<{
    from: string | null;
    to: string;
    toStatus: string | null;
    reason: string | null;
    createdAt: string;
  }>;
  upgradeRequests: Array<{
    id: string;
    status: string;
    requestedPlan: string;
    fromPlan: string | null;
    note: string | null;
    createdAt: string;
  }>;
}

export interface SubscriptionRow {
  id: string;
  tenantId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodEnd: string | null;
  plan: { name: string; tier: PlanTier };
  tenant: { name: string; slug: string; status: string };
}

export interface PlatformUpgradeRequest {
  id: string;
  tenantId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  note: string | null;
  createdAt: string;
  requestedPlan: { name: string; tier: PlanTier };
  fromPlan: { name: string } | null;
  tenant: { name: string; slug: string };
}

export interface AuditRow {
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

const base = '/platform/console';

export const platformConsoleApi = {
  dashboard: () => authFetch(`${base}/dashboard`).then((r) => json<DashboardMetrics>(r)),
  revenue: () => authFetch(`${base}/revenue`).then((r) => json<RevenueView>(r)),
  systemHealth: () =>
    authFetch(`${base}/system-health`).then((r) =>
      json<{ status: string; uptimeSeconds: number; timestamp: string; node: string }>(r),
    ),
  audit: (query: { tenantId?: string; action?: string; take?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][],
    ).toString();
    return authFetch(`${base}/audit${qs ? `?${qs}` : ''}`).then((r) => json<AuditRow[]>(r));
  },

  plans: () => authFetch(`${base}/plans`).then((r) => json<PlanView[]>(r)),

  schools: () => authFetch(`${base}/schools`).then((r) => json<SchoolRow[]>(r)),
  school: (tenantId: string) =>
    authFetch(`${base}/schools/${tenantId}`).then((r) => json<SchoolDetail>(r)),

  subscriptions: () => authFetch(`${base}/subscriptions`).then((r) => json<SubscriptionRow[]>(r)),

  changeSubscription: (
    tenantId: string,
    data: {
      planId: string;
      billingCycle?: BillingCycle;
      status?: SubscriptionStatus;
      reason?: string;
    },
  ) =>
    authFetch(`${base}/schools/${tenantId}/subscription`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json(r)),

  setStatus: (tenantId: string, status: SubscriptionStatus) =>
    authFetch(`${base}/schools/${tenantId}/subscription/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then((r) => json(r)),

  upgradeRequests: (status?: string) =>
    authFetch(`${base}/upgrade-requests${status ? `?status=${status}` : ''}`).then((r) =>
      json<PlatformUpgradeRequest[]>(r),
    ),

  decideUpgradeRequest: (id: string, decision: 'APPROVE' | 'REJECT', decisionNote?: string) =>
    authFetch(`${base}/upgrade-requests/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, ...(decisionNote ? { decisionNote } : {}) }),
    }).then((r) => json(r)),

  startTrial: (tenantId: string, planId: string, days?: number) =>
    authFetch(`${base}/schools/${tenantId}/trial`, {
      method: 'POST',
      body: JSON.stringify({ planId, ...(days ? { days } : {}) }),
    }).then((r) => json(r)),

  setOverride: (
    tenantId: string,
    data: {
      key: string;
      enabled?: boolean;
      limitOverride?: number;
      reason?: string;
      expiresAt?: string;
    },
  ) =>
    authFetch(`${base}/schools/${tenantId}/overrides`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json(r)),

  deleteOverride: (tenantId: string, key: string) =>
    authFetch(`${base}/schools/${tenantId}/overrides/${key}`, { method: 'DELETE' }).then((r) =>
      json(r),
    ),
};
