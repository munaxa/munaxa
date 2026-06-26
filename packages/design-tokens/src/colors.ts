/**
 * Munaxa color tokens — the canonical brand palette and the single source of truth
 * for every color value across the platform (Admin, Landing, Demo, Design System).
 *
 * Values mirror the *live* Munaxa brand currently shipped by the design system and the
 * Admin Portal: a violet primary (#7A3FFF) on deep "ink" violet surfaces, with
 * theme-aware coral + aqua accents and a light violet-tinted neutral scale.
 *
 * Two layers live here:
 *  - STATIC swatches (`brand`, `ink`, `neutral`, `dataViz`, `gradientStops`) — fixed hexes
 *    consumed directly by the Tailwind preset and design tooling.
 *  - THEME-AWARE pairs (`coral`, `aqua`, `semantic`) — each exposes a `{ light, dark }` value.
 *    Apps bind these to CSS variables (see ./css/tokens.css) so a single token edit reflows
 *    light and dark themes without touching component code.
 */
export const colors = {
  /** Primary brand violet (static swatch — matches the live preset). */
  brand: {
    DEFAULT: '#7A3FFF',
    light: '#B97BFF',
    dark: '#5B1FD6',
  },

  /** Gradient stops used by brand surfaces (light → primary → deep). */
  gradientStops: {
    from: '#B97BFF',
    via: '#7A3FFF',
    to: '#5B1FD6',
  },

  /** Theme-aware accent — coral. Bind via CSS variable `--coral`. */
  coral: { light: '#D9534F', dark: '#FF8E6E' },
  /** Theme-aware accent — aqua. Bind via CSS variable `--aqua`. */
  aqua: { light: '#0D9488', dark: '#4DF4E1' },

  /** Deep "ink" violet dark surfaces. */
  ink: {
    900: '#0B0518',
    800: '#140A2E',
    700: '#1A0F38',
    600: '#221547',
    border: '#2F224F',
  },

  /** Light violet-tinted neutral scale. */
  neutral: {
    0: '#FFFFFF',
    bg: '#F7F5FF',
    surface: '#F0ECFA',
    border: '#E3DFEF',
    input: '#C8C0DC',
    mutedText: '#5A4D7A',
    ink: '#1E0B4D',
  },

  /** Semantic status colors — theme-aware. `danger` doubles as `destructive`. */
  semantic: {
    success: { light: '#0D9488', dark: '#10B981' },
    warning: { light: '#F59E0B', dark: '#FBBF24' },
    info: { light: '#3B82F6', dark: '#60A5FA' },
    danger: { light: '#D9534F', dark: '#F87171' },
  },

  /** Data-visualization scale (chart-1 → chart-5). */
  dataViz: ['#7A3FFF', '#B97BFF', '#0D9488', '#F59E0B', '#3B82F6'],
} as const;

export type Colors = typeof colors;
