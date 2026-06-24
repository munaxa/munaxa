import { Injectable } from '@nestjs/common';
import type { Area, Prisma } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class AreaRepository extends TenantRepository {
  list(filter: { active?: boolean; transportationAvailable?: boolean }): Promise<Area[]> {
    return this.run((tx) =>
      tx.area.findMany({
        where: {
          deletedAt: null,
          ...(filter.active !== undefined ? { active: filter.active } : {}),
          ...(filter.transportationAvailable !== undefined
            ? { transportationAvailable: filter.transportationAvailable }
            : {}),
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  create(data: Omit<Prisma.AreaUncheckedCreateInput, 'tenantId'>): Promise<Area> {
    return this.run((tx, tenantId) => tx.area.create({ data: { ...data, tenantId } }));
  }

  find(id: string): Promise<Area | null> {
    return this.run((tx) => tx.area.findFirst({ where: { id, deletedAt: null } }));
  }

  update(id: string, data: Prisma.AreaUpdateInput): Promise<Area> {
    return this.run((tx) => tx.area.update({ where: { id }, data }));
  }

  /** Whether an active, transport-enabled area exists in this tenant (used to validate registration). */
  isTransportArea(id: string): Promise<boolean> {
    return this.run(
      async (tx) =>
        (await tx.area.findFirst({
          where: { id, deletedAt: null, active: true, transportationAvailable: true },
        })) !== null,
    );
  }
}
