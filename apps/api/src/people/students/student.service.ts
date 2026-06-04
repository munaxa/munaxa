import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { ParentStudent, Prisma, Student } from '@prisma/client';
import { StudentRepository } from './student.repository';
import { generateStudentQrCode } from '../people.util';
import type { CreateStudentDto, LinkParentDto, UpdateStudentDto } from './student.dto';

export interface ImportResult {
  created: number;
  failed: Array<{ row: number; error: string }>;
}

@Injectable()
export class StudentService {
  constructor(private readonly repo: StudentRepository) {}

  async create(dto: CreateStudentDto): Promise<Student> {
    await this.assertSection(dto.sectionId);
    return this.repo.create(this.toCreateInput(dto));
  }

  list(filter: { sectionId?: string; status?: Student['status'] }): Promise<Student[]> {
    return this.repo.findMany(filter);
  }

  async get(id: string): Promise<Student> {
    const student = await this.repo.findById(id);
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async update(id: string, dto: UpdateStudentDto): Promise<Student> {
    await this.get(id);
    await this.assertSection(dto.sectionId);
    const data: Prisma.StudentUpdateInput = {
      ...(dto.firstNameEn !== undefined ? { firstNameEn: dto.firstNameEn } : {}),
      ...(dto.lastNameEn !== undefined ? { lastNameEn: dto.lastNameEn } : {}),
      ...(dto.firstNameAr !== undefined ? { firstNameAr: dto.firstNameAr } : {}),
      ...(dto.lastNameAr !== undefined ? { lastNameAr: dto.lastNameAr } : {}),
      ...(dto.moeStudentNumber !== undefined ? { moeStudentNumber: dto.moeStudentNumber } : {}),
      ...(dto.nationalId !== undefined ? { nationalId: dto.nationalId } : {}),
      ...(dto.dateOfBirth ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.sectionId !== undefined
        ? { section: dto.sectionId ? { connect: { id: dto.sectionId } } : { disconnect: true } }
        : {}),
    };
    return this.repo.update(id, data);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.softDelete(id);
  }

  async qr(id: string): Promise<{ qrCode: string }> {
    const student = await this.get(id);
    return { qrCode: student.qrCode };
  }

  // ----- Parent linking ----------------------------------------------------
  async linkParent(studentId: string, dto: LinkParentDto): Promise<ParentStudent> {
    await this.get(studentId);
    if (!(await this.repo.parentExists(dto.parentId))) {
      throw new BadRequestException('Parent not found in this tenant');
    }
    return this.repo.linkParent(studentId, dto.parentId, dto.relation, dto.isPrimary ?? false);
  }

  async unlinkParent(studentId: string, parentId: string): Promise<void> {
    await this.get(studentId);
    await this.repo.unlinkParent(studentId, parentId);
  }

  async listParents(studentId: string): Promise<ParentStudent[]> {
    await this.get(studentId);
    return this.repo.listParents(studentId);
  }

  // ----- Bulk CSV import ---------------------------------------------------
  async importCsv(csv: string): Promise<ImportResult> {
    let records: Record<string, string>[];
    try {
      records = parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<
        string,
        string
      >[];
    } catch {
      throw new BadRequestException('Could not parse CSV');
    }
    if (records.length === 0) throw new BadRequestException('CSV contains no data rows');

    const failed: ImportResult['failed'] = [];
    const valid: Array<Omit<Prisma.StudentUncheckedCreateInput, 'tenantId'>> = [];

    records.forEach((record, index) => {
      const required = ['firstNameEn', 'lastNameEn', 'firstNameAr', 'lastNameAr'] as const;
      const missing = required.filter((key) => !record[key]);
      if (missing.length > 0) {
        failed.push({ row: index + 2, error: `Missing: ${missing.join(', ')}` });
        return;
      }
      valid.push(
        this.toCreateInput({
          firstNameEn: record.firstNameEn!,
          lastNameEn: record.lastNameEn!,
          firstNameAr: record.firstNameAr!,
          lastNameAr: record.lastNameAr!,
          moeStudentNumber: record.moeStudentNumber || undefined,
          nationalId: record.nationalId || undefined,
        }),
      );
    });

    let created = 0;
    if (valid.length > 0) {
      const inserted = await this.repo.createManyTx(valid);
      created = inserted.length;
    }
    return { created, failed };
  }

  // ----- Internals ---------------------------------------------------------
  private toCreateInput(
    dto: CreateStudentDto,
  ): Omit<Prisma.StudentUncheckedCreateInput, 'tenantId'> {
    return {
      firstNameEn: dto.firstNameEn,
      lastNameEn: dto.lastNameEn,
      firstNameAr: dto.firstNameAr,
      lastNameAr: dto.lastNameAr,
      moeStudentNumber: dto.moeStudentNumber ?? null,
      nationalId: dto.nationalId ?? null,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      gender: dto.gender ?? null,
      sectionId: dto.sectionId ?? null,
      status: dto.status ?? 'ACTIVE',
      qrCode: generateStudentQrCode(),
    };
  }

  private async assertSection(sectionId?: string): Promise<void> {
    if (sectionId && !(await this.repo.sectionExists(sectionId))) {
      throw new BadRequestException('Section not found in this tenant');
    }
  }
}
