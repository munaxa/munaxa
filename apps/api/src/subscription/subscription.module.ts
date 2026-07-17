import { Global, Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionRepository } from './subscription.repository';
import { PlanFeatureGuard } from './plan-feature.guard';

/**
 * Subscription plane. Exported globally so any module can enforce limits/capabilities through
 * the central {@link SubscriptionService} (and use {@link PlanFeatureGuard} / `@RequirePlanFeature`)
 * without re-importing.
 */
@Global()
@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRepository, PlanFeatureGuard],
  exports: [SubscriptionService, PlanFeatureGuard],
})
export class SubscriptionModule {}
