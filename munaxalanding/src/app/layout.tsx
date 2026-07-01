import type { Metadata, Viewport } from 'next';
import { Sora, Inter, Cairo, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { getLocale } from '@/lib/i18n/get-locale';
import { dirForLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n';
import { getTheme } from '@/lib/theme/get-theme';
import { cn } from '@/lib/cn';
import { buildMetadata } from '@/lib/seo/metadata';
import { THEME_COLOR_LIGHT } from '@/lib/seo/config';
import * as schema from '@/lib/seo/jsonld';
import { Analytics } from '@/components/analytics/analytics';

const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
// munaxadesignsystem: Cairo backs --font-arabic, used for display/body type when dir="rtl".
const cairo = Cairo({ subsets: ['latin', 'arabic'], variable: '--font-arabic', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: THEME_COLOR_LIGHT,
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const base = buildMetadata({
    path: '/',
    locale,
    title: dict.meta.titleDefault,
    description: dict.meta.description,
    keywords: dict.meta.keywords,
  });

  // Preserve the "%s — Munaxa" title template so child pages inherit the brand suffix.
  return {
    ...base,
    title: { default: dict.meta.titleDefault, template: dict.meta.titleTemplate },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [nonce, locale, theme] = await Promise.all([
    headers().then((h) => h.get('x-nonce') ?? undefined),
    getLocale(),
    getTheme(),
  ]);

  return (
    <html
      lang={locale}
      dir={dirForLocale(locale)}
      className={cn(
        sora.variable,
        inter.variable,
        cairo.variable,
        jetbrainsMono.variable,
        theme === 'dark' && 'dark',
      )}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-body text-foreground antialiased">
        {children}
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.organization()) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema.website()) }}
        />
        <Analytics />
      </body>
    </html>
  );
}
