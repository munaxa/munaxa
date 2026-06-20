'use client';

import { authFetch } from './auth';

export interface DashboardOverview {
  students: number;
  staff: number;
  attendanceToday: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    total: number;
  };
  finance: {
    billed: string;
    discounts: string;
    paid: string;
    outstanding: string;
    collectedThisMonth: string;
  };
  einvoice: { accepted: number; pending: number; rejected: number };
  recentActivity: Array<{
    action: string;
    entityType: string;
    entityId: string | null;
    actorName: string | null;
    actorUsername: string | null;
    actorRole: string | null;
    ip: string | null;
    at: string;
  }>;
}

export const dashboardApi = {
  overview: () =>
    authFetch('/dashboard/overview').then(async (r) => {
      if (!r.ok) throw new Error(`Request failed (${r.status})`);
      return (await r.json()) as DashboardOverview;
    }),
};
