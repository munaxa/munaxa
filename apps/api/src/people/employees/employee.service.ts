import { Injectable, NotFoundException } from '@nestjs/common';
import type { Employee } from '@prisma/client';
import { EmployeeRepository } from './employee.repository';
import type { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly repo: EmployeeRepository) {}

  create(dto: CreateEmployeeDto): Promise<Employee> {
    return this.repo.create(dto);
  }

  list(): Promise<Employee[]> {
    return this.repo.findMany();
  }

  async get(id: string): Promise<Employee> {
    const employee = await this.repo.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    await this.get(id);
    return this.repo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.softDelete(id);
  }
}
