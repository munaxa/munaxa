'use client';

import { authFetch } from './auth';

export interface ResolvedPeriod {
  periodIndex: number;
  startTime: string;
  endTime: string;
  subject: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'SUBSTITUTED' | 'REPLACED';
  note?: string | null;
}

export interface ResolvedDay {
  scheduleType: 'REGULAR' | 'RAMADAN';
  dayOfWeek: string;
  isHoliday: boolean;
  periods: ResolvedPeriod[];
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const timetableApi = {
  day: (sectionId: string, date: string) =>
    authFetch(`/timetable/sections/${sectionId}/day?date=${encodeURIComponent(date)}`).then((r) =>
      json<ResolvedDay>(r),
    ),
};
