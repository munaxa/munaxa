import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { LegalShell } from '@/components/sections/legal-shell';
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/constants';
import { getLocale } from '@/lib/i18n/get-locale';
import { getDictionary } from '@/lib/i18n';
import { getTheme } from '@/lib/theme/get-theme';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.legal.terms.title,
    description: dict.legal.terms.description,
    alternates: { canonical: '/terms' },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/terms`,
      siteName: SITE_NAME,
      title: dict.legal.terms.title,
      description: dict.legal.terms.description,
      locale: dict.meta.ogLocale,
      alternateLocale: dict.meta.alternateOgLocale,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.legal.terms.title,
      description: dict.legal.terms.description,
      images: ['/opengraph-image'],
    },
  };
}

export default async function TermsPage() {
  const [nonce, locale, theme] = await Promise.all([
    headers().then((h) => h.get('x-nonce') ?? undefined),
    getLocale(),
    getTheme(),
  ]);
  const dict = getDictionary(locale);
  const t = dict.legal.terms;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: t.title, item: `${SITE_URL}/terms` },
    ],
  };

  return (
    <>
    <LegalShell locale={locale} theme={theme} dict={dict} title={t.title}>
      <p>{t.intro}</p>

      <h2>{t.use.heading}</h2>
      <p>{t.use.body}</p>

      <h2>{t.content.heading}</h2>
      <p>
        {t.content.before} {SITE_NAME} {t.content.after}
      </p>

      <h2>{t.inquiries.heading}</h2>
      <p>
        {t.inquiries.before} {SITE_NAME} {t.inquiries.after}
      </p>

      <h2>{t.noWarranty.heading}</h2>
      <p>{t.noWarranty.body}</p>

      <h2>{t.liability.heading}</h2>
      <p>
        {t.liability.before} {SITE_NAME} {t.liability.after}
      </p>

      <h2>{t.changes.heading}</h2>
      <p>{t.changes.body}</p>

      <h2>{t.contact.heading}</h2>
      <p>
        {t.contact.before} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        {t.contact.after}
      </p>
    </LegalShell>
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
    />
    </>
  );
}
