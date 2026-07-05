import type { Metadata } from 'next';
import { CollectionView } from '@/components/seo/collection-view';
import { getByKind } from '@/content';
import { findHub } from '@/content/hubs';
import { hubMetadata } from '@/lib/seo/content-metadata';
import { getPageContext } from '@/lib/page-context';
import { getLocale } from '@/lib/i18n/get-locale';

const HUB = findHub('/integrations')!;

export async function generateMetadata(): Promise<Metadata> {
  return hubMetadata(HUB, await getLocale());
}

export default async function IntegrationsPage() {
  const { locale, theme, dict } = await getPageContext();
  return (
    <CollectionView
      hub={HUB}
      entries={getByKind('integration')}
      locale={locale}
      theme={theme}
      dict={dict}
    />
  );
}
