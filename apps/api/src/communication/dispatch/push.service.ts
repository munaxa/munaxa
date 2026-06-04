import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Firebase Cloud Messaging push. firebase-admin is imported lazily and only used when
 * configured; otherwise sends are logged (no-op) so the flow works without credentials.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    this.configured = Boolean(
      config.get('FIREBASE_PROJECT_ID') && config.get('FIREBASE_PRIVATE_KEY'),
    );
  }

  async sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
    if (tokens.length === 0) return;
    if (!this.configured) {
      this.logger.debug(`[push noop] ${tokens.length} token(s): ${payload.title}`);
      return;
    }
    try {
      const admin = await import('firebase-admin');
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
      });
    } catch (error) {
      this.logger.warn(`Push send failed: ${String(error)}`);
    }
  }
}
