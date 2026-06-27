/**
 * Munaxa elevation (box-shadow) tokens — soft violet-tinted card shadows, a brand "glow"
 * for primary surfaces, and the focus-visible ring used for accessible focus states.
 */
export const elevation = {
  none: 'none',
  sm: '0 1px 2px rgb(30 11 77 / 0.06)',
  md: '0 4px 12px rgb(30 11 77 / 0.10)',
  lg: '0 12px 28px rgb(30 11 77 / 0.14)',
  card: '0 24px 50px -30px rgb(30 11 77 / 0.25), 0 0 0 1px hsl(var(--border)) inset',
  glow: '0 14px 40px -16px hsl(var(--primary) / 0.45)',
  /** Focus ring — brand violet #7A3FFF @ 28%. */
  focus: '0 0 0 3px rgb(122 63 255 / 0.28)',
} as const;

export type Elevation = typeof elevation;
