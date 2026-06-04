import { Injectable } from '@nestjs/common';
import { RoleScope } from '@prisma/client';
import {
  type RoleKey,
  type Permission,
  SCHOOL_ROLES,
  PLATFORM_ROLES,
  permissionsForRole,
} from '@munaxa/domain';
import type { TxClient } from '../../prisma/tenant.helpers';

/**
 * RBAC reads and provisioning. The authoritative role→permission baseline lives in
 * @munaxa/domain (DEFAULT_ROLE_PERMISSIONS) and is materialized into the database here.
 */
@Injectable()
export class RbacService {
  /** Load the roles and effective permissions for a user (deduplicated). */
  async loadUserAuthz(
    tx: TxClient,
    userId: string,
  ): Promise<{ roles: RoleKey[]; permissions: Permission[] }> {
    const assignments = await tx.userRole.findMany({
      where: { userId },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    const roles = new Set<RoleKey>();
    const permissions = new Set<Permission>();
    for (const assignment of assignments) {
      roles.add(assignment.role.key);
      for (const rp of assignment.role.rolePermissions) {
        permissions.add(rp.permission.key as Permission);
      }
    }
    return { roles: [...roles], permissions: [...permissions] };
  }

  /**
   * Seed the system roles (and their permission mappings) for a tenant, idempotently.
   * Used during tenant provisioning (Phase 4) and in tests. Permissions must already
   * exist in the global catalog (seeded in Phase 2).
   */
  async provisionTenantRoles(tx: TxClient, tenantId: string): Promise<void> {
    await this.provisionRoles(tx, tenantId, SCHOOL_ROLES, RoleScope.SCHOOL);
  }

  /** Seed the platform-plane system roles (tenantId = null). */
  async provisionPlatformRoles(tx: TxClient): Promise<void> {
    await this.provisionRoles(tx, null, PLATFORM_ROLES, RoleScope.PLATFORM);
  }

  private async provisionRoles(
    tx: TxClient,
    tenantId: string | null,
    roleKeys: readonly RoleKey[],
    scope: RoleScope,
  ): Promise<void> {
    for (const key of roleKeys) {
      // findFirst/create rather than upsert: the (tenantId, key) unique has a nullable
      // tenantId (platform roles), which Prisma's compound-unique where cannot express.
      const role =
        (await tx.role.findFirst({ where: { tenantId, key } })) ??
        (await tx.role.create({ data: { tenantId, key, scope, isSystem: true } }));

      const permissionKeys = permissionsForRole(key);
      const permissions = await tx.permission.findMany({
        where: { key: { in: permissionKeys } },
        select: { id: true },
      });
      for (const permission of permissions) {
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }

  /** Grant a role (by key) to a user within a tenant. */
  async assignRole(tx: TxClient, tenantId: string, userId: string, key: RoleKey): Promise<void> {
    const role = await tx.role.findUniqueOrThrow({ where: { tenantId_key: { tenantId, key } } });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { tenantId, userId, roleId: role.id },
    });
  }
}
