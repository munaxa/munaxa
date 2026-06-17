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
  sectionId?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  enrollmentDate?: string | null;
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

export interface StudentVaccine {
  id: string;
  studentId: string;
  name: string;
  grade?: string | null;
  received: boolean;
  dateGiven?: string | null;
  notes?: string | null;
}

export interface UpsertVaccineInput {
  name: string;
  grade?: string;
  received?: boolean;
  dateGiven?: string;
  notes?: string;
}

export interface UpdateStudentInput {
  firstNameEn?: string;
  lastNameEn?: string;
  firstNameAr?: string;
  lastNameAr?: string;
  fatherNameEn?: string;
  fatherNameAr?: string;
  thirdNameEn?: string;
  thirdNameAr?: string;
  nationalId?: string;
  moeStudentNumber?: string;
  status?: string;
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
  update: (id: string, data: UpdateStudentInput) =>
    authFetch(`/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) =>
      json<Student>(r),
    ),
  remove: (id: string) => del(`/students/${id}`),

  // ----- Parents -----------------------------------------------------------
  parents: (studentId: string) =>
    authFetch(`/students/${studentId}/parents`).then((r) => json<StudentParentLink[]>(r)),

  // ----- Vaccines ----------------------------------------------------------
  vaccines: (studentId: string) =>
    authFetch(`/students/${studentId}/vaccines`).then((r) => json<StudentVaccine[]>(r)),
  addVaccine: (studentId: string, data: UpsertVaccineInput) =>
    authFetch(`/students/${studentId}/vaccines`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json<StudentVaccine>(r)),
  updateVaccine: (studentId: string, vaccineId: string, data: Partial<UpsertVaccineInput>) =>
    authFetch(`/students/${studentId}/vaccines/${vaccineId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then((r) => json<StudentVaccine>(r)),
  removeVaccine: (studentId: string, vaccineId: string) =>
    del(`/students/${studentId}/vaccines/${vaccineId}`),
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

export interface UpdateParentInput {
  firstNameEn?: string;
  lastNameEn?: string;
  firstNameAr?: string;
  lastNameAr?: string;
  phone?: string;
  nationalId?: string;
  occupation?: string;
}

/** A parent linked to a student, with the relation/primary flag from the join. */
export interface StudentParentLink {
  id: string;
  relation: string;
  isPrimary: boolean;
  parent: Parent;
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
  update: (id: string, data: UpdateParentInput) =>
    authFetch(`/parents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) =>
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
  createdAt?: string | null;
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

export interface UpdateEmployeeInput {
  firstNameEn?: string;
  lastNameEn?: string;
  firstNameAr?: string;
  lastNameAr?: string;
  jobTitle?: string;
  department?: string;
  status?: EmploymentStatus;
}

export const employeesApi = {
  list: () => authFetch('/employees').then((r) => json<Employee[]>(r)),
  create: (data: CreateEmployeeInput) =>
    authFetch('/employees', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Employee>(r),
    ),
  update: (id: string, data: UpdateEmployeeInput) =>
    authFetch(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) =>
      json<Employee>(r),
    ),
  remove: (id: string) => del(`/employees/${id}`),
};
