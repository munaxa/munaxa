/** Central site configuration shared across metadata, SEO files, and UI components. */
export const SITE_NAME = 'Munaxa';

export const SITE_DESCRIPTION =
  'Munaxa is the enterprise School Operating System that unifies admissions, attendance, ' +
  'academics, finance, transportation, and parent communication in one secure platform.';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.munaxa.com').replace(
  /\/+$/,
  '',
);

export const CONTACT_EMAIL = 'info@munaxa.com';

export const NAV_LINKS = [
  { href: '#benefits', label: 'Benefits' },
  { href: '#why-munaxa', label: 'Why Munaxa' },
  { href: '#modules', label: 'Modules' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Contact' },
] as const;
