import { Injectable } from '@nestjs/common';
import type { TimetableConfig } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class TimetableConfigRepository extends TenantRepository {
  findByCampus(campusId: string): Promise<TimetableConfig | null> {
    return this.run((tx) => tx.timetableConfig.findFirst({ where: { campusId } }));
  }

  upsert(
    campusId: string,
    data: {
      ramadanModeEnabled: boolean;
      ramadanStartDate: Date | null;
      ramadanEndDate: Date | null;
    },
  ): Promise<TimetableConfig> {
    return this.run(async (tx, tenantId) => {
      const existing = await tx.timetableConfig.findFirst({ where: { campusId } });
      if (existing) {
        return tx.timetableConfig.update({ where: { id: existing.id }, data });
      }
      return tx.timetableConfig.create({ data: { ...data, tenantId, campusId } });
    });
  }

  campusExists(campusId: string): Promise<boolean> {
    return this.run(
      async (tx) =>
        (await tx.campus.findFirst({ where: { id: campusId, deletedAt: null } })) !== null,
    );
  }

  /** The campus a section belongs to (via its grade), or null if the section is absent. */
  sectionCampusId(sectionId: string): Promise<string | null> {
    return this.run(async (tx) => {
      const section = await tx.section.findFirst({
        where: { id: sectionId },
        include: { grade: true },
      });
      return section?.grade.campusId ?? null;
    });
  }
}
