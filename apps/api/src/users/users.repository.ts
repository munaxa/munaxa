import { BadRequestException, Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { TenantRepository } from '../common/tenant.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TenantConnectionManager } from '../prisma/tenant-connection.service';
import type { TxClient } from '../prisma/tenant.helpers';
import { PasswordService } from '../auth/services/password.service';
import { RbacService } from '../auth/services/rbac.service';
import type { CreateUserDto, SetUserRolesDto, UpdateUserDto } from './users.dto';

export interface UserSummary {
  id: string;
  email: string;
  firstNameEn: string | null;
  lastNameEn: string | null;
  firstNameAr: string | null;
  lastNameAr: string | null;
  phone: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  roles: Array<{ id: string; key: string; nameEn: string | null }>;
}

/** Tenant-scoped staff/user administration (RLS-enforced). */
@Injectable()
export class UsersRepository extends TenantRepository {
  constructor(
    prisma: PrismaService,
    connections: TenantConnectionManager,
    private readonly passwords: PasswordService,
    private readonly rbac: RbacService,
  ) {
    super(prisma, connections);
  }

  list(): Promise<UserSummary[]> {
    return this.run(async (tx, tenantId) => {
      const users = await tx.user.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          userRoles: { include: { role: { select: { id: true, key: true, nameEn: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return users.map((u) => this.toSummary(u));
    });
  }

  /** Provision a new account with a one-time temporary password (returned to the admin once). */
  create(dto: CreateUserDto): Promise<{ user: UserSummary; temporaryPassword: string }> {
    return this.run(async (tx, tenantId) => {
      const existing = await tx.user.findFirst({
        where: { tenantId, email: dto.email },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('A user with this email already exists');

      const temporaryPassword = this.passwords.generateTemporary();
      const passwordHash = await this.passwords.hash(temporaryPassword);
      const created = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          firstNameEn: dto.firstNameEn ?? null,
          lastNameEn: dto.lastNameEn ?? null,
          firstNameAr: dto.firstNameAr ?? null,
          lastNameAr: dto.lastNameAr ?? null,
          phone: dto.phone ?? null,
          status: UserStatus.ACTIVE,
          passwordHash,
          mustChangePassword: true,
        },
      });
      await this.rbac.setUserRoles(tx, tenantId, created.id, dto.roleIds);
      await this.writeAudit(tx, tenantId, {
        action: 'user.create',
        entityType: 'User',
        entityId: created.id,
        metadata: { email: dto.email, roleIds: dto.roleIds },
      });
      return { user: await this.loadSummary(tx, tenantId, created.id), temporaryPassword };
    });
  }

  update(id: string, dto: UpdateUserDto): Promise<UserSummary> {
    return this.run(async (tx, tenantId) => {
      await tx.user.findFirstOrThrow({ where: { id, tenantId, deletedAt: null } });
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.firstNameEn !== undefined ? { firstNameEn: dto.firstNameEn } : {}),
          ...(dto.lastNameEn !== undefined ? { lastNameEn: dto.lastNameEn } : {}),
          ...(dto.firstNameAr !== undefined ? { firstNameAr: dto.firstNameAr } : {}),
          ...(dto.lastNameAr !== undefined ? { lastNameAr: dto.lastNameAr } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });
      // A suspended/disabled account should not keep live sessions.
      if (dto.status === UserStatus.SUSPENDED || dto.status === UserStatus.DISABLED) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.writeAudit(tx, tenantId, {
        action: 'user.update',
        entityType: 'User',
        entityId: id,
        metadata: { status: dto.status ?? null },
      });
      return this.loadSummary(tx, tenantId, id);
    });
  }

  setRoles(id: string, dto: SetUserRolesDto): Promise<UserSummary> {
    return this.run(async (tx, tenantId) => {
      await tx.user.findFirstOrThrow({ where: { id, tenantId, deletedAt: null } });
      await this.rbac.setUserRoles(tx, tenantId, id, dto.roleIds);
      await this.writeAudit(tx, tenantId, {
        action: 'user.roles.set',
        entityType: 'User',
        entityId: id,
        metadata: { roleIds: dto.roleIds },
      });
      return this.loadSummary(tx, tenantId, id);
    });
  }

  /** Reset to a fresh temporary password and revoke sessions; returns the new password once. */
  resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    return this.run(async (tx, tenantId) => {
      await tx.user.findFirstOrThrow({ where: { id, tenantId, deletedAt: null } });
      const temporaryPassword = this.passwords.generateTemporary();
      const passwordHash = await this.passwords.hash(temporaryPassword);
      await tx.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true, passwordUpdatedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.writeAudit(tx, tenantId, {
        action: 'user.password.reset',
        entityType: 'User',
        entityId: id,
      });
      return { temporaryPassword };
    });
  }

  private async loadSummary(tx: TxClient, tenantId: string, id: string): Promise<UserSummary> {
    const u = await tx.user.findFirstOrThrow({
      where: { id, tenantId },
      include: {
        userRoles: { include: { role: { select: { id: true, key: true, nameEn: true } } } },
      },
    });
    return this.toSummary(u);
  }

  private toSummary(u: {
    id: string;
    email: string;
    firstNameEn: string | null;
    lastNameEn: string | null;
    firstNameAr: string | null;
    lastNameAr: string | null;
    phone: string | null;
    status: UserStatus;
    mustChangePassword: boolean;
    lastLoginAt: Date | null;
    userRoles: Array<{ role: { id: string; key: string; nameEn: string | null } }>;
  }): UserSummary {
    return {
      id: u.id,
      email: u.email,
      firstNameEn: u.firstNameEn,
      lastNameEn: u.lastNameEn,
      firstNameAr: u.firstNameAr,
      lastNameAr: u.lastNameAr,
      phone: u.phone,
      status: u.status,
      mustChangePassword: u.mustChangePassword,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      roles: u.userRoles.map((ur) => ur.role),
    };
  }
}
