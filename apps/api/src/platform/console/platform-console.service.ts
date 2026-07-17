import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlanTier } from '@munaxa/domain';
import { SubscriptionService, toPlanView } from '../../subscription/subscription.service';
import { PlatformConsoleRepository } from './platform-console.repository';
import type {
  ChangeSubscriptionDto,
  CreateCouponDto,
  DecideUpgradeRequestDto,
  SetFeatureOverrideDto,
  StartTrialDto,
  UpsertBillingProfileDto,
} from './platform-console.dto';

/**
 * Platform Console orchestration. Thin business layer over {@link PlatformConsoleRepository}:
 * applies subscription lifecycle transitions, resolves upgrade requests (approval applies the
 * plan change so features become active immediately), and computes dashboard/revenue rollups.
 */
@Injectable()
export class PlatformConsoleService {
  constructor(
    private readonly repo: PlatformConsoleRepository,
    private readonly subscriptions: SubscriptionService,
  ) {}

  // --- Schools ---------------------------------------------------------------

  async listSchools() {
    const rows = await this.repo.listSchools();
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      plan: t.subscription?.plan
        ? { tier: t.subscription.plan.tier, name: t.subscription.plan.name }
        : null,
      subscriptionStatus: t.subscription?.status ?? 'NONE',
      billingCycle: t.subscription?.billingCycle ?? null,
      renewal: t.subscription?.currentPeriodEnd?.toISOString() ?? null,
      trialEndsAt:
        t.trial && !t.trial.convertedAt && !t.trial.expiredAt ? t.trial.endsAt.toISOString() : null,
      students: t._count.students,
      campuses: t._count.campuses,
      users: t._count.users,
      storageGb: t.usageMetrics.get('storage_gb') ?? 0,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async getSchool(tenantId: string) {
    const t = await this.repo.getSchool(tenantId);
    if (!t) throw new NotFoundException('School not found');
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      counts: t._count,
      subscription: t.subscription
        ? {
            status: t.subscription.status,
            billingCycle: t.subscription.billingCycle,
            currentPeriodEnd: t.subscription.currentPeriodEnd?.toISOString() ?? null,
            trialEndsAt: t.subscription.trialEndsAt?.toISOString() ?? null,
            plan: toPlanView(t.subscription.plan),
            coupon: t.subscription.coupon?.code ?? null,
          }
        : null,
      trial: t.trial
        ? {
            planId: t.trial.planId,
            planName: t.trial.plan.name,
            endsAt: t.trial.endsAt.toISOString(),
            convertedAt: t.trial.convertedAt?.toISOString() ?? null,
            expiredAt: t.trial.expiredAt?.toISOString() ?? null,
          }
        : null,
      billingProfile: t.billingProfile,
      usage: t.subscriptionUsages.map((u) => ({ metric: u.metric, value: u.value })),
      overrides: t.featureOverrides.map((o) => ({
        key: o.key,
        enabled: o.enabled,
        limitOverride: o.limitOverride,
        reason: o.reason,
        expiresAt: o.expiresAt?.toISOString() ?? null,
      })),
      planChanges: t.planChanges.map((c) => ({
        from: c.fromPlan?.name ?? null,
        to: c.toPlan.name,
        toStatus: c.toStatus,
        reason: c.reason,
        createdAt: c.createdAt.toISOString(),
      })),
      upgradeRequests: t.upgradeRequests.map((r) => ({
        id: r.id,
        status: r.status,
        requestedPlan: r.requestedPlan.name,
        fromPlan: r.fromPlan?.name ?? null,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  // --- Subscriptions ---------------------------------------------------------

  listSubscriptions() {
    return this.repo.listSubscriptions();
  }

  async changeSubscription(tenantId: string, dto: ChangeSubscriptionDto) {
    const sub = await this.repo.applyPlanChange({
      tenantId,
      toPlanId: dto.planId,
      billingCycle: dto.billingCycle,
      status: dto.status,
      currentPeriodEnd:
        dto.currentPeriodEnd !== undefined
          ? dto.currentPeriodEnd
            ? new Date(dto.currentPeriodEnd)
            : null
          : undefined,
      reason: dto.reason ?? 'platform change',
    });
    this.subscriptions.invalidate(tenantId);
    return sub;
  }

  async setStatus(tenantId: string, status: string) {
    const sub = await this.repo.setSubscriptionStatus(tenantId, status);
    this.subscriptions.invalidate(tenantId);
    return sub;
  }

  // --- Upgrade requests ------------------------------------------------------

  listUpgradeRequests(status?: string) {
    return this.repo.listUpgradeRequests(status);
  }

  async decideUpgradeRequest(id: string, dto: DecideUpgradeRequestDto) {
    const req = await this.repo.getUpgradeRequest(id);
    if (!req) throw new NotFoundException('Upgrade request not found');
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Request already ${req.status.toLowerCase()}`);
    }

    if (dto.decision === 'APPROVE') {
      await this.repo.applyPlanChange({
        tenantId: req.tenantId,
        toPlanId: req.requestedPlanId,
        billingCycle: req.requestedCycle ?? undefined,
        status: 'ACTIVE',
        reason: 'upgrade request approved',
        upgradeRequestId: req.id,
      });
      this.subscriptions.invalidate(req.tenantId);
      return this.repo.markUpgradeRequestReviewed(id, 'APPROVED', dto.decisionNote);
    }
    return this.repo.markUpgradeRequestReviewed(id, 'REJECTED', dto.decisionNote);
  }

  // --- Trials ----------------------------------------------------------------

  listTrials() {
    return this.repo.listTrials();
  }

  async startTrial(tenantId: string, dto: StartTrialDto) {
    const trial = await this.repo.startTrial(tenantId, dto.planId, dto.days ?? 14);
    this.subscriptions.invalidate(tenantId);
    return trial;
  }

  async extendTrial(tenantId: string, days: number) {
    const trial = await this.repo.extendTrial(tenantId, days);
    this.subscriptions.invalidate(tenantId);
    return trial;
  }

  async endTrial(tenantId: string, convert: boolean) {
    const trial = await this.repo.endTrial(tenantId, convert);
    this.subscriptions.invalidate(tenantId);
    return trial;
  }

  // --- Billing ---------------------------------------------------------------

  getBillingProfile(tenantId: string) {
    return this.repo.getBillingProfile(tenantId);
  }

  upsertBillingProfile(tenantId: string, dto: UpsertBillingProfileDto) {
    return this.repo.upsertBillingProfile(tenantId, { tenantId, ...dto });
  }

  // --- Coupons ---------------------------------------------------------------

  listCoupons() {
    return this.repo.listCoupons();
  }

  createCoupon(dto: CreateCouponDto) {
    return this.repo.createCoupon(dto);
  }

  updateCoupon(id: string, data: Partial<CreateCouponDto> & { isActive?: boolean }) {
    return this.repo.updateCoupon(id, data);
  }

  // --- Feature overrides -----------------------------------------------------

  listOverrides(tenantId: string) {
    return this.repo.listOverrides(tenantId);
  }

  async setOverride(tenantId: string, dto: SetFeatureOverrideDto) {
    const override = await this.repo.setOverride(tenantId, dto.key, {
      enabled: dto.enabled ?? null,
      limitOverride: dto.limitOverride ?? null,
      reason: dto.reason ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    this.subscriptions.invalidate(tenantId);
    return override;
  }

  async deleteOverride(tenantId: string, key: string) {
    const res = await this.repo.deleteOverride(tenantId, key);
    this.subscriptions.invalidate(tenantId);
    return res;
  }

  // --- Audit -----------------------------------------------------------------

  listAudit(params: { tenantId?: string; action?: string; take?: number }) {
    return this.repo.listAudit(params);
  }

  // --- Plans -----------------------------------------------------------------

  async listPlans() {
    const plans = await this.repo.listPlans();
    return plans.map(toPlanView);
  }

  setPlanFeature(planId: string, key: string, enabled: boolean, limit: number | null) {
    return this.repo.setPlanFeature(planId, key, enabled, limit);
  }

  // --- Dashboard / revenue ---------------------------------------------------

  async dashboard() {
    const m = await this.repo.metrics();
    const byStatus: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    for (const s of m.subs) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      byTier[s.plan.tier] = (byTier[s.plan.tier] ?? 0) + 1;
    }
    return {
      schools: m.tenantCount,
      subscriptions: m.subs.length,
      pendingUpgradeRequests: m.pendingRequests,
      activeTrials: m.activeTrials,
      subscriptionsByStatus: byStatus,
      subscriptionsByTier: byTier,
      revenue: this.computeRevenue(m.subs),
    };
  }

  async revenue() {
    const m = await this.repo.metrics();
    return this.computeRevenue(m.subs);
  }

  /** MRR/ARR from active/trialing paid subscriptions (minor currency units). */
  private computeRevenue(
    subs: Array<{
      status: string;
      billingCycle: string;
      plan: { tier: string; priceMonthly: number | null; priceYearly: number | null };
    }>,
  ) {
    let mrr = 0;
    const perTier: Record<string, number> = {};
    for (const s of subs) {
      if (s.status !== 'ACTIVE' && s.status !== 'GRACE_PERIOD' && s.status !== 'PAST_DUE') continue;
      const monthly =
        s.billingCycle === 'YEARLY'
          ? Math.round((s.plan.priceYearly ?? 0) / 12)
          : (s.plan.priceMonthly ?? 0);
      mrr += monthly;
      perTier[s.plan.tier] = (perTier[s.plan.tier] ?? 0) + monthly;
    }
    return { mrr, arr: mrr * 12, currency: 'JOD', perTier };
  }

  /** Convenience: the Professional plan id (used as the default trial target). */
  async professionalPlanId(): Promise<string> {
    const plan = await this.repo.findPlanByTier(PlanTier.PROFESSIONAL);
    if (!plan) throw new NotFoundException('Professional plan not seeded');
    return plan.id;
  }
}
