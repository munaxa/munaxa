import { Injectable } from '@nestjs/common';
import type { Notification } from '@prisma/client';
import { NotificationRepository } from './notification.repository';

/** The in-app notification center, always scoped to the current user. */
@Injectable()
export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  listMine(userId: string): Promise<Notification[]> {
    return this.repo.listForUser(userId);
  }

  async unread(userId: string): Promise<{ count: number }> {
    return { count: await this.repo.unreadCount(userId) };
  }

  async markRead(id: string, userId: string): Promise<{ updated: number }> {
    const result = await this.repo.markRead(id, userId);
    return { updated: result.count };
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.repo.markAllRead(userId);
    return { updated: result.count };
  }
}
