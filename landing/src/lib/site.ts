/** Central site configuration for the Munaxa landing site. */
export const SITE_NAME = 'Munaxa';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.munaxa.com').replace(
  /\/+$/,
  '',
);

/**
 * The standalone Munaxa demo app's public "Request a Demo" form (deployed separately —
 * see the `munaxademo` app, hosted at demo.munaxa.com). Override with NEXT_PUBLIC_DEMO_URL.
 */
export const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL ?? 'https://demo.munaxa.com/request-demo';

export const CONTACT_EMAIL = 'info@munaxa.com';

/**
 * Browser-chrome theme colors for <meta name="theme-color">. Consumed as raw hex by the browser
 * (not Tailwind classes), so the design-token class rule does not apply. Values mirror the
 * design-system light/dark backgrounds (neutral.0 / ink.900).
 */
// eslint-disable-next-line no-restricted-syntax
export const THEME_COLOR_LIGHT = '#ffffff';
// eslint-disable-next-line no-restricted-syntax
export const THEME_COLOR_DARK = '#090b0c';

/** In-page anchors — the narrative sections of the operating system. */
export const NAV = [
  { href: '#operating-system', label: 'The System' },
  { href: '#admissions', label: 'Admissions' },
  { href: '#finance', label: 'Finance' },
  { href: '#intelligence', label: 'Intelligence' },
  { href: '#architecture', label: 'Platform' },
] as const;
