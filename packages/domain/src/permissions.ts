/**
 * Permission catalog (resource:action). Extended phase-by-phase.
 * The authoritative role→permission mapping is seeded in the database (Phase 3),
 * but the catalog keys live here as the single source of truth for type-safety.
 */
export const Permission = {
  // Tenancy & structure
  TENANT_MANAGE: 'tenant:manage',
  SCHOOL_MANAGE: 'school:manage',
  CAMPUS_MANAGE: 'campus:manage',
  ACADEMICYEAR_MANAGE: 'academicyear:manage',
  GRADE_MANAGE: 'grade:manage',
  SECTION_MANAGE: 'section:manage',
  CLASSROOM_MANAGE: 'classroom:manage',

  // IAM
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',

  // People
  STUDENT_MANAGE: 'student:manage',
  PARENT_MANAGE: 'parent:manage',
  TEACHER_MANAGE: 'teacher:manage',
  EMPLOYEE_MANAGE: 'employee:manage',

  // Operations
  TIMETABLE_MANAGE: 'timetable:manage',
  TIMETABLE_READ: 'timetable:read',
  ATTENDANCE_CREATE: 'attendance:create',
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_EXPORT: 'attendance:export',
  HOMEWORK_MANAGE: 'homework:manage',
  HOMEWORK_READ: 'homework:read',
  BEHAVIOR_MANAGE: 'behavior:manage',
  BEHAVIOR_READ: 'behavior:read',
  GRADE_IMPORT: 'grade:import',
  GRADE_READ: 'grade:read',

  // Finance
  FINANCE_MANAGE: 'finance:manage',
  FINANCE_READ: 'finance:read',
  FINANCE_EXPORT: 'finance:export',
  TRANSACTION_CREATE: 'transaction:create',
  RECEIPT_UPLOAD: 'receipt:upload',

  // Communication
  ANNOUNCEMENT_MANAGE: 'announcement:manage',
  ANNOUNCEMENT_READ: 'announcement:read',
  NOTIFICATION_SEND: 'notification:send',

  // Parent/student flows
  LEAVE_REQUEST: 'leave:request',
  LEAVE_APPROVE: 'leave:approve',
  PTM_BOOK: 'ptm:book',
  PTM_MANAGE: 'ptm:manage',
  DOCUMENT_MANAGE: 'document:manage',

  // Reporting & config
  REPORT_READ: 'report:read',
  REPORT_EXPORT: 'report:export',
  FEATUREFLAG_MANAGE: 'featureflag:manage',
  AUDIT_READ: 'audit:read',

  // Platform
  PLATFORM_TENANT_MANAGE: 'platform:tenant:manage',
  SUPPORT_IMPERSONATE: 'support:impersonate',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);
