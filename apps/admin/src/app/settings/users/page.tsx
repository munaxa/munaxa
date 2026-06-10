'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@munaxa/ui';
import { Shell } from '@/components/shell';
import { useToast } from '@/components/toast';
import { usersApi, type UserStatus, type UserSummary } from '@/lib/users';
import { rolesApi, type RoleSummary } from '@/lib/roles';
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
  Select,
} from '@/components/ui';

const STATUS_TONE: Record<UserStatus, 'success' | 'warning' | 'danger' | 'muted'> = {
  ACTIVE: 'success',
  INVITED: 'muted',
  SUSPENDED: 'warning',
  DISABLED: 'danger',
};

function displayName(u: UserSummary): string {
  return [u.firstNameEn, u.lastNameEn].filter(Boolean).join(' ').trim() || u.email;
}

export default function UsersPage() {
  return (
    <Shell>
      <UsersAdmin />
    </Shell>
  );
}

function UsersAdmin() {
  const toast = useToast();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([usersApi.list(), rolesApi.list()]);
      setUsers(u);
      setRoles(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  function upsertUser(u: UserSummary) {
    setUsers((prev) => {
      const i = prev.findIndex((x) => x.id === u.id);
      if (i === -1) return [u, ...prev];
      const next = [...prev];
      next[i] = u;
      return next;
    });
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading users…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Users &amp; staff</h1>
          <p className="text-sm text-muted-foreground">
            Create accounts, assign roles, and manage access for your school.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
          }}
        >
          New user
        </Button>
      </header>

      {tempPassword ? (
        <Card className="border-primary/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="text-sm">
              <p className="font-medium">Temporary password for {tempPassword.email}</p>
              <p className="text-muted-foreground">
                Share it securely — it’s shown once and must be changed at first login.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded-md bg-secondary px-3 py-1.5 font-mono text-sm">
                {tempPassword.password}
              </code>
              <Button variant="outline" size="sm" onClick={() => setTempPassword(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card className="h-fit">
          <CardContent className="p-2">
            {users.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <ul className="space-y-0.5">
                {users.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(u.id);
                        setCreating(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm transition',
                        u.id === selectedId && !creating
                          ? 'bg-secondary/80 text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {displayName(u)}
                        </span>
                        <span className="block truncate text-xs">{u.email}</span>
                      </span>
                      <Badge tone={STATUS_TONE[u.status]}>{u.status.toLowerCase()}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {creating ? (
          <CreateUser
            roles={roles}
            onCancel={() => setCreating(false)}
            onCreated={(u, password) => {
              upsertUser(u);
              setCreating(false);
              setSelectedId(u.id);
              setTempPassword({ email: u.email, password });
            }}
          />
        ) : selected ? (
          <UserEditor
            key={selected.id}
            user={selected}
            roles={roles}
            onSaved={upsertUser}
            onTempPassword={(password) => setTempPassword({ email: selected.email, password })}
          />
        ) : (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Select a user, or create a new one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function RoleCheckboxes({
  roles,
  selected,
  onToggle,
}: {
  roles: RoleSummary[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {roles.map((r) => (
        <label
          key={r.id}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-secondary/40"
        >
          <input
            type="checkbox"
            className="accent-primary"
            checked={selected.has(r.id)}
            onChange={() => onToggle(r.id)}
          />
          <span className="flex-1">{r.nameEn || r.key}</span>
          {r.isSystem ? <Badge tone="muted">system</Badge> : <Badge tone="default">custom</Badge>}
        </label>
      ))}
    </div>
  );
}

function CreateUser({
  roles,
  onCancel,
  onCreated,
}: {
  roles: RoleSummary[];
  onCancel: () => void;
  onCreated: (user: UserSummary, temporaryPassword: string) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstNameEn, setFirstNameEn] = useState('');
  const [lastNameEn, setLastNameEn] = useState('');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { user, temporaryPassword } = await usersApi.create({
        email: email.trim(),
        ...(username.trim() ? { username: username.trim() } : {}),
        ...(firstNameEn.trim() ? { firstNameEn: firstNameEn.trim() } : {}),
        ...(lastNameEn.trim() ? { lastNameEn: lastNameEn.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        roleIds: [...selected],
      });
      onCreated(user, temporaryPassword);
      toast.success('User created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New user</CardTitle>
        <CardDescription>A one-time temporary password is generated on creation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@school.edu.jo"
            />
          </Field>
          <Field label="Username (optional)">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="for students without email"
              autoComplete="off"
            />
          </Field>
          <Field label="First name">
            <Input value={firstNameEn} onChange={(e) => setFirstNameEn(e.target.value)} />
          </Field>
          <Field label="Last name">
            <Input value={lastNameEn} onChange={(e) => setLastNameEn(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold">Roles</h3>
          <RoleCheckboxes roles={roles} selected={selected} onToggle={toggle} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={busy || !email.trim()}>
            {busy ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UserEditor({
  user,
  roles,
  onSaved,
  onTempPassword,
}: {
  user: UserSummary;
  roles: RoleSummary[];
  onSaved: (u: UserSummary) => void;
  onTempPassword: (password: string) => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [firstNameEn, setFirstNameEn] = useState(user.firstNameEn ?? '');
  const [lastNameEn, setLastNameEn] = useState(user.lastNameEn ?? '');
  const [firstNameAr, setFirstNameAr] = useState(user.firstNameAr ?? '');
  const [lastNameAr, setLastNameAr] = useState(user.lastNameAr ?? '');
  const [username, setUsername] = useState(user.username ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set(user.roles.map((r) => r.id)));
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const rolesDirty =
    selected.size !== user.roles.length || user.roles.some((r) => !selected.has(r.id));
  const profileDirty =
    firstNameEn !== (user.firstNameEn ?? '') ||
    lastNameEn !== (user.lastNameEn ?? '') ||
    firstNameAr !== (user.firstNameAr ?? '') ||
    lastNameAr !== (user.lastNameAr ?? '') ||
    username !== (user.username ?? '') ||
    phone !== (user.phone ?? '');
  const dirty = status !== user.status || rolesDirty || profileDirty;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      let updated = user;
      if (status !== user.status || profileDirty) {
        updated = await usersApi.update(user.id, {
          ...(status !== user.status ? { status } : {}),
          firstNameEn,
          lastNameEn,
          firstNameAr,
          lastNameAr,
          username,
          phone,
        });
      }
      if (rolesDirty) updated = await usersApi.setRoles(user.id, [...selected]);
      onSaved(updated);
      toast.success('User saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setResetting(true);
    try {
      const { temporaryPassword } = await usersApi.resetPassword(user.id);
      onTempPassword(temporaryPassword);
      toast.success('Password reset');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{displayName(user)}</CardTitle>
            <CardDescription>
              {user.email}
              {user.username ? (
                <span className="ms-2 font-mono text-xs">@{user.username}</span>
              ) : null}
              {user.lastNameAr || user.firstNameAr ? (
                <span className="ms-2" dir="rtl">
                  {[user.firstNameAr, user.lastNameAr].filter(Boolean).join(' ')}
                </span>
              ) : null}
              {' · '}
              {user.lastLoginAt
                ? `last login ${new Date(user.lastLoginAt).toLocaleDateString()}`
                : 'never logged in'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void reset()} disabled={resetting}>
              Reset password
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <Input value={firstNameEn} onChange={(e) => setFirstNameEn(e.target.value)} />
          </Field>
          <Field label="Last name">
            <Input value={lastNameEn} onChange={(e) => setLastNameEn(e.target.value)} />
          </Field>
          <Field label="First name (Arabic)">
            <Input value={firstNameAr} onChange={(e) => setFirstNameAr(e.target.value)} dir="rtl" />
          </Field>
          <Field label="Last name (Arabic)">
            <Input value={lastNameAr} onChange={(e) => setLastNameAr(e.target.value)} dir="rtl" />
          </Field>
          <Field label="Username">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DISABLED">Disabled</option>
            {user.status === 'INVITED' ? <option value="INVITED">Invited</option> : null}
          </Select>
        </Field>
        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold">Roles</h3>
          <RoleCheckboxes roles={roles} selected={selected} onToggle={toggle} />
        </div>
      </CardContent>
    </Card>
  );
}
