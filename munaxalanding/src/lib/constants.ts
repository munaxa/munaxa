/** Central site configuration shared across metadata, SEO files, and UI components. */
export const SITE_NAME = 'Munaxa';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.munaxa.com').replace(
  /\/+$/,
  '',
);

export const CONTACT_EMAIL = 'info@munaxa.com';

/**
 * URL of the standalone Munaxa demo app's public "Request a Demo" form (deployed separately —
 * see the `munaxademo` app, hosted at demo.munaxa.com). Override with NEXT_PUBLIC_DEMO_URL.
 */
export const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL ?? 'https://demo.munaxa.com/request-demo';
