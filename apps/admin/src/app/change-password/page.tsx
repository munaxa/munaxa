'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@munaxa/ui';
import { changePassword } from '@/lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
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
        <h1 className="font-display text-xl font-semibold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a password with at least 10 characters, including upper, lower and a digit.
        </p>
        <input
          type="password"
          required
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
          autoComplete="current-password"
        />
        <input
          type="password"
          required
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className={inputClass}
          autoComplete="new-password"
        />
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
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </main>
  );
}

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
