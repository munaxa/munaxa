import { Module } from '@nestjs/common';
import { AnnouncementController } from './announcements/announcement.controller';
import { AnnouncementService } from './announcements/announcement.service';
import { AnnouncementRepository } from './announcements/announcement.repository';
import { NotificationController } from './notifications/notification.controller';
import { NotificationService } from './notifications/notification.service';
import { NotificationRepository } from './notifications/notification.repository';
import { DeviceRepository } from './devices/device.repository';
import { FeatureFlagController } from './feature-flags/feature-flag.controller';
import { FeatureFlagService } from './feature-flags/feature-flag.service';
import { FeatureFlagRepository } from './feature-flags/feature-flag.repository';
import { DispatcherService } from './dispatch/dispatcher.service';
import { PushService } from './dispatch/push.service';
import { WhatsAppBridge } from './dispatch/whatsapp.bridge';

/**
 * Communication: announcements (audience fan-out), the in-app notification center, device
 * (FCM) tokens, per-tenant feature flags, and the feature-flagged WhatsApp bridge framework.
 */
@Module({
  controllers: [AnnouncementController, NotificationController, FeatureFlagController],
  providers: [
    AnnouncementService,
    AnnouncementRepository,
    NotificationService,
    NotificationRepository,
    DeviceRepository,
    FeatureFlagService,
    FeatureFlagRepository,
    DispatcherService,
    PushService,
    WhatsAppBridge,
  ],
})
export class CommunicationModule {}
