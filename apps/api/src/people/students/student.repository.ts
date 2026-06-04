import { Injectable } from '@nestjs/common';
import type { ParentStudent, Prisma, Student, StudentStatus } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class StudentRepository extends TenantRepository {
  create(data: Omit<Prisma.StudentUncheckedCreateInput, 'tenantId'>): Promise<Student> {
    return this.run((tx, tenantId) => tx.student.create({ data: { ...data, tenantId } }));
  }

  /** Create many students in one transaction; returns the created rows. */
  createManyTx(
    rows: Array<Omit<Prisma.StudentUncheckedCreateInput, 'tenantId'>>,
  ): Promise<Student[]> {
    return this.run((tx, tenantId) =>
      Promise.all(rows.map((data) => tx.student.create({ data: { ...data, tenantId } }))),
    );
  }

  findMany(filter: { sectionId?: string; status?: StudentStatus }): Promise<Student[]> {
    return this.run((tx) =>
      tx.student.findMany({
        where: {
          deletedAt: null,
          ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
          ...(filter.status ? { status: filter.status } : {}),
        },
        orderBy: { lastNameEn: 'asc' },
      }),
    );
  }

  findById(id: string): Promise<Student | null> {
    return this.run((tx) => tx.student.findFirst({ where: { id, deletedAt: null } }));
  }

  update(id: string, data: Prisma.StudentUpdateInput): Promise<Student> {
    return this.run((tx) => tx.student.update({ where: { id }, data }));
  }

  softDelete(id: string): Promise<Student> {
    return this.run((tx) => tx.student.update({ where: { id }, data: { deletedAt: new Date() } }));
  }

  sectionExists(sectionId: string): Promise<boolean> {
    return this.run(
      async (tx) => (await tx.section.findFirst({ where: { id: sectionId } })) !== null,
    );
  }

  parentExists(parentId: string): Promise<boolean> {
    return this.run(
      async (tx) =>
        (await tx.parent.findFirst({ where: { id: parentId, deletedAt: null } })) !== null,
    );
  }

  linkParent(
    studentId: string,
    parentId: string,
    relation: Prisma.ParentStudentUncheckedCreateInput['relation'],
    isPrimary: boolean,
  ): Promise<ParentStudent> {
    return this.run((tx, tenantId) =>
      tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId, studentId } },
        update: { relation, isPrimary },
        create: { tenantId, studentId, parentId, relation, isPrimary },
      }),
    );
  }

  unlinkParent(studentId: string, parentId: string): Promise<unknown> {
    return this.run((tx) => tx.parentStudent.deleteMany({ where: { studentId, parentId } }));
  }

  listParents(studentId: string): Promise<ParentStudent[]> {
    return this.run((tx) => tx.parentStudent.findMany({ where: { studentId } }));
  }
}
