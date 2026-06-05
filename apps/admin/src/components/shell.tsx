'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokenStore, type Principal } from '@/lib/auth';
import { loadPrincipal } from '@/lib/session';
import { AppShell } from './app-shell';
import { Spinner } from './ui';

const PrincipalContext = createContext<Principal | null>(null);

/** Read the authenticated principal inside a {@link Shell}. */
export function usePrincipal(): Principal {
  const principal = useContext(PrincipalContext);
  if (!principal) throw new Error('usePrincipal must be used within <Shell>');
  return principal;
}

/**
 * Auth-guarded application shell for every signed-in page: redirects to /login when there's no
 * session, resolves the principal once (cached), and renders the {@link AppShell} chrome around
 * the page. Page content reads the principal via {@link usePrincipal}.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.access) {
      router.replace('/login');
      return;
    }
    loadPrincipal()
      .then(setPrincipal)
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !principal) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> Loading…
      </div>
    );
  }

  return (
    <PrincipalContext.Provider value={principal}>
      <AppShell principal={principal}>{children}</AppShell>
    </PrincipalContext.Provider>
  );
}
