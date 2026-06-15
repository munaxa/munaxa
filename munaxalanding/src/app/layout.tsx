import type { Metadata } from 'next';
import { Sora, Inter, Cairo, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { getLocale } from '@/lib/i18n/get-locale';
import { dirForLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n';
import { getTheme } from '@/lib/theme/get-theme';
import { cn } from '@/lib/cn';

const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
// Design-system v3: Cairo backs --font-arabic, used for display/body type when dir="rtl".
const cairo = Cairo({ subsets: ['latin', 'arabic'], variable: '--font-arabic', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: dict.meta.titleDefault,
      template: dict.meta.titleTemplate,
    },
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      url: SITE_URL,
      siteName: SITE_NAME,
      title: dict.meta.titleDefault,
      description: dict.meta.description,
      locale: dict.meta.ogLocale,
      alternateLocale: dict.meta.alternateOgLocale,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.titleDefault,
      description: dict.meta.description,
      images: ['/opengraph-image'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [nonce, locale, theme] = await Promise.all([
    headers().then((h) => h.get('x-nonce') ?? undefined),
    getLocale(),
    getTheme(),
  ]);
  const dict = getDictionary(locale);

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    image: `${SITE_URL}/logo.png`,
    description: dict.meta.description,
    email: 'info@munaxa.com',
    areaServed: ['Jordan', 'Middle East'],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'info@munaxa.com',
        contactType: 'sales',
        areaServed: ['Jordan', 'Middle East'],
        availableLanguage: ['English', 'Arabic'],
      },
    ],
    sameAs: [],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ['en', 'ar'],
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
