import { Injectable } from '@nestjs/common';
import type { AnnouncementAudience, Notification, Prisma, RoleKey } from '@prisma/client';
import { TenantRepository } from '../../common/tenant.repository';

@Injectable()
export class NotificationRepository extends TenantRepository {
  /** Resolve recipient userIds for an announcement audience (deduplicated). */
  resolveRecipients(audience: AnnouncementAudience, sectionId?: string | null): Promise<string[]> {
    return this.run(async (tx) => {
      const active = { status: 'ACTIVE' as const, deletedAt: null };

      if (audience === 'ALL') {
        const users = await tx.user.findMany({ where: active, select: { id: true } });
        return users.map((u) => u.id);
      }

      if (audience === 'PARENTS' || audience === 'TEACHERS' || audience === 'STUDENTS') {
        const roleKey: RoleKey =
          audience === 'PARENTS' ? 'Parent' : audience === 'TEACHERS' ? 'Teacher' : 'Student';
        const users = await tx.user.findMany({
          where: { ...active, userRoles: { some: { role: { key: roleKey } } } },
          select: { id: true },
        });
        return users.map((u) => u.id);
      }

      // SECTION: the section's students (with accounts) + their linked parents.
      if (!sectionId) return [];
      const students = await tx.student.findMany({
        where: { sectionId, deletedAt: null },
        select: { id: true, userId: true },
      });
      const links = await tx.parentStudent.findMany({
        where: { studentId: { in: students.map((s) => s.id) } },
        select: { parent: { select: { userId: true } } },
      });
      const ids = new Set<string>();
      for (const s of students) if (s.userId) ids.add(s.userId);
      for (const l of links) if (l.parent.userId) ids.add(l.parent.userId);
      return [...ids];
    });
  }

  createMany(
    userIds: string[],
    data: { title: string; body: string; category?: string; announcementId?: string },
  ): Promise<number> {
    if (userIds.length === 0) return Promise.resolve(0);
    return this.run(async (tx, tenantId) => {
      const result = await tx.notification.createMany({
        data: userIds.map((userId) => ({
          tenantId,
          userId,
          title: data.title,
          body: data.body,
          category: data.category ?? null,
          announcementId: data.announcementId ?? null,
        })),
      });
      return result.count;
    });
  }

  listForUser(userId: string): Promise<Notification[]> {
    return this.run((tx) =>
      tx.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    );
  }

  unreadCount(userId: string): Promise<number> {
    return this.run((tx) => tx.notification.count({ where: { userId, readAt: null } }));
  }

  markRead(id: string, userId: string): Promise<Prisma.BatchPayload> {
    return this.run((tx) =>
      tx.notification.updateMany({
        where: { id, userId, readAt: null },
        data: { readAt: new Date() },
      }),
    );
  }

  markAllRead(userId: string): Promise<Prisma.BatchPayload> {
    return this.run((tx) =>
      tx.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } }),
    );
  }

  /** Device tokens for a set of users (for push fan-out). */
  deviceTokens(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return Promise.resolve([]);
    return this.run(async (tx) => {
      const rows = await tx.deviceToken.findMany({
        where: { userId: { in: userIds } },
        select: { token: true },
      });
      return rows.map((r) => r.token);
    });
  }
}
