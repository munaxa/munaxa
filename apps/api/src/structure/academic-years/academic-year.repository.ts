import { Injectable } from '@nestjs/common';
import type { AcademicYear, Prisma } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class AcademicYearRepository extends TenantRepository {
  create(data: Omit<Prisma.AcademicYearUncheckedCreateInput, 'tenantId'>): Promise<AcademicYear> {
    return this.run((tx, tenantId) => tx.academicYear.create({ data: { ...data, tenantId } }));
  }

  findMany(campusId?: string): Promise<AcademicYear[]> {
    return this.run((tx) =>
      tx.academicYear.findMany({
        where: { ...(campusId ? { campusId } : {}) },
        orderBy: { startDate: 'desc' },
      }),
    );
  }

  findById(id: string): Promise<AcademicYear | null> {
    return this.run((tx) => tx.academicYear.findFirst({ where: { id } }));
  }

  update(id: string, data: Prisma.AcademicYearUpdateInput): Promise<AcademicYear> {
    return this.run((tx) => tx.academicYear.update({ where: { id }, data }));
  }

  delete(id: string): Promise<AcademicYear> {
    return this.run((tx) => tx.academicYear.delete({ where: { id } }));
  }

  /** Clear the current-year flag for a campus before marking a new one current. */
  clearCurrent(campusId: string): Promise<unknown> {
    return this.run((tx) =>
      tx.academicYear.updateMany({
        where: { campusId, isCurrent: true },
        data: { isCurrent: false },
      }),
    );
  }

  campusExists(campusId: string): Promise<boolean> {
    return this.run(async (tx) => {
      const found = await tx.campus.findFirst({ where: { id: campusId, deletedAt: null } });
      return found !== null;
    });
  }
}
