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
  // Campus presence + transportation (Phase 21)
  PRESENCE_CREATE: 'presence:create',
  PRESENCE_READ: 'presence:read',
  TRANSPORT_CREATE: 'transport:create',
  TRANSPORT_READ: 'transport:read',
  ATTENDANCE_CONFIGURE: 'attendance:configure',
  CARD_MANAGE: 'card:manage',
  CARD_READ: 'card:read',
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
  // Admissions / enrollment (Phase 22)
  ENROLLMENT_MANAGE: 'enrollment:manage',
  FEE_OVERRIDE: 'fee:override',
  FINANCE_APPROVE: 'finance:approve',

  // Communication
  ANNOUNCEMENT_MANAGE: 'announcement:manage',
  ANNOUNCEMENT_READ: 'announcement:read',
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_SETTINGS: 'notification:settings',

  // Parent/student flows
  LEAVE_REQUEST: 'leave:request',
  LEAVE_APPROVE: 'leave:approve',
  PTM_BOOK: 'ptm:book',
  PTM_MANAGE: 'ptm:manage',
  DOCUMENT_MANAGE: 'document:manage',

  // Student app (resources & gamification)
  RESOURCE_READ: 'resource:read',
  RESOURCE_MANAGE: 'resource:manage',
  ACHIEVEMENT_READ: 'achievement:read',
  ACHIEVEMENT_MANAGE: 'achievement:manage',
  GAMIFICATION_READ: 'gamification:read',

  // Advanced modules (feature-flagged, disabled by default)
  BUS_MANAGE: 'bus:manage',
  // Assign students to routes/stops without being able to reconfigure routes or buses.
  BUS_ASSIGN: 'bus:assign',
  BUS_READ: 'bus:read',
  LIBRARY_MANAGE: 'library:manage',
  LIBRARY_READ: 'library:read',
  INVENTORY_MANAGE: 'inventory:manage',
  INVENTORY_READ: 'inventory:read',
  CLINIC_MANAGE: 'clinic:manage',
  CLINIC_READ: 'clinic:read',

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
