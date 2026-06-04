import { BadRequestException, Injectable } from '@nestjs/common';
import type { TimetableConfig } from '@prisma/client';
import { TimetableConfigRepository } from './config.repository';
import type { UpsertTimetableConfigDto } from './config.dto';

@Injectable()
export class TimetableConfigService {
  constructor(private readonly repo: TimetableConfigRepository) {}

  async get(campusId: string): Promise<TimetableConfig | null> {
    if (!(await this.repo.campusExists(campusId))) {
      throw new BadRequestException('Campus not found in this tenant');
    }
    return this.repo.findByCampus(campusId);
  }

  async upsert(campusId: string, dto: UpsertTimetableConfigDto): Promise<TimetableConfig> {
    if (!(await this.repo.campusExists(campusId))) {
      throw new BadRequestException('Campus not found in this tenant');
    }
    if (dto.ramadanModeEnabled && (!dto.ramadanStartDate || !dto.ramadanEndDate)) {
      throw new BadRequestException('Ramadan mode requires start and end dates');
    }
    return this.repo.upsert(campusId, {
      ramadanModeEnabled: dto.ramadanModeEnabled,
      ramadanStartDate: dto.ramadanStartDate ? new Date(dto.ramadanStartDate) : null,
      ramadanEndDate: dto.ramadanEndDate ? new Date(dto.ramadanEndDate) : null,
    });
  }
}
