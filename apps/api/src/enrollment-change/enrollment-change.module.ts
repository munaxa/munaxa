import { Module } from '@nestjs/common';
import { EnrollmentChangeController } from './enrollment-change.controller';
import { EnrollmentChangeService } from './enrollment-change.service';
import { EnrollmentChangeRepository } from './enrollment-change.repository';

/**
 * Enrollment placement changes (PR 1 — Grade Correction + Administrative Transfer). No Finance or
 * People imports: PR 1 makes no ledger changes and edits only the Enrollment (+ the deprecated
 * Student.sectionId read-through shim). Fee recalculation arrives in PR 2.
 */
@Module({
  controllers: [EnrollmentChangeController],
  providers: [EnrollmentChangeService, EnrollmentChangeRepository],
})
export class EnrollmentChangeModule {}
