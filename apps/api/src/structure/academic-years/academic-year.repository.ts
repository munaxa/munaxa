import { Injectable } from '@nestjs/common';
import { AcademicYearStatus, type AcademicYear, type Prisma } from '@prisma/client';
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

  /**
   * Supersede any OTHER active year in the same School before marking a new one ACTIVE — an Academic
   * Year is School-scoped (Decision 1) and there is exactly one ACTIVE per School. A superseded year
   * is moved to CLOSED (and its legacy `isCurrent` flag cleared). Falls back to campus scope only for
   * legacy rows whose `schoolId` has not been backfilled yet.
   */
  clearActiveForSchool(
    schoolId: string | null,
    campusId: string,
    exceptId?: string,
  ): Promise<unknown> {
    return this.run((tx) =>
      tx.academicYear.updateMany({
        where: {
          ...(schoolId ? { schoolId } : { campusId }),
          ...(exceptId ? { id: { not: exceptId } } : {}),
          OR: [{ status: AcademicYearStatus.ACTIVE }, { isCurrent: true }],
        },
        data: { status: AcademicYearStatus.CLOSED, isCurrent: false },
      }),
    );
  }

  /** Resolve the owning School of a campus (for deriving `schoolId` on create). */
  campusSchoolId(campusId: string): Promise<string | null> {
    return this.run(async (tx) => {
      const campus = await tx.campus.findFirst({
        where: { id: campusId, deletedAt: null },
        select: { schoolId: true },
      });
      return campus?.schoolId ?? null;
    });
  }

  campusExists(campusId: string): Promise<boolean> {
    return this.run(async (tx) => {
      const found = await tx.campus.findFirst({ where: { id: campusId, deletedAt: null } });
      return found !== null;
    });
  }
}
