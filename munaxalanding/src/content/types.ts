/**
 * Content model for the programmatic-SEO engine (the CMS foundation).
 *
 * Every public page (feature, solution, country, city, integration, comparison, article)
 * is described as structured data — no content is hardcoded inside route components. A
 * single renderer turns any `ContentPage` into a fully SEO-optimised page, so the site
 * scales to thousands of pages without redesign. When a real CMS is introduced it only
 * needs to satisfy these types.
 */
import type { Locale } from '@/lib/i18n/config';

/** A value available in every supported language. `en` is required and acts as fallback. */
export type Localized<T> = { en: T } & Partial<Record<Locale, T>>;

/** Resolve a localized value for a locale, falling back to English. */
export function t<T>(value: Localized<T>, locale: Locale): T {
  return value[locale] ?? value.en;
}

export type ContentKind =
  | 'feature'
  | 'solution'
  | 'country'
  | 'city'
  | 'integration'
  | 'comparison'
  | 'article';

export interface Highlight {
  /** Lucide icon name exported by @munaxa/icons (e.g. "CalendarCheck"). */
  icon?: string;
  title: Localized<string>;
  body: Localized<string>;
}

export interface ProseSection {
  heading: Localized<string>;
  /** Paragraphs of body copy. */
  paragraphs: Localized<string[]>;
}

export interface Faq {
  question: Localized<string>;
  answer: Localized<string>;
}

/** Cross-links surfaced by the internal-linking engine. Values are slugs. */
export interface RelatedRefs {
  features?: string[];
  solutions?: string[];
  countries?: string[];
  integrations?: string[];
  comparisons?: string[];
  articles?: string[];
}

export interface ContentPage {
  kind: ContentKind;
  /** URL slug within its section, e.g. "attendance" → /features/attendance. */
  slug: string;
  /** For cities: the parent country slug (e.g. "jordan"). */
  parent?: string;
  icon?: string;

  /** Short label used in nav, cards and breadcrumbs. */
  name: Localized<string>;
  /** Full <title> (without the brand template suffix). */
  seoTitle: Localized<string>;
  metaDescription: Localized<string>;
  keywords: Localized<string[]>;

  eyebrow: Localized<string>;
  /** Page H1. */
  headline: Localized<string>;
  /** Lead paragraph below the H1. */
  intro: Localized<string>;

  highlights: Highlight[];
  sections?: ProseSection[];
  faqs?: Faq[];
  related?: RelatedRefs;

  /** Optional explicit CTA label override. */
  ctaLabel?: Localized<string>;

  datePublished?: string;
  dateModified?: string;
}
