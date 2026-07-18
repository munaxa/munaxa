import { Module } from '@nestjs/common';
import { PlatformConsoleService } from './platform-console.service';
import { PlatformConsoleRepository } from './platform-console.repository';
import {
  PlatformCatalogController,
  PlatformDashboardController,
  PlatformSchoolsController,
  PlatformSubscriptionsController,
} from './platform-console.controllers';

/**
 * Platform Console (super-admin plane): Dashboard, Schools, Subscriptions, Upgrade Requests,
 * Trials, Billing, Coupons, Feature Overrides, Audit, Revenue and System Health. Cross-tenant,
 * gated by platform permissions, fully audited. Depends on the global SubscriptionModule for
 * resolver cache invalidation after changes.
 */
@Module({
  controllers: [
    PlatformDashboardController,
    PlatformCatalogController,
    PlatformSubscriptionsController,
    PlatformSchoolsController,
  ],
  providers: [PlatformConsoleService, PlatformConsoleRepository],
})
export class PlatformConsoleModule {}
