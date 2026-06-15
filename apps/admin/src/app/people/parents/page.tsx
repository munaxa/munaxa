'use client';

import { useCallback, useEffect, useState } from 'react';
import { Shell } from '@/components/shell';
import { useI18n } from '@/components/i18n-provider';
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
        <p className="text-muted-foreground">Loading…</p>
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
            <CardTitle>Add a parent / guardian</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateParent onCreated={load} onError={setError} />
          </CardContent>
        </Card>

        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Arabic name</TH>
              <TH>Phone</TH>
              <TH>National ID</TH>
              <TH>Occupation</TH>
              <TH className="text-end">Actions</TH>
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
                    Delete
                  </Button>
                </TD>
              </TR>
            ))}
            {parents.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-muted-foreground">
                  No parents yet.
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
        placeholder="First name (EN)"
        value={form.firstNameEn}
        onChange={(e) => set('firstNameEn', e.target.value)}
        required
      />
      <Input
        placeholder="Last name (EN)"
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
        placeholder="Phone"
        value={form.phone ?? ''}
        onChange={(e) => set('phone', e.target.value)}
        dir="ltr"
      />
      <Input
        placeholder="National ID"
        value={form.nationalId ?? ''}
        onChange={(e) => set('nationalId', e.target.value)}
      />
      <Input
        placeholder="Occupation"
        className="sm:col-span-2"
        value={form.occupation ?? ''}
        onChange={(e) => set('occupation', e.target.value)}
      />
      <Button type="submit" className="sm:col-span-2" disabled={busy}>
        {busy ? 'Adding…' : 'Add parent'}
      </Button>
    </form>
  );
}
