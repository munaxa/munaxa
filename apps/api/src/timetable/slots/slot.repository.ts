import { Injectable } from '@nestjs/common';
import type { Prisma, TimetableSlot } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class SlotRepository extends TenantRepository {
  create(data: Omit<Prisma.TimetableSlotUncheckedCreateInput, 'tenantId'>): Promise<TimetableSlot> {
    return this.run((tx, tenantId) => tx.timetableSlot.create({ data: { ...data, tenantId } }));
  }

  findBySection(sectionId: string): Promise<TimetableSlot[]> {
    return this.run((tx) =>
      tx.timetableSlot.findMany({
        where: { sectionId },
        orderBy: [{ dayOfWeek: 'asc' }, { periodIndex: 'asc' }],
      }),
    );
  }

  findById(id: string): Promise<TimetableSlot | null> {
    return this.run((tx) => tx.timetableSlot.findFirst({ where: { id } }));
  }

  update(id: string, data: Prisma.TimetableSlotUpdateInput): Promise<TimetableSlot> {
    return this.run((tx) => tx.timetableSlot.update({ where: { id }, data }));
  }

  delete(id: string): Promise<TimetableSlot> {
    return this.run((tx) => tx.timetableSlot.delete({ where: { id } }));
  }

  sectionExists(sectionId: string): Promise<boolean> {
    return this.run(
      async (tx) => (await tx.section.findFirst({ where: { id: sectionId } })) !== null,
    );
  }
}
