'use client';

import { authFetch } from './auth';

export interface AttendanceRecord {
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}

export interface AttendanceSummary {
  date: string;
  periodIndex: number;
  counts: { PRESENT: number; ABSENT: number; LATE: number; EXCUSED: number };
  total: number;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const attendanceApi = {
  mark: (sectionId: string, date: string, periodIndex: number, records: AttendanceRecord[]) =>
    authFetch('/attendance/students/bulk', {
      method: 'POST',
      body: JSON.stringify({ sectionId, date, periodIndex, records }),
    }).then((r) => json<{ marked: number }>(r)),
  summary: (sectionId: string, date: string, periodIndex = 0) =>
    authFetch(
      `/attendance/students/summary?sectionId=${sectionId}&date=${date}&periodIndex=${periodIndex}`,
    ).then((r) => json<AttendanceSummary>(r)),
};
