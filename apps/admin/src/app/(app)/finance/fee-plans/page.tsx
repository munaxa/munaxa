'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { useToast } from '@/components/toast';
import {
  FEE_RECURRENCES,
  feePlansApi,
  type CreateFeePlanInput,
  type FeePlan,
  type FeeRecurrence,
} from '@/lib/finance';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  EmptyState,
} from '@/components/ui';

export default function FeePlansPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FeePlan | null>(null);

  const load = useCallback(async () => {
    try {
      setPlans(await feePlansApi.list());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load fee plans');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(plan: FeePlan) {
    try {
      await feePlansApi.update(plan.id, { isActive: !plan.isActive });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    }
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.feePlans')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{editing ? t('feePlans.editTitle') : t('feePlans.create')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FeePlanForm
              key={editing?.id ?? 'new'}
              editing={editing}
              onDone={async () => {
                setEditing(null);
                await load();
              }}
              onCancel={() => setEditing(null)}
              onError={(m) => toast.error(m)}
            />
          </CardContent>
        </Card>

        <Table>
          <THead>
            <TR>
              <TH>{t('feePlans.name')}</TH>
              <TH>{t('feePlans.recurrence')}</TH>
              <TH className="text-end">{t('feePlans.amountJod')}</TH>
              <TH>{t('common.status')}</TH>
              <TH className="text-end">{t('common.actions')}</TH>
            </TR>
          </THead>
          <TBody>
            {plans.map((p) => (
              <TR key={p.id}>
                <TD>
                  {p.name}
                  {p.description ? (
                    <span className="block text-xs text-muted-foreground">{p.description}</span>
                  ) : null}
                </TD>
                <TD className="text-xs text-muted-foreground">{p.recurrence.replace('_', ' ')}</TD>
                <TD className="text-end font-mono text-xs">{p.amount}</TD>
                <TD>
                  <Badge tone={p.isActive ? 'success' : 'muted'}>
                    {p.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </TD>
                <TD className="text-end">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                      {t('common.edit')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void toggleActive(p)}>
                      {p.isActive ? t('common.deactivate') : t('common.activate')}
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
            {plans.length === 0 ? (
              <TR>
                <TD colSpan={5}>
                  <EmptyState title={t('feePlans.noPlans')} />
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </Shell>
  );
}

function FeePlanForm({
  editing,
  onDone,
  onCancel,
  onError,
}: {
  editing: FeePlan | null;
  onDone: () => Promise<void>;
  onCancel: () => void;
  onError: (m: string) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    amount: editing ? String(Number(editing.amount)) : '',
    recurrence: editing?.recurrence ?? 'ONE_TIME',
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: CreateFeePlanInput = {
        name: form.name,
        amount: Number(form.amount) || 0,
        recurrence: form.recurrence,
      };
      if (editing) {
        // Include description even when blank so it can be cleared.
        payload.description = form.description;
        await feePlansApi.update(editing.id, payload);
      } else {
        if (form.description) payload.description = form.description;
        await feePlansApi.create(payload);
        setForm({ name: '', description: '', amount: '', recurrence: 'ONE_TIME' });
      }
      await onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-2 sm:grid-cols-2">
      <Field label={t('feePlans.name')} className="sm:col-span-2">
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </Field>
      <Field label={t('feePlans.description')} className="sm:col-span-2">
        <Input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <Field label={t('feePlans.amountJod')}>
        <Input
          type="number"
          step="0.001"
          min={0}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
          dir="ltr"
        />
      </Field>
      <Field label={t('feePlans.recurrence')}>
        <Select
          value={form.recurrence}
          onChange={(e) => setForm({ ...form, recurrence: e.target.value as FeeRecurrence })}
        >
          {FEE_RECURRENCES.map((r) => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy
            ? t('common.saving')
            : editing
              ? t('feePlans.saveButton')
              : t('feePlans.createButton')}
        </Button>
        {editing ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
