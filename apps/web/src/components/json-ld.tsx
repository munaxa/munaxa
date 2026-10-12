import { corporateBrand } from '@munaxa/ui';
import type { FaqItem } from '@/components/faq';
import { site } from '@/lib/site';

/** Structured data for search engines. Escaping `<` keeps the JSON inert inside the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

const abs = (path: string) => new URL(path, site.url).toString();

/** Stable node ids, so every page's graph points at the same organization and website. */
const orgId = abs('/#organization');
const websiteId = abs('/#website');

/**
 * The company and the website. The WebSite node's `name` is what Google shows as the site name
 * in results, and `alternateName` lets "Munaxa Corporate" resolve to the same brand. The hub's
 * FAQ rides along.
 */
export function hubJsonLd(faqs: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: site.name,
        legalName: site.legalName,
        alternateName: site.legalName,
        url: abs('/'),
        logo: {
          '@type': 'ImageObject',
          url: abs(corporateBrand.assets.symbol.src),
        },
        description: site.description,
        email: site.contactEmail,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'sales',
          email: site.contactEmail,
          availableLanguage: ['English', 'Arabic'],
        },
        ...(site.sameAs.length > 0 && { sameAs: site.sameAs }),
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: site.name,
        alternateName: [site.legalName, 'munaxa.com'],
        url: abs('/'),
        description: site.description,
        inLanguage: 'en',
        publisher: { '@id': orgId },
      },
      faqJsonLd(faqs, abs('/')),
    ],
  };
}

/** A product page: the application itself, its breadcrumb under the hub, and its FAQ. */
export function productJsonLd(p: {
  name: string;
  category: string;
  description: string;
  path: string;
  image: string;
  faqs: FaqItem[];
}) {
  const url = abs(p.path);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${url}#software`,
        name: p.name,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: p.category,
        operatingSystem: 'Web',
        description: p.description,
        url,
        image: abs(p.image),
        publisher: { '@id': orgId },
        brand: { '@id': orgId },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: site.name, item: abs('/') },
          { '@type': 'ListItem', position: 2, name: p.name, item: url },
        ],
      },
      faqJsonLd(p.faqs, url),
    ],
  };
}

/** The questions a page answers, word for word as they appear on it. */
function faqJsonLd(faqs: FaqItem[], url: string) {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    isPartOf: { '@id': websiteId },
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
