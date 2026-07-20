/**
 * Central SEO configuration for the Munaxa marketing site.
 *
 * This is the single source of truth for site-wide SEO primitives (brand, social,
 * geo targeting, verification + analytics IDs). Everything here is build/runtime-safe
 * and additive — it never changes the design system, routing, or existing UX.
 *
 * All secrets/IDs are read from environment variables so nothing is hardcoded and the
 * file stays safe to commit. Unset values simply disable the corresponding feature.
 */
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { locales, defaultLocale, type Locale } from '@/lib/i18n/config';

export { SITE_NAME, SITE_URL, locales, defaultLocale };
export type { Locale };

/** Maps an app locale to its BCP-47 / OpenGraph locale tag. */
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  ar: 'ar_AR',
};

/** Maps an app locale to the hreflang value used in <link rel="alternate">. */
export const HREFLANG: Record<Locale, string> = {
  en: 'en',
  ar: 'ar',
};

/** Brand + organisation facts reused across metadata and structured data. */
export const ORG = {
  legalName: 'Munaxa',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: 'info@munaxa.com',
  description:
    'Munaxa is the enterprise School Operating System for private and international schools — ' +
    'unifying admissions, attendance, academics, finance, HR, transportation and parent ' +
    'communication in one secure, bilingual platform built for Jordan and the MENA region.',
  foundingLocation: 'Amman, Jordan',
  /** ISO 3166-1 alpha-2 of the primary market, then the wider expansion markets. */
  areaServed: ['JO', 'SA', 'AE', 'QA', 'BH', 'OM', 'KW', 'EG'],
  sameAs: [
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
    process.env.NEXT_PUBLIC_SOCIAL_X,
    process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
  ].filter((v): v is string => Boolean(v)),
} as const;

/** Twitter/X handle for `twitter:site` / `twitter:creator` (without the @ if unset). */
export const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? '@munaxa';

/**
 * Brand theme colour used by <meta name="theme-color"> and the web manifest. These are
 * consumed as raw hex by browser chrome / manifest JSON (not Tailwind classes), so the
 * design-token class rule does not apply here. Value mirrors the design-system background
 * (rgb(11,5,24)) used by the OpenGraph image.
 */
// eslint-disable-next-line no-restricted-syntax
export const THEME_COLOR_LIGHT = '#0b0518';
// eslint-disable-next-line no-restricted-syntax
export const THEME_COLOR_DARK = '#0b0518';

/**
 * Search-engine + analytics verification / measurement IDs.
 * All optional — a feature is simply skipped when its ID is absent.
 */
export const VERIFICATION = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
  yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
} as const;

export const ANALYTICS = {
  // Default is the live Munaxa GA4 property; override per-environment with the env var.
  ga4: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-WRC1Z8G60J',
  clarity: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
} as const;

/** Absolute canonical URL for a route path (always leading slash, no trailing slash). */
export function absoluteUrl(path = '/'): string {
  if (!path || path === '/') return `${SITE_URL}/`;
  const clean = `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  return `${SITE_URL}${clean}`;
}
