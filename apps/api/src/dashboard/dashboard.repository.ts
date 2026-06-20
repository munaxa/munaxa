import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantRepository } from '../common/tenant.repository';

const ZERO = new Prisma.Decimal(0);

export interface DashboardOverview {
  students: number;
  staff: number;
  attendanceToday: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    total: number;
  };
  finance: {
    billed: string;
    discounts: string;
    paid: string;
    outstanding: string;
    collectedThisMonth: string;
  };
  einvoice: { accepted: number; pending: number; rejected: number };
  recentActivity: Array<{
    action: string;
    entityType: string;
    entityId: string | null;
    actorName: string | null;
    actorUsername: string | null;
    actorRole: string | null;
    ip: string | null;
    at: string;
  }>;
}

/** Read-only tenant-wide aggregates for the admin dashboard (RLS-scoped like everything else). */
@Injectable()
export class DashboardRepository extends TenantRepository {
  overview(): Promise<DashboardOverview> {
    return this.run(async (tx, tenantId) => {
      const now = new Date();
      const todayUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      const [
        students,
        staff,
        attendanceGroups,
        billedAgg,
        discountAgg,
        paidAgg,
        monthAgg,
        einvoiceGroups,
        activity,
      ] = await Promise.all([
        tx.student.count({ where: { tenantId, deletedAt: null } }),
        tx.teacher.count({ where: { tenantId, deletedAt: null } }),
        tx.studentAttendance.groupBy({
          by: ['status'],
          where: { tenantId, date: todayUtc },
          _count: true,
        }),
        tx.charge.aggregate({
          where: { tenantId, status: { not: 'CANCELLED' } },
          _sum: { amount: true },
        }),
        tx.feeAdjustment.aggregate({
          where: { tenantId, status: 'APPLIED' },
          _sum: { amount: true },
        }),
        tx.transaction.aggregate({
          where: { tenantId, status: 'VERIFIED' },
          _sum: { amount: true },
        }),
        tx.transaction.aggregate({
          where: { tenantId, status: 'VERIFIED', createdAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        tx.eInvoiceDocument.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
        tx.auditLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            action: true,
            entityType: true,
            entityId: true,
            actorRole: true,
            metadata: true,
            ip: true,
            createdAt: true,
            actor: {
              select: { firstNameEn: true, lastNameEn: true, username: true, email: true },
            },
          },
        }),
      ]);

      const att = { present: 0, late: 0, absent: 0, excused: 0, total: 0 };
      for (const g of attendanceGroups) {
        const n = typeof g._count === 'number' ? g._count : 0;
        att.total += n;
        if (g.status === 'PRESENT') att.present = n;
        else if (g.status === 'LATE') att.late = n;
        else if (g.status === 'ABSENT') att.absent = n;
        else if (g.status === 'EXCUSED') att.excused = n;
      }

      const billed = billedAgg._sum.amount ?? ZERO;
      const discounts = discountAgg._sum.amount ?? ZERO;
      const paid = paidAgg._sum.amount ?? ZERO;
      const outstanding = Prisma.Decimal.max(billed.minus(discounts).minus(paid), ZERO);

      const einvoice = { accepted: 0, pending: 0, rejected: 0 };
      for (const g of einvoiceGroups) {
        const n = typeof g._count === 'number' ? g._count : 0;
        if (g.status === 'ACCEPTED') einvoice.accepted += n;
        else if (g.status === 'REJECTED' || g.status === 'DEAD_LETTER') einvoice.rejected += n;
        else if (g.status === 'QUEUED' || g.status === 'SUBMITTING' || g.status === 'DRAFT')
          einvoice.pending += n;
      }

      return {
        students,
        staff,
        attendanceToday: att,
        finance: {
          billed: billed.toFixed(3),
          discounts: discounts.toFixed(3),
          paid: paid.toFixed(3),
          outstanding: outstanding.toFixed(3),
          collectedThisMonth: (monthAgg._sum.amount ?? ZERO).toFixed(3),
        },
        einvoice,
        recentActivity: activity.map((a) => {
          const actor = a.actor;
          const fullName = actor
            ? `${actor.firstNameEn ?? ''} ${actor.lastNameEn ?? ''}`.trim()
            : '';
          // Failed logins for an unknown handle have no actor — surface the attempted identifier.
          const meta =
            a.metadata && typeof a.metadata === 'object' && !Array.isArray(a.metadata)
              ? (a.metadata as Record<string, unknown>)
              : {};
          const attempted = typeof meta.identifier === 'string' ? meta.identifier : null;
          return {
            action: a.action,
            entityType: a.entityType,
            entityId: a.entityId ?? null,
            actorName: fullName || null,
            actorUsername: actor?.username ?? actor?.email ?? attempted,
            actorRole: a.actorRole ?? null,
            ip: a.ip ?? null,
            at: a.createdAt.toISOString(),
          };
        }),
      };
    });
  }
}
