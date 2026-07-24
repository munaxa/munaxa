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
    title: dict.legal.privacy.title,
    description: dict.legal.privacy.description,
    alternates: { canonical: '/privacy' },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/privacy`,
      siteName: SITE_NAME,
      title: dict.legal.privacy.title,
      description: dict.legal.privacy.description,
      locale: dict.meta.ogLocale,
      alternateLocale: dict.meta.alternateOgLocale,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.legal.privacy.title,
      description: dict.legal.privacy.description,
      images: ['/opengraph-image'],
    },
  };
}

export default async function PrivacyPage() {
  const [nonce, locale, theme] = await Promise.all([
    headers().then((h) => h.get('x-nonce') ?? undefined),
    getLocale(),
    getTheme(),
  ]);
  const dict = getDictionary(locale);
  const t = dict.legal.privacy;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: t.title, item: `${SITE_URL}/privacy` },
    ],
  };

  return (
    <>
      <LegalShell locale={locale} theme={theme} dict={dict} title={t.title}>
        <p>{t.intro}</p>

        <h2>{t.infoCollect.heading}</h2>
        <p>{t.infoCollect.intro}</p>
        <ul>
          {t.infoCollect.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.infoUse.heading}</h2>
        <ul>
          {t.infoUse.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{t.retention.heading}</h2>
        <p>{t.retention.body}</p>

        <h2>{t.sharing.heading}</h2>
        <p>{t.sharing.body}</p>

        <h2>{t.rights.heading}</h2>
        <p>
          {t.rights.before} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          {t.rights.after}
        </p>

        <h2>{t.security.heading}</h2>
        <p>{t.security.body}</p>

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
