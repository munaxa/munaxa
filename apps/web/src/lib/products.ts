import type { BrandedProductId } from '@munaxa/ui';

/**
 * Which step of the active product ramp each design role uses.
 *
 * Every product page loads exactly one theme (its route group's root layout imports it), so
 * `primary-*` below always resolves to the ramp of the product the page is about. The steps differ
 * per product because the ramps do: Docs' green reaches text contrast a step earlier than School's
 * teal or Work's raspberry.
 *
 * The classes are written out in full because Tailwind finds them by scanning source text.
 */
export interface ProductTone {
  /** Solid fills: primary buttons, the nav CTA, step markers. */
  solid: string;
  /** Brand-coloured text and icons on white. */
  text: string;
  /** Section labels ("01 · Timetable"). */
  eyebrow: string;
  /** Check marks, the eyebrow rule and hero bullets. */
  mark: string;
  markText: string;
  /** Tinted panels behind the product mock-ups. */
  tint: string;
  /** Hero screenshot stage, tint to a slightly deeper tint. */
  stage: string;
  /** The demo band at the foot of the page, and its supporting copy. */
  band: string;
  bandText: string;
  /** Screenshot frame border and the hero's background grid colour. */
  frame: string;
  grid: string;
}

const deepTone = {
  solid: 'bg-primary-800 text-background hover:bg-primary-900',
  text: 'text-primary-800',
  eyebrow: 'text-primary-700',
  mark: 'bg-primary-500',
  markText: 'text-primary-500',
  tint: 'bg-primary-50',
  stage: 'bg-gradient-to-b from-primary-50 to-primary-100',
  band: 'bg-primary-900',
  bandText: 'text-primary-200',
  frame: 'border-primary-800/15',
  grid: 'text-primary-800/10',
} satisfies ProductTone;

export const productTone: Record<BrandedProductId, ProductTone> = {
  school: deepTone,
  work: deepTone,
  docs: {
    ...deepTone,
    solid: 'bg-primary-700 text-background hover:bg-primary-900',
    text: 'text-primary-700',
    eyebrow: 'text-primary-600',
    frame: 'border-primary-700/15',
    grid: 'text-primary-700/10',
  },
};

/** Product routes, in the order every switcher and footer lists them. */
export const productRoutes: Record<BrandedProductId, string> = {
  school: '/school',
  work: '/work',
  docs: '/docs',
};
