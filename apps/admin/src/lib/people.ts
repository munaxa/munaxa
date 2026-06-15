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
  bySection: (sectionId: string) =>
    authFetch(`/students?sectionId=${sectionId}`).then((r) => json<Student[]>(r)),
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

// ---------------------------------------------------------------------------
// Staff & guardians (teachers / parents / employees)
// ---------------------------------------------------------------------------

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];

/** DELETE helper — endpoints reply 204 No Content, so there is no body to parse. */
async function del(path: string): Promise<void> {
  const res = await authFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }
}

export interface Teacher {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  employeeNumber?: string | null;
  specialization?: string | null;
  status: EmploymentStatus;
}

export interface CreateTeacherInput {
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  employeeNumber?: string;
  specialization?: string;
  status?: EmploymentStatus;
}

export const teachersApi = {
  list: () => authFetch('/teachers').then((r) => json<Teacher[]>(r)),
  create: (data: CreateTeacherInput) =>
    authFetch('/teachers', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Teacher>(r),
    ),
  remove: (id: string) => del(`/teachers/${id}`),
};

export interface Parent {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  phone?: string | null;
  nationalId?: string | null;
  occupation?: string | null;
}

export interface CreateParentInput {
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  phone?: string;
  nationalId?: string;
  occupation?: string;
}

export const parentsApi = {
  list: (studentId?: string) =>
    authFetch(`/parents${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`).then(
      (r) => json<Parent[]>(r),
    ),
  create: (data: CreateParentInput) =>
    authFetch('/parents', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Parent>(r),
    ),
  remove: (id: string) => del(`/parents/${id}`),
};

export interface Employee {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  jobTitle: string;
  department?: string | null;
  status: EmploymentStatus;
}

export interface CreateEmployeeInput {
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  jobTitle: string;
  department?: string;
  status?: EmploymentStatus;
}

export const employeesApi = {
  list: () => authFetch('/employees').then((r) => json<Employee[]>(r)),
  create: (data: CreateEmployeeInput) =>
    authFetch('/employees', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Employee>(r),
    ),
  remove: (id: string) => del(`/employees/${id}`),
};
