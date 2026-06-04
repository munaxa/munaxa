import { Injectable } from '@nestjs/common';
import type { Prisma, ScheduleException } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class ExceptionRepository extends TenantRepository {
  create(
    data: Omit<Prisma.ScheduleExceptionUncheckedCreateInput, 'tenantId'>,
  ): Promise<ScheduleException> {
    return this.run((tx, tenantId) => tx.scheduleException.create({ data: { ...data, tenantId } }));
  }

  list(filter: { sectionId?: string; date?: Date }): Promise<ScheduleException[]> {
    return this.run((tx) =>
      tx.scheduleException.findMany({
        where: {
          ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
          ...(filter.date ? { date: filter.date } : {}),
        },
        orderBy: [{ date: 'asc' }, { periodIndex: 'asc' }],
      }),
    );
  }

  /** Exceptions for a section on a date, including school-wide (sectionId null) ones. */
  findForSectionDate(sectionId: string, date: Date): Promise<ScheduleException[]> {
    return this.run((tx) =>
      tx.scheduleException.findMany({
        where: { date, OR: [{ sectionId }, { sectionId: null }] },
      }),
    );
  }

  findById(id: string): Promise<ScheduleException | null> {
    return this.run((tx) => tx.scheduleException.findFirst({ where: { id } }));
  }

  update(id: string, data: Prisma.ScheduleExceptionUpdateInput): Promise<ScheduleException> {
    return this.run((tx) => tx.scheduleException.update({ where: { id }, data }));
  }

  delete(id: string): Promise<ScheduleException> {
    return this.run((tx) => tx.scheduleException.delete({ where: { id } }));
  }

  sectionExists(sectionId: string): Promise<boolean> {
    return this.run(
      async (tx) => (await tx.section.findFirst({ where: { id: sectionId } })) !== null,
    );
  }
}
