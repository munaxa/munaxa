/**
 * Content registry — the single entry point the routing + SEO layers query.
 *
 * Resolves slugs to entries, builds canonical paths, powers the internal-linking engine,
 * and exposes every public content path for the sitemap. Adding a new page is purely a
 * data change in one of the content files; no route or component edits are required.
 */
import type { ContentPage, ContentKind, RelatedRefs } from './types';
import { t } from './types';
import { features } from './features';
import { solutions } from './solutions';
import { countries, cities, COUNTRY_ISO } from './countries';
import { integrations } from './integrations';
import { comparisons } from './comparisons';
import { articles } from './articles';
import type { Locale } from '@/lib/i18n/config';

export type { ContentPage } from './types';
export { t } from './types';
export { COUNTRY_ISO };

export const collections = {
  feature: features,
  solution: solutions,
  country: countries,
  city: cities,
  integration: integrations,
  comparison: comparisons,
  article: articles,
} satisfies Record<ContentKind, ContentPage[]>;

/** Base URL segment for each content kind (city is nested under its country). */
export const SECTION_PATH: Record<ContentKind, string> = {
  feature: '/features',
  solution: '/solutions',
  country: '',
  city: '',
  integration: '/integrations',
  comparison: '/compare',
  article: '/blog',
};

/** Canonical app-relative path for a content page. */
export function pathFor(page: ContentPage): string {
  switch (page.kind) {
    case 'country':
      return `/${page.slug}`;
    case 'city':
      return `/${page.parent}/${page.slug}`;
    default:
      return `${SECTION_PATH[page.kind]}/${page.slug}`;
  }
}

export function getByKind(kind: ContentKind): ContentPage[] {
  return collections[kind];
}

export function findBySlug(kind: ContentKind, slug: string): ContentPage | undefined {
  return collections[kind].find((p) => p.slug === slug);
}

export function findCity(country: string, slug: string): ContentPage | undefined {
  return cities.find((c) => c.parent === country && c.slug === slug);
}

/** Cities belonging to a given country slug. */
export function citiesFor(country: string): ContentPage[] {
  return cities.filter((c) => c.parent === country);
}

/** Resolve a related-refs block into concrete, existing pages (unknown slugs skipped). */
export interface ResolvedLink {
  kind: ContentKind;
  slug: string;
  path: string;
  name: string;
  description: string;
}

export function resolveRelated(refs: RelatedRefs | undefined, locale: Locale): ResolvedLink[] {
  if (!refs) return [];
  const out: ResolvedLink[] = [];
  const pull = (kind: ContentKind, slugs?: string[]) => {
    for (const slug of slugs ?? []) {
      const page = findBySlug(kind, slug);
      if (!page) continue;
      out.push({
        kind,
        slug,
        path: pathFor(page),
        name: t(page.name, locale),
        description: t(page.metaDescription, locale),
      });
    }
  };
  pull('feature', refs.features);
  pull('solution', refs.solutions);
  pull('country', refs.countries);
  pull('integration', refs.integrations);
  pull('comparison', refs.comparisons);
  pull('article', refs.articles);
  return out;
}

/** Every indexable content path — consumed by the sitemap generator. */
export function allContentPaths(): { path: string; lastModified?: string; kind: ContentKind }[] {
  const all: ContentPage[] = [
    ...features,
    ...solutions,
    ...countries,
    ...cities,
    ...integrations,
    ...comparisons,
    ...articles,
  ];
  return all.map((p) => ({
    path: pathFor(p),
    kind: p.kind,
    ...(p.dateModified || p.datePublished
      ? { lastModified: p.dateModified ?? p.datePublished }
      : {}),
  }));
}

/** Section hub definitions (the index pages: /features, /solutions, …). */
export const HUBS = [
  { kind: 'feature' as const, path: '/features' },
  { kind: 'solution' as const, path: '/solutions' },
  { kind: 'integration' as const, path: '/integrations' },
  { kind: 'comparison' as const, path: '/compare' },
  { kind: 'article' as const, path: '/blog' },
];
