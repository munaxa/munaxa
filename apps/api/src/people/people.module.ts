import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { StudentController } from './students/student.controller';
import { StudentService } from './students/student.service';
import { StudentRepository } from './students/student.repository';
import { ParentController } from './parents/parent.controller';
import { ParentService } from './parents/parent.service';
import { ParentRepository } from './parents/parent.repository';
import { TeacherController } from './teachers/teacher.controller';
import { TeacherService } from './teachers/teacher.service';
import { TeacherRepository } from './teachers/teacher.repository';
import { EmployeeController } from './employees/employee.controller';
import { EmployeeService } from './employees/employee.service';
import { EmployeeRepository } from './employees/employee.repository';

/**
 * People management: Students (+ QR + parent linking + CSV import), Parents,
 * Teachers (+ section assignment), Employees (incl. secretary accounts).
 */
@Module({
  imports: [FinanceModule],
  controllers: [StudentController, ParentController, TeacherController, EmployeeController],
  providers: [
    StudentService,
    StudentRepository,
    ParentService,
    ParentRepository,
    TeacherService,
    TeacherRepository,
    EmployeeService,
    EmployeeRepository,
  ],
})
export class PeopleModule {}
