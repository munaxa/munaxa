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

export function productJsonLd(p: {
  name: string;
  category: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: p.name,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: p.category,
    operatingSystem: 'Web',
    description: p.description,
    url: new URL(p.path, site.url).toString(),
    publisher: { '@type': 'Organization', name: site.legalName, url: site.url },
  };
}
