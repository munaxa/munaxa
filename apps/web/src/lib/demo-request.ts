/** The shape of a demo or waitlist request, shared by the form and the API route. */

export const demoProducts = ['School', 'Work', 'Docs'] as const;
export type DemoProduct = (typeof demoProducts)[number];

export interface DemoRequest {
  product: DemoProduct;
  /** "demo" or "waitlist", so sales can tell the two apart. */
  kind: 'demo' | 'waitlist';
  name: string;
  email: string;
  phone: string;
  organization: string;
  /** Product-specific extra field, e.g. number of students or industry. */
  detailLabel?: string;
  detail?: string;
  message?: string;
  /** Page the request came from. */
  page: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits with an optional leading +, and spaces, dashes, dots or brackets between them.
const PHONE_RE = /^\+?[\d\s\-().]+$/;

export type ParseResult = { ok: true; value: DemoRequest } | { ok: false; error: string };

/** Cleans a submitted request, or names the first field that is invalid. */
export function parseDemoRequest(input: unknown): ParseResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Invalid request.' };
  const o = input as Record<string, unknown>;
  const str = (k: string, max = 200): string => {
    const v = o[k];
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
  };

  const product = str('product');
  if (!(demoProducts as readonly string[]).includes(product)) {
    return { ok: false, error: 'Choose a product.' };
  }
  const name = str('name');
  if (!name) return { ok: false, error: 'Enter your full name.' };
  const email = str('email', 254);
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid work email.' };
  const phone = str('phone', 40);
  const digits = phone.replace(/\D/g, '').length;
  if (!PHONE_RE.test(phone) || digits < 7 || digits > 15) {
    return { ok: false, error: 'Enter a valid phone number.' };
  }
  const organization = str('organization');
  if (!organization) return { ok: false, error: 'Enter your organization.' };

  const value: DemoRequest = {
    product: product as DemoProduct,
    kind: o.kind === 'waitlist' ? 'waitlist' : 'demo',
    name,
    email,
    phone,
    organization,
    page: str('page', 100) || '/',
  };
  const detailLabel = str('detailLabel', 60);
  const detail = str('detail', 100);
  const message = str('message', 2000);
  if (detailLabel) value.detailLabel = detailLabel;
  if (detail) value.detail = detail;
  if (message) value.message = message;
  return { ok: true, value };
}
