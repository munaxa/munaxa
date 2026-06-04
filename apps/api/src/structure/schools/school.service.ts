import { Injectable, NotFoundException } from '@nestjs/common';
import type { School } from '@prisma/client';
import { SchoolRepository } from './school.repository';
import type { CreateSchoolDto, UpdateSchoolDto } from './school.dto';

@Injectable()
export class SchoolService {
  constructor(private readonly repo: SchoolRepository) {}

  create(dto: CreateSchoolDto): Promise<School> {
    return this.repo.create(dto);
  }

  list(): Promise<School[]> {
    return this.repo.findMany();
  }

  async get(id: string): Promise<School> {
    const school = await this.repo.findById(id);
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async update(id: string, dto: UpdateSchoolDto): Promise<School> {
    await this.get(id);
    return this.repo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.softDelete(id);
  }
}
