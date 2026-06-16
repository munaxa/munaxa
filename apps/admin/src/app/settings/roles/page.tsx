'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import { useI18n } from '@/components/i18n-provider';
import { rolesApi, type PermissionCatalogEntry, type RoleSummary } from '@/lib/roles';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@/components/ui';

export default function RolesPage() {
  return (
    <Shell>
      <RolesAdmin />
    </Shell>
  );
}

function RolesAdmin() {
  const toast = useToast();
  const { t } = useI18n();
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([rolesApi.list(), rolesApi.catalog()]);
      setRoles(r);
      setCatalog(c);
      setSelectedId((prev) => prev ?? r[0]?.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  function upsertRole(role: RoleSummary) {
    setRoles((prev) => {
      const i = prev.findIndex((r) => r.id === role.id);
      if (i === -1) return [...prev, role];
      const next = [...prev];
      next[i] = role;
      return next;
    });
    setSelectedId(role.id);
  }

  async function createRole() {
    try {
      const role = await rolesApi.create({ nameEn: 'New role', permissions: [] });
      upsertRole(role);
      toast.success('Role created — edit its permissions below');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create role');
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('roles.loadingRoles')}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{t('roles.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('roles.subtitle')}</p>
        </div>
        <Button onClick={() => void createRole()}>{t('roles.newRole')}</Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-2">
            <ul className="space-y-0.5">
              {roles.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition',
                      r.id === selectedId
                        ? 'bg-secondary/80 font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                    )}
                  >
                    <span className="truncate">{r.nameEn || r.key}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {r.isSystem ? (
                        <Badge tone="muted">{t('common.system')}</Badge>
                      ) : (
                        <Badge tone="default">{t('common.custom')}</Badge>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {selected ? (
          <RoleEditor
            key={selected.id}
            role={selected}
            catalog={catalog}
            onSaved={upsertRole}
            onDeleted={(id) => {
              setRoles((prev) => prev.filter((r) => r.id !== id));
              setSelectedId(null);
            }}
          />
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {t('roles.selectToEdit')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function RoleEditor({
  role,
  catalog,
  onSaved,
  onDeleted,
}: {
  role: RoleSummary;
  catalog: PermissionCatalogEntry[];
  onSaved: (r: RoleSummary) => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const { t } = useI18n();
  const [nameEn, setNameEn] = useState(role.nameEn ?? role.key);
  const [nameAr, setNameAr] = useState(role.nameAr ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const grouped = useMemo(() => {
    const m = new Map<string, PermissionCatalogEntry[]>();
    for (const p of catalog) {
      const arr = m.get(p.category) ?? [];
      arr.push(p);
      m.set(p.category, arr);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog]);

  const dirty =
    nameEn !== (role.nameEn ?? role.key) ||
    nameAr !== (role.nameAr ?? '') ||
    selected.size !== role.permissions.length ||
    role.permissions.some((p) => !selected.has(p));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(entries: PermissionCatalogEntry[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of entries) {
        if (on) next.add(e.key);
        else next.delete(e.key);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await rolesApi.update(role.id, {
        nameEn,
        nameAr,
        permissions: [...selected],
      });
      onSaved(updated);
      toast.success('Role saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete the “${nameEn}” role? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await rolesApi.remove(role.id);
      onDeleted(role.id);
      toast.success('Role deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {role.nameEn || role.key}
              {role.isSystem ? (
                <Badge tone="muted">{t('common.system')}</Badge>
              ) : (
                <Badge tone="default">{t('common.custom')}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              <span className="font-mono text-xs">{role.key}</span> · {role.userCount}{' '}
              {role.userCount === 1 ? t('roles.userSuffix') : t('roles.usersSuffix')} ·{' '}
              {selected.size}{' '}
              {selected.size === 1 ? t('roles.permissionSuffix') : t('roles.permissionsSuffix')}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!role.isSystem ? (
              <Button variant="outline" size="sm" onClick={() => void remove()} disabled={deleting}>
                {t('common.delete')}
              </Button>
            ) : null}
            <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('roles.nameEn')}>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </Field>
          <Field label={t('roles.nameAr')}>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
          </Field>
        </div>

        {role.isSystem ? (
          <p className="rounded-lg border border-border bg-secondary/30 p-2 text-xs text-muted-foreground">
            {t('roles.builtInNote')}
          </p>
        ) : null}

        <div className="space-y-4">
          {grouped.map(([category, entries]) => {
            const allOn = entries.every((e) => selected.has(e.key));
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold">{titleCase(category)}</h3>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => toggleGroup(entries, !allOn)}
                  >
                    {allOn ? t('roles.clear') : t('roles.selectAll')}
                  </button>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {entries.map((p) => (
                    <label
                      key={p.key}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm hover:bg-secondary/40"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-primary"
                        checked={selected.has(p.key)}
                        onChange={() => toggle(p.key)}
                      />
                      <span>
                        <span className="font-mono text-xs">{p.key}</span>
                        {p.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {p.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
