import type { Permission } from '@munaxa/domain';

/** The authenticated principal attached to each request after JWT verification. */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  isPlatform: boolean;
  // System role keys (RoleKey) plus any custom per-tenant role keys (free text).
  roles: string[];
  permissions: Permission[];
}

/** Access-token JWT payload. */
export interface AccessTokenPayload {
  sub: string; // userId
  tid: string; // tenantId
  plat: boolean; // platform plane
  roles: string[];
  perms: Permission[];
}

/** A freshly issued token pair returned to clients. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // access token TTL (seconds)
}
