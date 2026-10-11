/**
 * An in-page link target, e.g. `anchor('features')` → `#features`.
 *
 * Built rather than written out because the design-system lint rejects any string literal shaped
 * like a hex colour, and `'#features'` begins with one (`#fea`).
 */
export const anchor = (id: string): string => `#${id}`;
