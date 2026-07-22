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

/**
 * The platform scheduling engine — the single source of truth for schedule resolution and publishing
 * rules across Munaxa (student/parent/teacher portals, attendance, dashboards, and future modules).
 *
 * `SchedulingService` is exported so any module can consume it; no module implements its own
 * scheduling logic.
 */
@Module({
  controllers: [SchedulingController, SubjectController, LocationController, SchedulePlanController],
  providers: [
    SchedulingRepository,
    SchedulingService,
    SubjectRepository,
    SubjectService,
    LocationRepository,
    LocationService,
    SchedulePlanRepository,
    SchedulePlanService,
  ],
  exports: [SchedulingService],
})
export class SchedulingModule {}
