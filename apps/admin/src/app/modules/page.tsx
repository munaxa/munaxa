'use client';

import { useEffect, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { ADVANCED_MODULES, advancedApi, type FeatureFlag } from '@/lib/advanced';

export default function ModulesPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setError(null);
    try {
      const list: FeatureFlag[] = await advancedApi.flags();
      const map: Record<string, boolean> = {};
      for (const f of list) map[f.key] = f.enabled;
      setFlags(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(key: string) {
    setError(null);
    const next = !flags[key];
    setFlags((f) => ({ ...f, [key]: next }));
    try {
      await advancedApi.setFlag(key, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
      setFlags((f) => ({ ...f, [key]: !next })); // revert
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
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Advanced Modules</h1>
          <p className="text-sm text-muted-foreground">
            Optional modules are <strong>disabled by default</strong>. Enable one to expose its API
            and screens for this school.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="space-y-3">
          {ADVANCED_MODULES.map((m) => {
            const on = flags[m.key] ?? false;
            return (
              <li
                key={m.key}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="font-medium">{m.label}</p>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                </div>
                <button
                  onClick={() => void toggle(m.key)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium',
                    on
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-muted-foreground',
                  )}
                  aria-pressed={on}
                >
                  {on ? 'Enabled' : 'Disabled'}
                </button>
              </li>
            );
          })}
        </ul>

        {flags.bus_tracking ? <ModulePanel kind="bus" /> : null}
        {flags.library_management ? <ModulePanel kind="library" /> : null}
        {flags.inventory_management ? <ModulePanel kind="inventory" /> : null}
        {flags.school_clinic ? <ModulePanel kind="clinic" /> : null}
      </div>
    </Shell>
  );
}

type Kind = 'bus' | 'library' | 'inventory' | 'clinic';

function ModulePanel({ kind }: { kind: Kind }) {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const config: Record<Kind, { title: string; canCreate: boolean }> = {
    bus: { title: 'Bus routes', canCreate: true },
    library: { title: 'Library books', canCreate: true },
    inventory: { title: 'Inventory items', canCreate: true },
    clinic: { title: 'Recent clinic visits', canCreate: false },
  };

  async function load() {
    setError(null);
    try {
      if (kind === 'bus') setRows(await advancedApi.busRoutes());
      else if (kind === 'library') setRows(await advancedApi.books());
      else if (kind === 'inventory') setRows(await advancedApi.inventoryItems());
      else setRows(await advancedApi.clinicVisits());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  async function create() {
    if (!name) return;
    try {
      if (kind === 'bus') await advancedApi.createBusRoute(name);
      else if (kind === 'library') await advancedApi.createBook(name, 1);
      else if (kind === 'inventory') await advancedApi.createItem(name, 0);
      setName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    }
  }

  function label(row: Record<string, unknown>): string {
    if (kind === 'bus') return String(row.name);
    if (kind === 'library')
      return `${String(row.title)} (${String(row.copiesAvailable)}/${String(row.copiesTotal)})`;
    if (kind === 'inventory') return `${String(row.name)} — ${String(row.quantity)}`;
    return `${String(row.reason)} · ${String(row.outcome)}`;
  }

  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h2 className="font-medium">{config[kind].title}</h2>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {config[kind].canCreate ? (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="New name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            onClick={() => void create()}
          >
            Add
          </button>
        </div>
      ) : null}
      <ul className="divide-y divide-border text-sm">
        {rows.map((row, i) => (
          <li key={i} className="py-1.5">
            {label(row)}
          </li>
        ))}
        {rows.length === 0 ? <li className="py-1.5 text-muted-foreground">None yet.</li> : null}
      </ul>
    </section>
  );
}
