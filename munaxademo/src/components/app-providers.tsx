'use client';

import type { ReactNode } from 'react';
import { DemoDataProvider } from '@/lib/demo-store/context';
import { SessionProvider } from '@/lib/session-context';
import { OnboardingProvider } from './onboarding-tour';
import { DemoBanner } from './demo-banner';
import { AppShell } from './app-shell';

/**
 * Client provider stack for every authenticated page:
 *   DemoDataProvider  → the session-only working dataset (resets to baseline)
 *   SessionProvider   → active persona, locale, theme, logout
 *   OnboardingProvider→ guided walkthrough
 *   DemoBanner        → permanent "this is a demo" banner
 *   AppShell          → the Munaxa nav rail + top bar
 */
export function AppProviders({
  org,
  isAdmin,
  children,
}: {
  org: string;
  isAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <DemoDataProvider>
      <SessionProvider org={org} isAdmin={isAdmin}>
        <OnboardingProvider>
          <DemoBanner />
          <AppShell>{children}</AppShell>
        </OnboardingProvider>
      </SessionProvider>
    </DemoDataProvider>
  );
}
