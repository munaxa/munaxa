/**
 * Munaxa role definitions. Two planes: Platform (cross-tenant) and School (tenant-scoped).
 * Framework-free — safe to import from API, Admin, and tooling.
 */

export const PlatformRole = {
  PlatformOwner: 'PlatformOwner',
  PlatformAdmin: 'PlatformAdmin',
  SupportAgent: 'SupportAgent',
} as const;
export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

export const SchoolRole = {
  SchoolAdmin: 'SchoolAdmin',
  Principal: 'Principal',
  VicePrincipal: 'VicePrincipal',
  FinanceOfficer: 'FinanceOfficer',
  Teacher: 'Teacher',
  Secretary: 'Secretary',
  Parent: 'Parent',
  Student: 'Student',
} as const;
export type SchoolRole = (typeof SchoolRole)[keyof typeof SchoolRole];

export type Role = PlatformRole | SchoolRole;

export const PLATFORM_ROLES: PlatformRole[] = Object.values(PlatformRole);
export const SCHOOL_ROLES: SchoolRole[] = Object.values(SchoolRole);
export const ALL_ROLES: Role[] = [...PLATFORM_ROLES, ...SCHOOL_ROLES];

export function isPlatformRole(role: string): role is PlatformRole {
  return (PLATFORM_ROLES as string[]).includes(role);
}

export function isSchoolRole(role: string): role is SchoolRole {
  return (SCHOOL_ROLES as string[]).includes(role);
}
