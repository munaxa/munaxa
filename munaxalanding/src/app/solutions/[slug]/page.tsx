import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentPageView } from '@/components/seo/content-page-view';
import { getByKind, findBySlug } from '@/content';
import { contentMetadata } from '@/lib/seo/content-metadata';
import { getPageContext } from '@/lib/page-context';
import { getLocale } from '@/lib/i18n/get-locale';

export const dynamicParams = false;

export function generateStaticParams() {
  return getByKind('solution').map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = findBySlug('solution', slug);
  if (!page) return {};
  return contentMetadata(page, await getLocale());
}

export default async function SolutionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = findBySlug('solution', slug);
  if (!page) notFound();
  const { locale, theme, dict } = await getPageContext();
  return <ContentPageView page={page} locale={locale} theme={theme} dict={dict} />;
}
