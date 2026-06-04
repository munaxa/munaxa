'use client';

import { authFetch } from './auth';

export interface Student {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  moeStudentNumber?: string | null;
  qrCode: string;
  status: string;
}

export interface ImportResult {
  created: number;
  failed: Array<{ row: number; error: string }>;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const studentsApi = {
  list: () => authFetch('/students').then((r) => json<Student[]>(r)),
  create: (data: {
    firstNameEn: string;
    lastNameEn: string;
    firstNameAr: string;
    lastNameAr: string;
  }) =>
    authFetch('/students', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Student>(r),
    ),
  import: (csv: string) =>
    authFetch('/students/import', { method: 'POST', body: JSON.stringify({ csv }) }).then((r) =>
      json<ImportResult>(r),
    ),
};
