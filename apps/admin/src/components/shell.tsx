'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IDLE_TIMEOUT_MS, logout, type Principal } from '@/lib/auth';
import { clearPrincipalCache, loadPrincipal } from '@/lib/session';
import { AppShell } from './app-shell';
import { Spinner } from './ui';

/** User-activity events that reset the inactivity countdown. */
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Signs the user out after {@link IDLE_TIMEOUT_MS} of no interaction. The timer is reset
 * on any tracked activity event; on expiry we revoke the session and redirect to /login.
 */
function useIdleLogout(active: boolean): void {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!active) return;

    const signOut = () => {
      void logout().finally(() => {
        clearPrincipalCache();
        router.replace('/login');
      });
    };
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(signOut, IDLE_TIMEOUT_MS);
    };

    reset();
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, reset, { passive: true });
    return () => {
      clearTimeout(timer.current);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, reset);
    };
  }, [active, router]);
}

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

  useIdleLogout(Boolean(principal));

  useEffect(() => {
    // The session lives in httpOnly cookies (not readable here), so we just try to resolve the
    // principal: success means a valid cookie session; failure (401 after refresh) → /login.
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
