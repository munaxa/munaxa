/**
 * Shared metadata builder.
 *
 * `buildMetadata()` produces a complete, deduplicated Next.js `Metadata` object for any
 * route: title, description, keywords, canonical URL, hreflang alternates, OpenGraph,
 * Twitter cards, robots, authors, publisher, applicationName and verification.
 *
 * The site serves both languages on a single URL (locale is cookie-driven, see
 * middleware.ts), so the canonical is always the self URL and hreflang alternates map
 * every language — plus x-default — to that same URL. This keeps crawlers from treating
 * the bilingual variants as duplicate content.
 */
import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { locales, type Locale } from '@/lib/i18n/config';
import { absoluteUrl, OG_LOCALE, HREFLANG, TWITTER_HANDLE, VERIFICATION } from './config';

export interface BuildMetadataInput {
  /** Route path, e.g. "/features/attendance". Defaults to "/". */
  path?: string;
  locale: Locale;
  title: string;
  description: string;
  keywords?: string[];
  /** OpenGraph object type. Defaults to "website"; use "article" for blog/guides. */
  ogType?: 'website' | 'article';
  /** Absolute or app-relative OG image. Defaults to the dynamic /opengraph-image route. */
  image?: string;
  /** Whether the title is already complete (skip the "%s — Munaxa" template). */
  absoluteTitle?: boolean;
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}

function alternateLanguages(path: string): Record<string, string> {
  const url = absoluteUrl(path);
  const langs: Record<string, string> = {};
  for (const l of locales as readonly Locale[]) {
    langs[HREFLANG[l]] = url;
  }
  langs['x-default'] = url;
  return langs;
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  const path = input.path ?? '/';
  const canonical = absoluteUrl(path);
  const image = input.image ?? '/opengraph-image';
  const ogLocale = OG_LOCALE[input.locale];
  const alternateOgLocale = input.locale === 'en' ? OG_LOCALE.ar : OG_LOCALE.en;

  const verification: Metadata['verification'] = {};
  if (VERIFICATION.google) verification.google = VERIFICATION.google;
  if (VERIFICATION.yandex) verification.yandex = VERIFICATION.yandex;
  const other: Record<string, string> = {};
  if (VERIFICATION.bing) other['msvalidate.01'] = VERIFICATION.bing;

  return {
    metadataBase: new URL(SITE_URL),
    // A plain string lets the parent layout's "%s — Munaxa" template apply; `absolute`
    // bypasses it for titles that already include the brand or must stand alone.
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    ...(input.keywords ? { keywords: input.keywords } : {}),
    applicationName: SITE_NAME,
    authors: (input.authors ?? [SITE_NAME]).map((name) => ({ name })),
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: { telephone: false, address: false, email: false },
    alternates: {
      canonical,
      languages: alternateLanguages(path),
    },
    robots: input.noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type: input.ogType ?? 'website',
      url: canonical,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      locale: ogLocale,
      alternateLocale: alternateOgLocale,
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(input.ogType === 'article'
        ? {
            publishedTime: input.publishedTime,
            modifiedTime: input.modifiedTime ?? input.publishedTime,
            authors: input.authors,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: input.title,
      description: input.description,
      images: [image],
    },
    ...(Object.keys(verification).length ? { verification } : {}),
    ...(Object.keys(other).length ? { other } : {}),
  };
}
