'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
import { useConfirm } from '@/components/confirm';
import { parentsApi, type CreateParentInput, type Parent } from '@/lib/people';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';

const EMPTY: CreateParentInput = {
  firstNameEn: '',
  lastNameEn: '',
  firstNameAr: '',
  lastNameAr: '',
  phone: '',
  nationalId: '',
  occupation: '',
};

export default function ParentsPage() {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [parents, setParents] = useState<Parent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setParents(await parentsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load parents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (!(await confirm())) return;
    try {
      await parentsApi.remove(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
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
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="font-display text-2xl font-semibold">{t('nav.parents')}</h1>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t('people.addParent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateParent onCreated={load} onError={setError} />
          </CardContent>
        </Card>

        <Table>
          <THead>
            <TR>
              <TH>{t('common.name')}</TH>
              <TH>{t('common.arabicName')}</TH>
              <TH>{t('common.phone')}</TH>
              <TH>{t('people.nationalId')}</TH>
              <TH>{t('people.occupation')}</TH>
              <TH className="text-end">{t('common.actions')}</TH>
            </TR>
          </THead>
          <TBody>
            {parents.map((p) => (
              <TR key={p.id}>
                <TD>
                  {p.firstNameEn} {p.lastNameEn}
                </TD>
                <TD dir="rtl">
                  {p.firstNameAr} {p.lastNameAr}
                </TD>
                <TD className="font-mono text-xs" dir="ltr">
                  {p.phone || '—'}
                </TD>
                <TD className="font-mono text-xs text-muted-foreground">{p.nationalId || '—'}</TD>
                <TD>{p.occupation || '—'}</TD>
                <TD className="text-end">
                  <Button variant="ghost" size="sm" onClick={() => void remove(p.id)}>
                    {t('common.delete')}
                  </Button>
                </TD>
              </TR>
            ))}
            {parents.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-muted-foreground">
                  {t('people.noParents')}
                </TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
    </Shell>
  );
}

function CreateParent({
  onCreated,
  onError,
}: {
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<CreateParentInput>(EMPTY);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof CreateParentInput>(key: K, value: CreateParentInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload: CreateParentInput = {
        firstNameEn: form.firstNameEn,
        lastNameEn: form.lastNameEn,
        firstNameAr: form.firstNameAr,
        lastNameAr: form.lastNameAr,
      };
      if (form.phone) payload.phone = form.phone;
      if (form.nationalId) payload.nationalId = form.nationalId;
      if (form.occupation) payload.occupation = form.occupation;
      await parentsApi.create(payload);
      setForm(EMPTY);
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-2 sm:grid-cols-2">
      <Input
        placeholder={t('common.firstNameEn')}
        value={form.firstNameEn}
        onChange={(e) => set('firstNameEn', e.target.value)}
        required
      />
      <Input
        placeholder={t('common.lastNameEn')}
        value={form.lastNameEn}
        onChange={(e) => set('lastNameEn', e.target.value)}
        required
      />
      <Input
        placeholder="الاسم (AR)"
        value={form.firstNameAr}
        onChange={(e) => set('firstNameAr', e.target.value)}
        required
        dir="rtl"
      />
      <Input
        placeholder="العائلة (AR)"
        value={form.lastNameAr}
        onChange={(e) => set('lastNameAr', e.target.value)}
        required
        dir="rtl"
      />
      <Input
        placeholder={t('common.phone')}
        value={form.phone ?? ''}
        onChange={(e) => set('phone', e.target.value)}
        dir="ltr"
      />
      <Input
        placeholder={t('people.nationalId')}
        value={form.nationalId ?? ''}
        onChange={(e) => set('nationalId', e.target.value)}
      />
      <Input
        placeholder={t('people.occupation')}
        className="sm:col-span-2"
        value={form.occupation ?? ''}
        onChange={(e) => set('occupation', e.target.value)}
      />
      <Button type="submit" className="sm:col-span-2" disabled={busy}>
        {busy ? t('common.adding') : t('people.addParentButton')}
      </Button>
    </form>
  );
}
