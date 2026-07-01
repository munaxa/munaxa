import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentPageView } from '@/components/seo/content-page-view';
import { getByKind, findBySlug } from '@/content';
import { contentMetadata } from '@/lib/seo/content-metadata';
import { getPageContext } from '@/lib/page-context';
import { getLocale } from '@/lib/i18n/get-locale';

// Only the known country slugs are generated; every other single-segment path 404s,
// so this dynamic segment never shadows /features, /solutions, /privacy, etc.
export const dynamicParams = false;

export function generateStaticParams() {
  return getByKind('country').map((p) => ({ country: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const page = findBySlug('country', country);
  if (!page) return {};
  return contentMetadata(page, await getLocale());
}

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const page = findBySlug('country', country);
  if (!page) notFound();
  const { locale, theme, dict } = await getPageContext();
  return <ContentPageView page={page} locale={locale} theme={theme} dict={dict} />;
}
