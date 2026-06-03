import type { Metadata } from 'next';
import './globals.css';
import { PostHogProvider } from '@/lib/posthog';
import { DEFAULT_LOCALE, directionForLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Munaxa — School Operating System',
  description: 'Munaxa: a multi-tenant School Operating System for K-12 schools.',
};

/**
 * Root layout. Locale & direction default here; per-request locale resolution and the
 * locale switcher are wired in Phase 3 alongside auth/session.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = DEFAULT_LOCALE;
  const dir = directionForLocale(locale);

  return (
    <html lang={locale} dir={dir} className="dark" suppressHydrationWarning>
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
