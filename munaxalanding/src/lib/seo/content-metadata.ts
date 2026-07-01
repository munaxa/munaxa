import type { Metadata } from 'next';
import { buildMetadata } from './metadata';
import { t } from '@/content/types';
import { pathFor } from '@/content';
import type { ContentPage } from '@/content/types';
import type { Hub } from '@/content/hubs';
import type { Locale } from '@/lib/i18n/config';

/** Build full metadata for a programmatic content page. */
export function contentMetadata(page: ContentPage, locale: Locale): Metadata {
  return buildMetadata({
    path: pathFor(page),
    locale,
    title: t(page.seoTitle, locale),
    description: t(page.metaDescription, locale),
    keywords: t(page.keywords, locale),
    ogType: page.kind === 'article' ? 'article' : 'website',
    ...(page.datePublished ? { publishedTime: page.datePublished } : {}),
    ...(page.dateModified ? { modifiedTime: page.dateModified } : {}),
  });
}

/** Build full metadata for a section hub (index) page. */
export function hubMetadata(hub: Hub, locale: Locale): Metadata {
  return buildMetadata({
    path: hub.path,
    locale,
    title: t(hub.seoTitle, locale),
    description: t(hub.metaDescription, locale),
    keywords: t(hub.keywords, locale),
  });
}
