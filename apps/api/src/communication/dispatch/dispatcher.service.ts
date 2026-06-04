import { Injectable } from '@nestjs/common';
import type { AnnouncementAudience } from '@prisma/client';
import { NotificationRepository } from '../notifications/notification.repository';
import { PushService } from './push.service';
import { WhatsAppBridge } from './whatsapp.bridge';

/**
 * Fans an announcement/event out to recipients: writes in-app notifications (the source of
 * truth for the notification center), then best-effort push (FCM) and the feature-flagged
 * WhatsApp bridge.
 */
@Injectable()
export class DispatcherService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly push: PushService,
    private readonly whatsapp: WhatsAppBridge,
  ) {}

  async dispatch(params: {
    audience: AnnouncementAudience;
    sectionId?: string | null;
    title: string;
    body: string;
    category?: string;
    announcementId?: string;
  }): Promise<{ recipients: number }> {
    const userIds = await this.notifications.resolveRecipients(params.audience, params.sectionId);
    const created = await this.notifications.createMany(userIds, {
      title: params.title,
      body: params.body,
      category: params.category,
      announcementId: params.announcementId,
    });

    // Best-effort external channels (never block the in-app notification).
    const tokens = await this.notifications.deviceTokens(userIds);
    await this.push.sendToTokens(tokens, { title: params.title, body: params.body });
    await this.whatsapp.notify({ title: params.title, body: params.body });

    return { recipients: created };
  }
}
