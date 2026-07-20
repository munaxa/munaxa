import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentPageView } from '@/components/seo/content-page-view';
import { getByKind, findCity } from '@/content';
import { contentMetadata } from '@/lib/seo/content-metadata';
import { getPageContext } from '@/lib/page-context';
import { getLocale } from '@/lib/i18n/get-locale';

export const dynamicParams = false;

export function generateStaticParams() {
  return getByKind('city').map((p) => ({ country: p.parent!, city: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}): Promise<Metadata> {
  const { country, city } = await params;
  const page = findCity(country, city);
  if (!page) return {};
  return contentMetadata(page, await getLocale());
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}) {
  const { country, city } = await params;
  const page = findCity(country, city);
  if (!page) notFound();
  const { locale, theme, dict } = await getPageContext();
  return <ContentPageView page={page} locale={locale} theme={theme} dict={dict} />;
}
