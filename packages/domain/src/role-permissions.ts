import type { RoleKey } from './roles.js';
import { Permission, ALL_PERMISSIONS } from './permissions.js';

/**
 * Default role → permission mapping (the system RBAC baseline), derived from the RBAC matrix
 * in docs/architecture/05-rbac-matrix.md. Seeded per tenant during provisioning (Phase 4) and
 * for platform-plane roles during platform setup. `'*'` means "all permissions".
 *
 * Scoped (row-level) restrictions for roles like Teacher/Parent/Student (e.g. only their own
 * sections/children) are enforced in the service/repository layer, not by the permission set.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, Permission[] | '*'> = {
  // Platform plane
  PlatformOwner: '*',
  PlatformAdmin: [
    Permission.PLATFORM_TENANT_MANAGE,
    Permission.SUPPORT_IMPERSONATE,
    Permission.AUDIT_READ,
    Permission.FEATUREFLAG_MANAGE,
  ],
  SupportAgent: [Permission.SUPPORT_IMPERSONATE, Permission.AUDIT_READ],

  // School plane
  SchoolAdmin: '*',
  Principal: [
    Permission.SCHOOL_MANAGE,
    Permission.CAMPUS_MANAGE,
    Permission.ACADEMICYEAR_MANAGE,
    Permission.GRADE_MANAGE,
    Permission.SECTION_MANAGE,
    Permission.CLASSROOM_MANAGE,
    Permission.TIMETABLE_READ,
    Permission.ATTENDANCE_READ,
    Permission.HOMEWORK_READ,
    Permission.BEHAVIOR_MANAGE,
    Permission.GRADE_READ,
    Permission.ANNOUNCEMENT_MANAGE,
    Permission.NOTIFICATION_SEND,
    Permission.LEAVE_APPROVE,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.AUDIT_READ,
    Permission.FINANCE_READ,
  ],
  VicePrincipal: [
    Permission.TIMETABLE_MANAGE,
    Permission.ATTENDANCE_CREATE,
    Permission.ATTENDANCE_READ,
    Permission.BEHAVIOR_MANAGE,
    Permission.HOMEWORK_READ,
    Permission.GRADE_READ,
    Permission.ANNOUNCEMENT_MANAGE,
    Permission.NOTIFICATION_SEND,
    Permission.LEAVE_APPROVE,
    Permission.PTM_MANAGE,
    Permission.REPORT_READ,
  ],
  FinanceOfficer: [
    Permission.FINANCE_MANAGE,
    Permission.FINANCE_READ,
    Permission.FINANCE_EXPORT,
    Permission.TRANSACTION_CREATE,
    Permission.RECEIPT_UPLOAD,
    Permission.REPORT_READ,
    Permission.REPORT_EXPORT,
    Permission.AUDIT_READ,
  ],
  Teacher: [
    Permission.TIMETABLE_READ,
    Permission.ATTENDANCE_CREATE,
    Permission.ATTENDANCE_READ,
    Permission.HOMEWORK_MANAGE,
    Permission.HOMEWORK_READ,
    Permission.BEHAVIOR_MANAGE,
    Permission.GRADE_IMPORT,
    Permission.GRADE_READ,
    Permission.ANNOUNCEMENT_READ,
    Permission.NOTIFICATION_SEND,
    Permission.REPORT_READ,
  ],
  Secretary: [
    Permission.STUDENT_MANAGE,
    Permission.PARENT_MANAGE,
    Permission.DOCUMENT_MANAGE,
    Permission.ATTENDANCE_READ,
    Permission.ANNOUNCEMENT_READ,
    Permission.TIMETABLE_READ,
  ],
  Parent: [
    Permission.ATTENDANCE_READ,
    Permission.HOMEWORK_READ,
    Permission.GRADE_READ,
    Permission.TIMETABLE_READ,
    Permission.ANNOUNCEMENT_READ,
    Permission.RECEIPT_UPLOAD,
    Permission.FINANCE_READ,
    Permission.LEAVE_REQUEST,
    Permission.PTM_BOOK,
    Permission.DOCUMENT_MANAGE,
  ],
  Student: [
    Permission.ATTENDANCE_READ,
    Permission.HOMEWORK_READ,
    Permission.GRADE_READ,
    Permission.TIMETABLE_READ,
    Permission.ANNOUNCEMENT_READ,
  ],
};

/** Resolve the concrete permission set for a role (expanding `'*'`). */
export function permissionsForRole(role: RoleKey): Permission[] {
  const mapped = DEFAULT_ROLE_PERMISSIONS[role];
  return mapped === '*' ? [...ALL_PERMISSIONS] : mapped;
}
