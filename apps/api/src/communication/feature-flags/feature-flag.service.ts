import { Injectable } from '@nestjs/common';
import type { FeatureFlag, Prisma } from '@prisma/client';
import { FeatureFlagRepository } from './feature-flag.repository';
import type { SetFeatureFlagDto } from './feature-flag.dto';

@Injectable()
export class FeatureFlagService {
  constructor(private readonly repo: FeatureFlagRepository) {}

  list(): Promise<FeatureFlag[]> {
    return this.repo.findAll();
  }

  set(key: string, dto: SetFeatureFlagDto): Promise<FeatureFlag> {
    return this.repo.upsert(key, dto.enabled, dto.config as Prisma.InputJsonValue | undefined);
  }

  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.repo.findByKey(key);
    return flag?.enabled ?? false;
  }
}
