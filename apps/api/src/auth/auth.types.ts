import type { Permission, RoleKey } from '@munaxa/domain';

/** The authenticated principal attached to each request after JWT verification. */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  isPlatform: boolean;
  roles: RoleKey[];
  permissions: Permission[];
}

/** Access-token JWT payload. */
export interface AccessTokenPayload {
  sub: string; // userId
  tid: string; // tenantId
  plat: boolean; // platform plane
  roles: RoleKey[];
  perms: Permission[];
}

/** A freshly issued token pair returned to clients. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // access token TTL (seconds)
}
