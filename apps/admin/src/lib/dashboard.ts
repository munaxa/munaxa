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
    overdue: string;
    collectedThisMonth: string;
  };
  einvoice: { accepted: number; pending: number; rejected: number };
  /** Daily student-attendance rate for the last 7 days (oldest first). */
  attendanceTrend: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
    excused: number;
    total: number;
    rate: number | null;
  }>;
  /** Active student headcount per grade level (ascending). */
  studentsByGrade: Array<{ level: number; nameEn: string; nameAr: string; students: number }>;
  /** Month-to-date movement, for KPI deltas. */
  deltas: { studentsThisMonth: number; staffThisMonth: number };
  /** New-record counts per month for the last 6 months (oldest first). */
  sparklines: { students: number[]; staff: number[] };
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
