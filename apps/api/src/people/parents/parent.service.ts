import { Injectable, NotFoundException } from '@nestjs/common';
import type { Parent } from '@prisma/client';
import { ParentRepository } from './parent.repository';
import type { CreateParentDto, UpdateParentDto } from './parent.dto';

@Injectable()
export class ParentService {
  constructor(private readonly repo: ParentRepository) {}

  create(dto: CreateParentDto): Promise<Parent> {
    return this.repo.create(dto);
  }

  list(studentId?: string): Promise<Parent[]> {
    return studentId ? this.repo.findByStudent(studentId) : this.repo.findMany();
  }

  async get(id: string): Promise<Parent> {
    const parent = await this.repo.findById(id);
    if (!parent) throw new NotFoundException('Parent not found');
    return parent;
  }

  async update(id: string, dto: UpdateParentDto): Promise<Parent> {
    await this.get(id);
    return this.repo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.softDelete(id);
  }
}
