/** Central site configuration shared across metadata, SEO files, and UI components. */
export const SITE_NAME = 'Munaxa';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.munaxa.com').replace(
  /\/+$/,
  '',
);

export const CONTACT_EMAIL = 'info@munaxa.com';

/**
 * Sender address for the internal contact-form notification (the email that delivers a
 * visitor's submission to {@link CONTACT_EMAIL}). The domain must be verified in Resend.
 * Override with EMAIL_CONTACT_FROM.
 */
export const CONTACT_FROM_EMAIL =
  process.env.EMAIL_CONTACT_FROM ?? 'Munaxa Contact <contactus@munaxa.com>';

/**
 * URL of the standalone Munaxa demo app's public "Request a Demo" form (deployed separately —
 * see the `munaxademo` app, hosted at demo.munaxa.com). Override with NEXT_PUBLIC_DEMO_URL.
 */
export const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL ?? 'https://demo.munaxa.com/request-demo';
