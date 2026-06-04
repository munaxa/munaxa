'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@munaxa/ui';
import { tokenStore } from '@/lib/auth';
import { schoolsApi, campusesApi, type School, type Campus } from '@/lib/structure';

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<School | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSchools(await schoolsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tokenStore.access) {
      router.replace('/login');
      return;
    }
    void load();
  }, [router, load]);

  if (loading) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="font-display text-2xl font-semibold">School structure</h1>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-medium">Schools</h2>
        <CreateSchool onCreated={load} onError={setError} />
        <ul className="divide-y divide-border rounded-xl border border-border">
          {schools.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-3">
              <button className="text-left" onClick={() => setSelected(s)}>
                <span className="font-medium">{s.nameEn}</span>{' '}
                <span className="text-muted-foreground">· {s.nameAr}</span>
              </button>
              <button
                className="text-xs text-destructive"
                onClick={() => void schoolsApi.remove(s.id).then(load)}
              >
                Delete
              </button>
            </li>
          ))}
          {schools.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">No schools yet.</li>
          ) : null}
        </ul>
      </section>

      {selected ? <Campuses school={selected} onError={setError} /> : null}
    </main>
  );
}

function CreateSchool({
  onCreated,
  onError,
}: {
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await schoolsApi.create({ nameEn, nameAr });
      setNameEn('');
      setNameAr('');
      await onCreated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-wrap gap-2">
      <input
        className={inputClass}
        placeholder="Name (EN)"
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        required
      />
      <input
        className={inputClass}
        placeholder="الاسم (AR)"
        value={nameAr}
        onChange={(e) => setNameAr(e.target.value)}
        required
        dir="rtl"
      />
      <button type="submit" className={btnClass}>
        Add school
      </button>
    </form>
  );
}

function Campuses({ school, onError }: { school: School; onError: (m: string) => void }) {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');

  const load = useCallback(async () => {
    try {
      setCampuses(await campusesApi.list(school.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to load campuses');
    }
  }, [school.id, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await campusesApi.create({ schoolId: school.id, nameEn, nameAr });
      setNameEn('');
      setNameAr('');
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-medium">Campuses · {school.nameEn}</h2>
      <form onSubmit={(e) => void submit(e)} className="flex flex-wrap gap-2">
        <input
          className={inputClass}
          placeholder="Campus (EN)"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          required
        />
        <input
          className={inputClass}
          placeholder="الحرم (AR)"
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          required
          dir="rtl"
        />
        <button type="submit" className={btnClass}>
          Add campus
        </button>
      </form>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {campuses.map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3">
            <span>
              {c.nameEn} · {c.nameAr}
              {c.isMain ? <span className="ml-2 text-xs text-aqua">main</span> : null}
            </span>
            <button
              className="text-xs text-destructive"
              onClick={() => void campusesApi.remove(c.id).then(load)}
            >
              Delete
            </button>
          </li>
        ))}
        {campuses.length === 0 ? (
          <li className="p-3 text-sm text-muted-foreground">No campuses yet.</li>
        ) : null}
      </ul>
    </section>
  );
}

const inputClass = cn(
  'rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none',
  'focus:ring-2 focus:ring-ring',
);
const btnClass = 'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground';
