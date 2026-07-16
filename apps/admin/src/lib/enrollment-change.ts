'use client';

import { authFetch } from './auth';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/**
 * Reason-first enrollment placement changes (PR 1 — no ledger changes). Grade/section/classroom live
 * on the Enrollment, never the Student. Promotion/Repeat are Year-End Processing operations.
 */
export const enrollmentChangeApi = {
  // Administrative transfer — different section within the SAME grade.
  transfer: (enrollmentId: string, req: { sectionId: string; reason?: string }) =>
    authFetch(`/enrollments/${enrollmentId}/transfer`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }).then((r) => json<{ enrollmentId: string; transferred: boolean }>(r)),

  // Data-entry grade correction on the current enrollment (warns about fees; no ledger change in PR 1).
  correctGrade: (
    enrollmentId: string,
    req: { gradeId: string; sectionId?: string; reason?: string },
  ) =>
    authFetch(`/enrollments/${enrollmentId}/correct-grade`, {
      method: 'PATCH',
      body: JSON.stringify(req),
    }).then((r) =>
      json<{
        enrollmentId: string;
        corrected: boolean;
        feesMayChange: boolean;
        feeWarning: string | null;
      }>(r),
    ),
};
