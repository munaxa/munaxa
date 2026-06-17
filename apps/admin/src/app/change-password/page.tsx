'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword } from '@/lib/auth';
import { useI18n } from '@/components/i18n-provider';
import { Button, Card, CardContent, Field, Input } from '@/components/ui';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
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
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-display text-2xl font-semibold">{t('changePassword.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('changePassword.subtitle')}</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
              <Field label={t('changePassword.currentPassword')} htmlFor="current">
                <Input
                  id="current"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>
              <Field label={t('changePassword.newPassword')} htmlFor="new">
                <Input
                  id="new"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNew(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t('common.saving') : t('changePassword.updatePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
