'use client';

import { authFetch } from './auth';

export interface Student {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  // Full Arab/MoE name parts (given · father · grandfather · family).
  fatherNameEn?: string | null;
  fatherNameAr?: string | null;
  thirdNameEn?: string | null;
  thirdNameAr?: string | null;
  nationalId?: string | null;
  moeStudentNumber?: string | null;
  qrCode: string;
  status: string;
}

/** Full English name from its parts: given · father · grandfather · family. */
export function fullNameEn(s: Student): string {
  return [s.firstNameEn, s.fatherNameEn, s.thirdNameEn, s.lastNameEn]
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Full Arabic name from its parts. */
export function fullNameAr(s: Student): string {
  return [s.firstNameAr, s.fatherNameAr, s.thirdNameAr, s.lastNameAr]
    .filter(Boolean)
    .join(' ')
    .trim();
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
  list: (search?: string) =>
    authFetch(`/students${search ? `?search=${encodeURIComponent(search)}` : ''}`).then((r) =>
      json<Student[]>(r),
    ),
  create: (data: {
    firstNameEn: string;
    lastNameEn: string;
    firstNameAr: string;
    lastNameAr: string;
    fatherNameEn?: string;
    fatherNameAr?: string;
    thirdNameEn?: string;
    thirdNameAr?: string;
    nationalId?: string;
    moeStudentNumber?: string;
  }) =>
    authFetch('/students', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Student>(r),
    ),
  import: (csv: string) =>
    authFetch('/students/import', { method: 'POST', body: JSON.stringify({ csv }) }).then((r) =>
      json<ImportResult>(r),
    ),
};
