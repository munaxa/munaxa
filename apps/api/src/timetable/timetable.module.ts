import { Module } from '@nestjs/common';
import { SlotController } from './slots/slot.controller';
import { SlotService } from './slots/slot.service';
import { SlotRepository } from './slots/slot.repository';
import { ExceptionController } from './exceptions/exception.controller';
import { ExceptionService } from './exceptions/exception.service';
import { ExceptionRepository } from './exceptions/exception.repository';
import { TimetableConfigController } from './config/config.controller';
import { TimetableConfigService } from './config/config.service';
import { TimetableConfigRepository } from './config/config.repository';
import { ResolverController } from './resolver/resolver.controller';
import { ResolverService } from './resolver/resolver.service';

/**
 * Timetable engine: master timetable slots (REGULAR + RAMADAN), date-specific schedule
 * exceptions (cancellation / substitution / replacement / holiday), per-campus Ramadan
 * config, and the resolver that computes the current/next class.
 */
@Module({
  controllers: [SlotController, ExceptionController, TimetableConfigController, ResolverController],
  providers: [
    SlotService,
    SlotRepository,
    ExceptionService,
    ExceptionRepository,
    TimetableConfigService,
    TimetableConfigRepository,
    ResolverService,
  ],
})
export class TimetableModule {}
