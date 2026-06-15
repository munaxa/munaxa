/** Central site configuration shared across metadata, SEO files, and UI components. */
export const SITE_NAME = 'Munaxa';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.munaxa.com').replace(
  /\/+$/,
  '',
);

export const CONTACT_EMAIL = 'info@munaxa.com';
