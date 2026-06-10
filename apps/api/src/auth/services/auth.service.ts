import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { User, Prisma } from '@prisma/client';
import { UserStatus } from '@prisma/client';
import { isPlatformRole } from '@munaxa/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { withPlatform, type TxClient } from '../../prisma/tenant.helpers';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { FirebaseService } from './firebase.service';
import { RbacService } from './rbac.service';
import type { AuthenticatedUser, TokenPair } from '../auth.types';
import type {
  LoginDto,
  SessionExchangeDto,
  ChangePasswordDto,
  RequestPasswordResetDto,
  ConfirmPasswordResetDto,
} from '../dto/auth.dto';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface LoginResult {
  tokens: TokenPair;
  mustChangePassword: boolean;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly passwords: PasswordService,
    private readonly firebase: FirebaseService,
    private readonly rbac: RbacService,
  ) {}

  // ----- Local login -------------------------------------------------------
  async login(dto: LoginDto, meta: RequestMeta): Promise<LoginResult> {
    // The transaction returns an outcome rather than throwing, so that failure audit logs
    // are COMMITTED. The HTTP error is raised afterwards, outside the transaction.
    const outcome = await withPlatform(this.prisma, async (tx) => {
      const user = await this.resolveUserByEmail(tx, dto.email, dto.tenantSlug);
      if (!user || !user.passwordHash) {
        await this.audit(tx, null, null, 'auth.login.failed', { email: dto.email }, meta);
        return { kind: 'invalid' as const };
      }
      const ok = await this.passwords.verify(dto.password, user.passwordHash);
      if (!ok) {
        await this.audit(tx, user.tenantId, user.id, 'auth.login.failed', {}, meta);
        return { kind: 'invalid' as const };
      }
      const blocked = this.loginBlockReason(user);
      if (blocked) {
        await this.audit(tx, user.tenantId, user.id, 'auth.login.blocked', { blocked }, meta);
        return { kind: 'blocked' as const, message: blocked };
      }

      const principal = await this.buildPrincipal(tx, user);
      const tokens = await this.issueTokens(tx, principal, meta);
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await this.audit(tx, user.tenantId, user.id, 'auth.login.success', {}, meta);
      return {
        kind: 'ok' as const,
        result: { tokens, mustChangePassword: user.mustChangePassword, user: principal },
      };
    });

    if (outcome.kind === 'invalid') throw new UnauthorizedException('Invalid credentials');
    if (outcome.kind === 'blocked') throw new ForbiddenException(outcome.message);
    return outcome.result;
  }

  // ----- Firebase session exchange ----------------------------------------
  async exchangeFirebaseSession(dto: SessionExchangeDto, meta: RequestMeta): Promise<LoginResult> {
    const identity = await this.firebase.verifyIdToken(dto.firebaseIdToken);
    return withPlatform(this.prisma, async (tx) => {
      let user = await tx.user.findFirst({ where: { firebaseUid: identity.uid } });
      if (!user && identity.email) {
        user = await this.resolveUserByEmail(tx, identity.email, dto.tenantSlug);
        if (user) {
          user = await tx.user.update({
            where: { id: user.id },
            data: { firebaseUid: identity.uid },
          });
        }
      }
      if (!user) {
        throw new UnauthorizedException('No Munaxa account is linked to this identity');
      }
      const blocked = this.loginBlockReason(user);
      if (blocked) throw new ForbiddenException(blocked);

      const principal = await this.buildPrincipal(tx, user);
      const tokens = await this.issueTokens(tx, principal, meta);
      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await this.audit(tx, user.tenantId, user.id, 'auth.session.exchange', {}, meta);
      return { tokens, mustChangePassword: user.mustChangePassword, user: principal };
    });
  }

  // ----- Refresh (rotation + reuse detection) ------------------------------
  async refresh(refreshToken: string, meta: RequestMeta): Promise<TokenPair> {
    const hash = this.tokens.hashRefreshToken(refreshToken);
    // Outcome pattern again: reuse-detection family revocation must COMMIT before we reject.
    const outcome = await withPlatform(this.prisma, async (tx) => {
      const existing = await tx.refreshToken.findUnique({ where: { tokenHash: hash } });
      if (!existing) return { kind: 'invalid' as const };

      // Reuse of an already-rotated/revoked token → compromise: revoke the whole family.
      if (existing.revokedAt) {
        await tx.refreshToken.updateMany({
          where: { familyId: existing.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.audit(tx, existing.tenantId, existing.userId, 'auth.refresh.reuse', {}, meta);
        return { kind: 'reuse' as const };
      }
      if (existing.expiresAt.getTime() < Date.now()) return { kind: 'expired' as const };

      const user = await tx.user.findUniqueOrThrow({ where: { id: existing.userId } });
      const blocked = this.loginBlockReason(user);
      if (blocked) return { kind: 'blocked' as const, message: blocked };
      const principal = await this.buildPrincipal(tx, user);

      // Rotate within the same family.
      const rotated = await this.persistRefreshToken(tx, principal, meta, existing.familyId);
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date(), replacedByTokenId: rotated.row.id },
      });
      const access = this.tokens.signAccessToken(principal);
      return {
        kind: 'ok' as const,
        pair: {
          accessToken: access.token,
          refreshToken: rotated.raw,
          expiresIn: access.expiresIn,
        },
      };
    });

    switch (outcome.kind) {
      case 'invalid':
        throw new UnauthorizedException('Invalid refresh token');
      case 'reuse':
        throw new UnauthorizedException('Refresh token reuse detected');
      case 'expired':
        throw new UnauthorizedException('Refresh token expired');
      case 'blocked':
        throw new ForbiddenException(outcome.message);
      case 'ok':
        return outcome.pair;
    }
  }

  // ----- Logout ------------------------------------------------------------
  async logout(refreshToken: string): Promise<void> {
    const hash = this.tokens.hashRefreshToken(refreshToken);
    await withPlatform(this.prisma, async (tx) => {
      const token = await tx.refreshToken.findUnique({ where: { tokenHash: hash } });
      if (token && !token.revokedAt) {
        // Revoke the entire family so all derived sessions end.
        await tx.refreshToken.updateMany({
          where: { familyId: token.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });
  }

  // ----- Change password (incl. first-login) -------------------------------
  async changePassword(
    userId: string,
    tenantId: string,
    dto: ChangePasswordDto,
    meta: RequestMeta,
  ): Promise<void> {
    this.passwords.assertStrong(dto.newPassword);
    await withPlatform(this.prisma, async (tx) => {
      const user = await tx.user.findFirstOrThrow({ where: { id: userId, tenantId } });
      if (
        !user.passwordHash ||
        !(await this.passwords.verify(dto.currentPassword, user.passwordHash))
      ) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      const passwordHash = await this.passwords.hash(dto.newPassword);
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false, passwordUpdatedAt: new Date() },
      });
      // Invalidate all existing sessions on password change.
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit(tx, tenantId, user.id, 'auth.password.change', {}, meta);
    });
  }

  // ----- Password reset (request + confirm) --------------------------------
  async requestPasswordReset(dto: RequestPasswordResetDto, meta: RequestMeta): Promise<void> {
    await withPlatform(this.prisma, async (tx) => {
      const user = await this.resolveUserByEmail(tx, dto.email, dto.tenantSlug);
      if (!user) return; // do not reveal account existence
      const { token, hash } = this.tokens.generateRefreshToken();
      await tx.passwordResetToken.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });
      await this.audit(tx, user.tenantId, user.id, 'auth.password.reset.request', {}, meta);
      // The raw `token` is delivered out-of-band via Resend (Phase 10). It is never returned here.
      void token;
    });
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto, meta: RequestMeta): Promise<void> {
    this.passwords.assertStrong(dto.newPassword);
    const hash = this.tokens.hashRefreshToken(dto.token);
    await withPlatform(this.prisma, async (tx) => {
      const record = await tx.passwordResetToken.findUnique({ where: { tokenHash: hash } });
      if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      const passwordHash = await this.passwords.hash(dto.newPassword);
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false, passwordUpdatedAt: new Date() },
      });
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit(tx, record.tenantId, record.userId, 'auth.password.reset.confirm', {}, meta);
    });
  }

  // ----- Current principal -------------------------------------------------
  async me(userId: string, tenantId: string): Promise<AuthenticatedUser> {
    return withPlatform(this.prisma, async (tx) => {
      const user = await tx.user.findFirstOrThrow({ where: { id: userId, tenantId } });
      return this.buildPrincipal(tx, user);
    });
  }

  // ----- Internals ---------------------------------------------------------
  /** Returns a human-readable reason if the account cannot log in, else null. */
  private loginBlockReason(user: User): string | null {
    if (user.deletedAt || user.status === UserStatus.DISABLED) return 'Account is disabled';
    if (user.status === UserStatus.SUSPENDED) return 'Account is suspended';
    return null;
  }

  private async resolveUserByEmail(
    tx: TxClient,
    email: string,
    tenantSlug?: string,
  ): Promise<User | null> {
    if (tenantSlug) {
      const tenant = await tx.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) return null;
      return tx.user.findFirst({ where: { tenantId: tenant.id, email, deletedAt: null } });
    }
    const matches = await tx.user.findMany({ where: { email, deletedAt: null }, take: 2 });
    if (matches.length > 1) {
      throw new BadRequestException('Multiple accounts found for this email; specify the school.');
    }
    return matches[0] ?? null;
  }

  private async buildPrincipal(tx: TxClient, user: User): Promise<AuthenticatedUser> {
    const { roles, permissions } = await this.rbac.loadUserAuthz(tx, user.id);
    const isPlatform = roles.some((r) => isPlatformRole(r));
    return { userId: user.id, tenantId: user.tenantId, isPlatform, roles, permissions };
  }

  private async issueTokens(
    tx: TxClient,
    principal: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TokenPair> {
    const access = this.tokens.signAccessToken(principal);
    const refresh = await this.persistRefreshToken(tx, principal, meta);
    return { accessToken: access.token, refreshToken: refresh.raw, expiresIn: access.expiresIn };
  }

  private async persistRefreshToken(
    tx: TxClient,
    principal: AuthenticatedUser,
    meta: RequestMeta,
    familyId?: string,
  ): Promise<{ raw: string; row: { id: string } }> {
    const { token, hash } = this.tokens.generateRefreshToken();
    const row = await tx.refreshToken.create({
      data: {
        tenantId: principal.tenantId,
        userId: principal.userId,
        tokenHash: hash,
        familyId: familyId ?? crypto.randomUUID(),
        expiresAt: this.tokens.refreshExpiryDate(),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
      select: { id: true },
    });
    return { raw: token, row };
  }

  private async audit(
    tx: TxClient,
    tenantId: string | null,
    actorUserId: string | null,
    action: string,
    metadata: Prisma.InputJsonValue,
    meta: RequestMeta,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId,
        action,
        entityType: 'Auth',
        metadata,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  }
}
