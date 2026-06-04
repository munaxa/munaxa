'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@munaxa/ui';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({
        email,
        password,
        ...(tenantSlug ? { tenantSlug } : {}),
      });
      router.push(result.mustChangePassword ? '/change-password' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-8"
      >
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Munaxa</h1>
          <p className="text-sm text-muted-foreground">Sign in to your school</p>
        </div>

        <Field label="School" htmlFor="tenant">
          <input
            id="tenant"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="green-valley"
            className={inputClass}
            autoComplete="organization"
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </Field>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground',
            'transition disabled:opacity-50',
          )}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="font-mono text-xs uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
