import { Module } from '@nestjs/common';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { SchedulingRepository } from './scheduling.repository';
import { SubjectController } from './subjects/subject.controller';
import { SubjectService } from './subjects/subject.service';
import { SubjectRepository } from './subjects/subject.repository';
import { LocationController } from './locations/location.controller';
import { LocationService } from './locations/location.service';
import { LocationRepository } from './locations/location.repository';
import { SchedulePlanController } from './plans/schedule-plan.controller';
import { SchedulePlanService } from './plans/schedule-plan.service';
import { SchedulePlanRepository } from './plans/schedule-plan.repository';
import { RamadanConfigController } from './ramadan/ramadan-config.controller';
import { RamadanConfigService } from './ramadan/ramadan-config.service';
import { RamadanConfigRepository } from './ramadan/ramadan-config.repository';
import { ScheduleExceptionController } from './exceptions/schedule-exception.controller';
import { ScheduleExceptionService } from './exceptions/schedule-exception.service';
import { ScheduleExceptionRepository } from './exceptions/schedule-exception.repository';

/**
 * The platform scheduling engine — the single source of truth for schedule resolution and publishing
 * rules across Munaxa (student/parent/teacher portals, attendance, dashboards, and future modules).
 *
 * `SchedulingService` is exported so any module can consume it; no module implements its own
 * scheduling logic.
 */
@Module({
  controllers: [
    SchedulingController,
    SubjectController,
    LocationController,
    SchedulePlanController,
    RamadanConfigController,
    ScheduleExceptionController,
  ],
  providers: [
    SchedulingRepository,
    SchedulingService,
    SubjectRepository,
    SubjectService,
    LocationRepository,
    LocationService,
    SchedulePlanRepository,
    SchedulePlanService,
    RamadanConfigRepository,
    RamadanConfigService,
    ScheduleExceptionRepository,
    ScheduleExceptionService,
  ],
  exports: [SchedulingService],
})
export class SchedulingModule {}
