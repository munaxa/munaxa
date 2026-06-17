import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { PostHogProvider } from '@/lib/posthog';
import { ToastProvider } from '@/components/toast';
import { ConfirmProvider } from '@/components/confirm';
import { I18nProvider } from '@/components/i18n-provider';
import { DEFAULT_LOCALE, directionForLocale } from '@/lib/i18n';

// Munaxa Design System type pairing: Sora (display) / Inter (body) / JetBrains Mono.
// Self-hosted (latin subset, variable) so builds don't depend on Google Fonts network access.
const sora = localFont({
  src: '../fonts/Sora-latin.woff2',
  weight: '100 800',
  variable: '--font-display',
  display: 'swap',
});
const inter = localFont({
  src: '../fonts/Inter-latin.woff2',
  weight: '100 900',
  variable: '--font-body',
  display: 'swap',
});
const mono = localFont({
  src: '../fonts/JetBrainsMono-latin.woff2',
  weight: '100 800',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Munaxa — School Operating System',
  description: 'Munaxa: a multi-tenant School Operating System for K-12 schools.',
};

/**
 * Root layout. Locale & direction default here; per-request locale resolution and the
 * locale switcher are wired in Phase 3 alongside auth/session. Brand fonts are exposed as
 * CSS variables consumed by the Tailwind preset (font-display / font-body / font-mono).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = DEFAULT_LOCALE;
  const dir = directionForLocale(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`dark ${sora.variable} ${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background bg-grad-hero font-body text-foreground antialiased">
        <PostHogProvider>
          <I18nProvider>
            <ToastProvider>
              <ConfirmProvider>{children}</ConfirmProvider>
            </ToastProvider>
          </I18nProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
