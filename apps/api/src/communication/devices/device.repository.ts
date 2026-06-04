import { Injectable } from '@nestjs/common';
import type { DevicePlatform, DeviceToken } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class DeviceRepository extends TenantRepository {
  /** Register or refresh a device token (re-points it at the current user). */
  register(userId: string, token: string, platform: DevicePlatform): Promise<DeviceToken> {
    return this.run(async (tx, tenantId) => {
      const existing = await tx.deviceToken.findUnique({ where: { token } });
      if (existing) {
        return tx.deviceToken.update({
          where: { token },
          data: { userId, platform, lastSeenAt: new Date() },
        });
      }
      return tx.deviceToken.create({ data: { tenantId, userId, token, platform } });
    });
  }

  remove(userId: string, token: string): Promise<unknown> {
    return this.run((tx) => tx.deviceToken.deleteMany({ where: { userId, token } }));
  }
}
