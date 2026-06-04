'use client';

import { authFetch } from './auth';

export interface Homework {
  id: string;
  subject: string;
  title: string;
  dueDate: string;
}

export interface GradeReport {
  studentId: string;
  overallPercent: number;
  subjects: Array<{ subject: string; count: number; averagePercent: number }>;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const academicsApi = {
  homeworkBySection: (sectionId: string) =>
    authFetch(`/homework?sectionId=${sectionId}`).then((r) => json<Homework[]>(r)),
  createHomework: (data: { sectionId: string; subject: string; title: string; dueDate: string }) =>
    authFetch('/homework', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Homework>(r),
    ),
  importGrades: (csv: string) =>
    authFetch('/grade-records/import', { method: 'POST', body: JSON.stringify({ csv }) }).then(
      (r) => json<{ imported: number; failed: Array<{ row: number; error: string }> }>(r),
    ),
  gradeReport: (studentId: string) =>
    authFetch(`/grade-records/students/${studentId}/report`).then((r) => json<GradeReport>(r)),
};
