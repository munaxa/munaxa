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
  /** Internal, school-generated student number (Decision 6) — permanent, distinct from National/MoE. */
  studentNumber?: string | null;
  sectionId?: string | null;
  /** Home area (geographic); set during registration. Drives Fleet's Area Planning. */
  areaId?: string | null;
  /** Whether the parent requested transportation. Feeds the Fleet Unassigned queue. */
  transportRequested?: boolean;
  dateOfBirth?: string | null;
  gender?: string | null;
  enrollmentDate?: string | null;
  qrCode: string;
  status: string;
}

/** One immutable row of a student's Enrollment History (per academic year). */
export interface EnrollmentHistoryRow {
  id: string;
  admissionStatus: string;
  status: string;
  admissionDate: string | null;
  withdrawalDate: string | null;
  graduationDate: string | null;
  reason: string | null;
  grade: { id: string; nameEn: string; nameAr: string } | null;
  section: { id: string; name: string } | null;
  academicYear: { id: string; name: string; startDate: string; status: string } | null;
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
  sectionId?: string;
  areaId?: string;
  transportRequested?: boolean;
  gender?: string;
  dateOfBirth?: string;
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
  /** Load a single student by id — backs the full-page Student Profile header. */
  get: (id: string) => authFetch(`/students/${id}`).then((r) => json<Student>(r)),
  bySection: (sectionId: string) =>
    authFetch(`/students?sectionId=${sectionId}`).then((r) => json<Student[]>(r)),
  // Immutable per-year Enrollment History (year · grade · status · dates).
  enrollmentHistory: (id: string) =>
    authFetch(`/students/${id}/enrollment-history`).then((r) => json<EnrollmentHistoryRow[]>(r)),
  // Whether the student can be hard-deleted (else the UI offers Withdraw / Cancel Admission).
  deletability: (id: string) =>
    authFetch(`/students/${id}/deletability`).then((r) =>
      json<{ deletable: boolean; blockers: string[] }>(r),
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
    sectionId?: string;
    gender?: string;
    dateOfBirth?: string;
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
  linkParent: (
    studentId: string,
    data: { parentId: string; relation: string; isPrimary?: boolean },
  ) =>
    authFetch(`/students/${studentId}/parents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((r) => json(r)),
  unlinkParent: (studentId: string, parentId: string) =>
    del(`/students/${studentId}/parents/${parentId}`),

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

/** Full employee lifecycle (mirrors the Prisma EmploymentStatus enum). */
export type EmploymentStatus =
  | 'CANDIDATE'
  | 'INTERVIEW'
  | 'OFFER_SENT'
  | 'BACKGROUND_CHECK'
  | 'OFFER_ACCEPTED'
  | 'HIRED'
  | 'PROBATION'
  | 'ACTIVE'
  | 'TRANSFERRED'
  | 'PROMOTION'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'RETIRED'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'ARCHIVED';

/** The three basic statuses used by Teacher records and simple pickers. */
export const EMPLOYMENT_STATUSES: EmploymentStatus[] = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];

/** Every lifecycle status, in canonical order (badges, filters, timelines). */
export const EMPLOYEE_STATUSES: EmploymentStatus[] = [
  'CANDIDATE',
  'INTERVIEW',
  'OFFER_SENT',
  'BACKGROUND_CHECK',
  'OFFER_ACCEPTED',
  'HIRED',
  'PROBATION',
  'ACTIVE',
  'TRANSFERRED',
  'PROMOTION',
  'ON_LEAVE',
  'SUSPENDED',
  'RETIRED',
  'RESIGNED',
  'TERMINATED',
  'ARCHIVED',
];

/** Statuses an employee may be created at directly (mirrors the server state machine). */
export const EMPLOYEE_ENTRY_STATUSES: EmploymentStatus[] = [
  'CANDIDATE',
  'HIRED',
  'PROBATION',
  'ACTIVE',
];

/**
 * Allowed single-step transitions per status — a client mirror of the server state machine
 * (apps/api/.../employee-lifecycle.logic.ts) used only to constrain the status picker. The server
 * remains the source of truth and re-validates every transition.
 */
export const EMPLOYEE_STATUS_TRANSITIONS: Record<EmploymentStatus, EmploymentStatus[]> = {
  CANDIDATE: ['INTERVIEW', 'ARCHIVED'],
  INTERVIEW: ['OFFER_SENT', 'ARCHIVED'],
  OFFER_SENT: ['OFFER_ACCEPTED', 'BACKGROUND_CHECK', 'ARCHIVED'],
  OFFER_ACCEPTED: ['BACKGROUND_CHECK', 'HIRED', 'ARCHIVED'],
  BACKGROUND_CHECK: ['HIRED', 'ARCHIVED'],
  HIRED: ['PROBATION', 'ACTIVE'],
  PROBATION: ['ACTIVE', 'TERMINATED', 'RESIGNED'],
  ACTIVE: [
    'ON_LEAVE',
    'SUSPENDED',
    'TRANSFERRED',
    'PROMOTION',
    'RESIGNED',
    'RETIRED',
    'TERMINATED',
  ],
  TRANSFERRED: ['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED'],
  PROMOTION: ['ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED'],
  ON_LEAVE: ['ACTIVE', 'SUSPENDED', 'RESIGNED', 'RETIRED', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'TERMINATED', 'RESIGNED'],
  RETIRED: ['ARCHIVED'],
  RESIGNED: ['ARCHIVED'],
  TERMINATED: ['ARCHIVED'],
  ARCHIVED: [],
};

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'HOURLY'
  | 'SEASONAL'
  | 'CONSULTANT'
  | 'SUBSTITUTE'
  | 'INTERN'
  | 'VOLUNTEER';

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'HOURLY',
  'SEASONAL',
  'CONSULTANT',
  'SUBSTITUTE',
  'INTERN',
  'VOLUNTEER',
];

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER';
export const MARITAL_STATUSES: MaritalStatus[] = [
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'OTHER',
];

export type Gender = 'MALE' | 'FEMALE';

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
  phoneAlt?: string | null;
  email?: string | null;
  nationalId?: string | null;
  occupation?: string | null;
}

export interface CreateParentInput {
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  nationalId?: string;
  occupation?: string;
}

export interface UpdateParentInput {
  firstNameEn?: string;
  lastNameEn?: string;
  firstNameAr?: string;
  lastNameAr?: string;
  phone?: string;
  phoneAlt?: string;
  email?: string;
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

export interface DepartmentRef {
  id: string;
  name: string;
}
export interface PositionRef {
  id: string;
  title: string;
}
export interface CampusRef {
  id: string;
  nameEn: string;
  nameAr: string;
}
export interface EmployeeManagerRef {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
}
export interface EmployeeTeacherRef {
  id: string;
  specialization?: string | null;
}

/** One lifecycle transition in an employee's status timeline. */
export interface EmployeeStatusRow {
  id: string;
  fromStatus: EmploymentStatus | null;
  toStatus: EmploymentStatus;
  reason?: string | null;
  effectiveDate?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    firstNameEn?: string | null;
    lastNameEn?: string | null;
    email?: string | null;
  } | null;
}

export interface Employee {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  jobTitle: string;
  employeeNumber?: string | null;
  nationalId?: string | null;
  passportNumber?: string | null;
  nationality?: string | null;
  visaNumber?: string | null;
  visaExpiry?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  maritalStatus?: MaritalStatus | null;
  religion?: string | null;
  personalEmail?: string | null;
  personalPhone?: string | null;
  photoUrl?: string | null;
  employmentType?: EmploymentType | null;
  status: EmploymentStatus;
  hireDate?: string | null;
  probationEndDate?: string | null;
  terminationDate?: string | null;
  workingHoursPerWeek?: string | number | null;
  campusId?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  managerId?: string | null;
  department?: DepartmentRef | null;
  position?: PositionRef | null;
  campus?: CampusRef | null;
  manager?: EmployeeManagerRef | null;
  teacher?: EmployeeTeacherRef | null;
  statusHistory?: EmployeeStatusRow[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateEmployeeInput {
  firstNameEn: string;
  lastNameEn: string;
  firstNameAr: string;
  lastNameAr: string;
  jobTitle: string;
  employeeNumber?: string;
  nationalId?: string;
  passportNumber?: string;
  nationality?: string;
  visaNumber?: string;
  visaExpiry?: string;
  gender?: Gender;
  dateOfBirth?: string;
  maritalStatus?: MaritalStatus;
  religion?: string;
  personalEmail?: string;
  personalPhone?: string;
  employmentType?: EmploymentType;
  status?: EmploymentStatus;
  hireDate?: string;
  probationEndDate?: string;
  workingHoursPerWeek?: number;
  campusId?: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
}

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, 'status'>>;

export interface EmployeeListFilters {
  q?: string;
  status?: EmploymentStatus;
  departmentId?: string;
  campusId?: string;
  positionId?: string;
  includeInactive?: boolean;
}

export interface TransitionStatusInput {
  toStatus: EmploymentStatus;
  reason?: string;
  effectiveDate?: string;
}

function employeeQuery(filters?: EmployeeListFilters): string {
  if (!filters) return '';
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.status) p.set('status', filters.status);
  if (filters.departmentId) p.set('departmentId', filters.departmentId);
  if (filters.campusId) p.set('campusId', filters.campusId);
  if (filters.positionId) p.set('positionId', filters.positionId);
  if (filters.includeInactive) p.set('includeInactive', 'true');
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

export const employeesApi = {
  list: (filters?: EmployeeListFilters) =>
    authFetch(`/employees${employeeQuery(filters)}`).then((r) => json<Employee[]>(r)),
  get: (id: string) => authFetch(`/employees/${id}`).then((r) => json<Employee>(r)),
  create: (data: CreateEmployeeInput) =>
    authFetch('/employees', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Employee>(r),
    ),
  update: (id: string, data: UpdateEmployeeInput) =>
    authFetch(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) =>
      json<Employee>(r),
    ),
  transitionStatus: (id: string, data: TransitionStatusInput) =>
    authFetch(`/employees/${id}/status`, { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Employee>(r),
    ),
  statusHistory: (id: string) =>
    authFetch(`/employees/${id}/status-history`).then((r) => json<EmployeeStatusRow[]>(r)),
  remove: (id: string) => del(`/employees/${id}`),
};

// ---------------------------------------------------------------------------
// Organisation engine (departments & positions)
// ---------------------------------------------------------------------------

export interface Department {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  campusId?: string | null;
  parentId?: string | null;
  headEmployeeId?: string | null;
  isActive: boolean;
  headcount?: number;
  campus?: CampusRef | null;
  parent?: DepartmentRef | null;
  head?: EmployeeManagerRef | null;
}

export interface CreateDepartmentInput {
  name: string;
  code?: string;
  description?: string;
  campusId?: string;
  parentId?: string;
  headEmployeeId?: string;
  isActive?: boolean;
}
export type UpdateDepartmentInput = Partial<CreateDepartmentInput>;

export interface Position {
  id: string;
  title: string;
  code?: string | null;
  description?: string | null;
  departmentId?: string | null;
  budgetedHeadcount?: number | null;
  isActive: boolean;
  filled?: number;
  vacancies?: number | null;
  department?: DepartmentRef | null;
}

export interface CreatePositionInput {
  title: string;
  code?: string;
  description?: string;
  departmentId?: string;
  budgetedHeadcount?: number;
  isActive?: boolean;
}
export type UpdatePositionInput = Partial<CreatePositionInput>;

export const departmentsApi = {
  list: () => authFetch('/hr/departments').then((r) => json<Department[]>(r)),
  create: (data: CreateDepartmentInput) =>
    authFetch('/hr/departments', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Department>(r),
    ),
  update: (id: string, data: UpdateDepartmentInput) =>
    authFetch(`/hr/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) =>
      json<Department>(r),
    ),
  remove: (id: string) => del(`/hr/departments/${id}`),
};

export const positionsApi = {
  list: () => authFetch('/hr/positions').then((r) => json<Position[]>(r)),
  create: (data: CreatePositionInput) =>
    authFetch('/hr/positions', { method: 'POST', body: JSON.stringify(data) }).then((r) =>
      json<Position>(r),
    ),
  update: (id: string, data: UpdatePositionInput) =>
    authFetch(`/hr/positions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }).then((r) =>
      json<Position>(r),
    ),
  remove: (id: string) => del(`/hr/positions/${id}`),
};
