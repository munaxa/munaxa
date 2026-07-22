import { Module } from '@nestjs/common';
import { TimetableConfigController } from './config/config.controller';
import { TimetableConfigService } from './config/config.service';
import { TimetableConfigRepository } from './config/config.repository';

/**
 * Timetable module.
 *
 * The enterprise scheduling engine (Subject, SchedulePlan, SectionTimetable, ScheduledClass,
 * conflict detection + publish, and the section-inherited resolver used by the Parent/Student/
 * Teacher portals and Attendance) is built on the pure engine in `engine/scheduling-engine.ts`.
 * Those resources — subjects/, plans/, section-timetables/, resolver/, exceptions/ — are added in the
 * next phase (see SCHEDULING_ENGINE_REFACTOR.md). For now only the per-campus Ramadan config ships.
 */
@Module({
  controllers: [TimetableConfigController],
  providers: [TimetableConfigService, TimetableConfigRepository],
})
export class TimetableModule {}
