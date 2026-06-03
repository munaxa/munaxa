import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@munaxa/domain';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Declares the permissions required to access a route. The {@link PermissionsGuard}
 * enforces that the principal holds ALL listed permissions.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
