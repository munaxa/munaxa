import type { Metadata } from 'next';
import { Sora, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { PostHogProvider } from '@/lib/posthog';
import { ToastProvider } from '@/components/toast';
import { DEFAULT_LOCALE, directionForLocale } from '@/lib/i18n';

// Munaxa Design System type pairing: Sora (display) / Inter (body) / JetBrains Mono.
const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

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
          <ToastProvider>{children}</ToastProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
