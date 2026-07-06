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
  // Enterprise Document Engine (Phase 23): official document generation & archive.
  DOCUMENT_READ: 'document:read',
  DOCUMENT_GENERATE: 'document:generate',
  // Signed registration-agreement handling (upload the parent's countersigned copy; replace/delete).
  DOCUMENT_UPLOAD_SIGNED: 'document:upload_signed',
  DOCUMENT_REPLACE_SIGNED: 'document:replace_signed',
  DOCUMENT_DELETE_SIGNED: 'document:delete_signed',

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

  // Organization identity & branding (Settings → Organization)
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_UPDATE: 'organization:update',
  ORGANIZATION_BRANDING: 'organization:branding',
  ORGANIZATION_DOCUMENTS: 'organization:documents',
  ORGANIZATION_COMMUNICATION: 'organization:communication',
  ORGANIZATION_COMPLIANCE: 'organization:compliance',
  ORGANIZATION_ADVANCED: 'organization:advanced',

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

/** Human-readable, plain-language explanation of what each permission grants. Shown in the
 * roles & permissions editor (as a hover tooltip) so admins know what they're enabling. */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [Permission.TENANT_MANAGE]: 'Manage tenant-wide settings for the school organization.',
  [Permission.SCHOOL_MANAGE]: 'Create and edit school records.',
  [Permission.CAMPUS_MANAGE]: 'Create and edit campuses.',
  [Permission.ACADEMICYEAR_MANAGE]: 'Create and edit academic years and terms.',
  [Permission.GRADE_MANAGE]: 'Create and edit grade levels.',
  [Permission.SECTION_MANAGE]: 'Create and edit class sections.',
  [Permission.CLASSROOM_MANAGE]: 'Create and edit classrooms.',

  [Permission.USER_MANAGE]: 'Create, edit, and deactivate user accounts.',
  [Permission.ROLE_MANAGE]: 'Create, edit, and delete roles and assign permissions.',

  [Permission.STUDENT_MANAGE]: 'Create and edit student profiles and enrollment records.',
  [Permission.PARENT_MANAGE]: 'Create and edit parent/guardian profiles.',
  [Permission.TEACHER_MANAGE]: 'Create and edit teacher profiles.',
  [Permission.EMPLOYEE_MANAGE]: 'Create and edit staff/employee profiles.',

  [Permission.TIMETABLE_MANAGE]: 'Create and edit class timetables.',
  [Permission.TIMETABLE_READ]: 'View class timetables.',
  [Permission.ATTENDANCE_CREATE]: 'Record student or staff attendance.',
  [Permission.ATTENDANCE_READ]: 'View attendance records and history.',
  [Permission.ATTENDANCE_EXPORT]: 'Export attendance data.',
  [Permission.PRESENCE_CREATE]: 'Record campus presence (check-in/check-out) events.',
  [Permission.PRESENCE_READ]: 'View campus presence records.',
  [Permission.TRANSPORT_CREATE]: 'Record transportation/bus trip events.',
  [Permission.TRANSPORT_READ]: 'View transportation routes and trip records.',
  [Permission.ATTENDANCE_CONFIGURE]: 'Configure attendance rules and policies.',
  [Permission.CARD_MANAGE]: 'Issue and manage student/staff ID cards.',
  [Permission.CARD_READ]: 'View ID card assignments.',
  [Permission.HOMEWORK_MANAGE]: 'Create and edit homework assignments.',
  [Permission.HOMEWORK_READ]: 'View homework assignments.',
  [Permission.BEHAVIOR_MANAGE]: 'Record and edit behavior incidents and notes.',
  [Permission.BEHAVIOR_READ]: 'View behavior incidents and notes.',
  [Permission.GRADE_IMPORT]: 'Bulk-import grades from spreadsheets or other systems.',
  [Permission.GRADE_READ]: 'View student grades.',

  [Permission.FINANCE_MANAGE]: 'Manage fee plans, invoices, and financial configuration.',
  [Permission.FINANCE_READ]: 'View invoices, payments, and outstanding balances.',
  [Permission.FINANCE_EXPORT]: 'Export financial reports and statements.',
  [Permission.TRANSACTION_CREATE]: 'Record payments and other financial transactions.',
  [Permission.RECEIPT_UPLOAD]: 'Upload payment receipts.',
  [Permission.ENROLLMENT_MANAGE]: 'Manage admissions and enrollment applications.',
  [Permission.FEE_OVERRIDE]: 'Override or discount fees on an individual basis.',
  [Permission.FINANCE_APPROVE]: 'Approve financial transactions and adjustments.',

  [Permission.ANNOUNCEMENT_MANAGE]: 'Create, edit, and publish school-wide announcements.',
  [Permission.ANNOUNCEMENT_READ]: 'View announcements.',
  [Permission.NOTIFICATION_SEND]: 'Send notifications to parents, students, or staff.',
  [Permission.NOTIFICATION_SETTINGS]: 'Configure notification preferences and channels.',

  [Permission.LEAVE_REQUEST]: 'Submit leave requests.',
  [Permission.LEAVE_APPROVE]: 'Approve or reject leave requests.',
  [Permission.PTM_BOOK]: 'Book parent-teacher meeting slots.',
  [Permission.PTM_MANAGE]: 'Create and manage parent-teacher meeting schedules.',
  [Permission.DOCUMENT_MANAGE]: 'Upload and manage shared documents.',
  [Permission.DOCUMENT_READ]:
    'View, download and reprint archived official documents (agreements, receipts, certificates, statements).',
  [Permission.DOCUMENT_GENERATE]:
    'Generate official documents (registration agreements, tuition/clearance/balance certificates, statements) and email them.',
  [Permission.DOCUMENT_UPLOAD_SIGNED]:
    "Upload the parent's countersigned registration agreement as the school's legal copy.",
  [Permission.DOCUMENT_REPLACE_SIGNED]:
    'Replace a previously uploaded signed registration agreement (fully audited).',
  [Permission.DOCUMENT_DELETE_SIGNED]:
    'Delete an uploaded signed registration agreement (fully audited).',

  [Permission.RESOURCE_READ]: 'View shared learning resources.',
  [Permission.RESOURCE_MANAGE]: 'Upload and manage shared learning resources.',
  [Permission.ACHIEVEMENT_READ]: 'View student achievements and badges.',
  [Permission.ACHIEVEMENT_MANAGE]: 'Create and award achievements and badges.',
  [Permission.GAMIFICATION_READ]: 'View gamification points and leaderboards.',

  [Permission.BUS_MANAGE]: 'Create and edit bus routes and vehicles.',
  [Permission.BUS_ASSIGN]: 'Assign students to bus routes and stops.',
  [Permission.BUS_READ]: 'View bus routes and assignments.',
  [Permission.LIBRARY_MANAGE]: 'Manage the library catalog and loans.',
  [Permission.LIBRARY_READ]: 'View the library catalog and loan records.',
  [Permission.INVENTORY_MANAGE]: 'Manage inventory items and stock levels.',
  [Permission.INVENTORY_READ]: 'View inventory items and stock levels.',
  [Permission.CLINIC_MANAGE]: 'Record and manage clinic visits and health records.',
  [Permission.CLINIC_READ]: 'View clinic visits and health records.',

  [Permission.ORGANIZATION_READ]:
    'View the school organization profile, branding, and document settings.',
  [Permission.ORGANIZATION_UPDATE]:
    'Edit the school identity, contact, and general organization settings.',
  [Permission.ORGANIZATION_BRANDING]:
    'Manage branding assets (logos, stamp, signature, watermark) and their toggles.',
  [Permission.ORGANIZATION_DOCUMENTS]:
    'Configure printed document layout (header, footer, margins, QR, paper size).',
  [Permission.ORGANIZATION_COMMUNICATION]:
    'Configure organization communication identity (sender, footer, display names).',
  [Permission.ORGANIZATION_COMPLIANCE]:
    'Manage legal and compliance identifiers (registration, license, tax/VAT).',
  [Permission.ORGANIZATION_ADVANCED]:
    'Configure advanced document defaults (language, fonts, quality, optimization).',

  [Permission.REPORT_READ]: 'View reports and dashboards.',
  [Permission.REPORT_EXPORT]: 'Export reports.',
  [Permission.FEATUREFLAG_MANAGE]: 'Enable or disable feature flags for the tenant.',
  [Permission.AUDIT_READ]: 'View the audit log of actions taken in the system.',

  [Permission.PLATFORM_TENANT_MANAGE]: 'Manage tenant accounts at the platform level.',
  [Permission.SUPPORT_IMPERSONATE]: 'Temporarily sign in as another user for support purposes.',
};
