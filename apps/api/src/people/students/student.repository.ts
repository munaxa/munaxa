import { Injectable } from '@nestjs/common';
import type { ParentStudent, Prisma, Student, StudentStatus, StudentVaccine } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

/** A parent↔student link enriched with the parent's contact details. */
export type ParentLink = Prisma.ParentStudentGetPayload<{ include: { parent: true } }>;

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

  findMany(filter: {
    sectionId?: string;
    status?: StudentStatus;
    search?: string;
  }): Promise<Student[]> {
    const q = filter.search?.trim();
    const contains = q ? ({ contains: q, mode: 'insensitive' } as Prisma.StringFilter) : undefined;
    return this.run((tx) =>
      tx.student.findMany({
        where: {
          deletedAt: null,
          ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
          ...(filter.status ? { status: filter.status } : {}),
          // Search across every name part (given · father · grandfather · family, EN + AR)
          // plus the national / MoE numbers.
          ...(contains
            ? {
                OR: [
                  { firstNameEn: contains },
                  { firstNameAr: contains },
                  { fatherNameEn: contains },
                  { fatherNameAr: contains },
                  { thirdNameEn: contains },
                  { thirdNameAr: contains },
                  { lastNameEn: contains },
                  { lastNameAr: contains },
                  { nationalId: contains },
                  { moeStudentNumber: contains },
                ],
              }
            : {}),
        },
        orderBy: { lastNameEn: 'asc' },
        take: q ? 50 : undefined,
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

  listParents(studentId: string): Promise<ParentLink[]> {
    return this.run((tx) =>
      tx.parentStudent.findMany({
        where: { studentId },
        include: { parent: true },
        orderBy: { isPrimary: 'desc' },
      }),
    );
  }

  // ----- Vaccines ----------------------------------------------------------
  listVaccines(studentId: string): Promise<StudentVaccine[]> {
    return this.run((tx) =>
      tx.studentVaccine.findMany({ where: { studentId }, orderBy: { createdAt: 'asc' } }),
    );
  }

  createVaccine(
    data: Omit<Prisma.StudentVaccineUncheckedCreateInput, 'tenantId'>,
  ): Promise<StudentVaccine> {
    return this.run((tx, tenantId) => tx.studentVaccine.create({ data: { ...data, tenantId } }));
  }

  findVaccine(studentId: string, vaccineId: string): Promise<StudentVaccine | null> {
    return this.run((tx) => tx.studentVaccine.findFirst({ where: { id: vaccineId, studentId } }));
  }

  updateVaccine(
    vaccineId: string,
    data: Prisma.StudentVaccineUpdateInput,
  ): Promise<StudentVaccine> {
    return this.run((tx) => tx.studentVaccine.update({ where: { id: vaccineId }, data }));
  }

  deleteVaccine(vaccineId: string): Promise<unknown> {
    return this.run((tx) => tx.studentVaccine.delete({ where: { id: vaccineId } }));
  }
}
