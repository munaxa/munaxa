import { Injectable } from '@nestjs/common';
import type { Employee, Prisma } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class EmployeeRepository extends TenantRepository {
  create(data: Omit<Prisma.EmployeeUncheckedCreateInput, 'tenantId'>): Promise<Employee> {
    return this.run((tx, tenantId) => tx.employee.create({ data: { ...data, tenantId } }));
  }

  findMany(): Promise<Employee[]> {
    return this.run((tx) =>
      tx.employee.findMany({ where: { deletedAt: null }, orderBy: { lastNameEn: 'asc' } }),
    );
  }

  findById(id: string): Promise<Employee | null> {
    return this.run((tx) => tx.employee.findFirst({ where: { id, deletedAt: null } }));
  }

  update(id: string, data: Prisma.EmployeeUpdateInput): Promise<Employee> {
    return this.run((tx) => tx.employee.update({ where: { id }, data }));
  }

  softDelete(id: string): Promise<Employee> {
    return this.run((tx) => tx.employee.update({ where: { id }, data: { deletedAt: new Date() } }));
  }
}
