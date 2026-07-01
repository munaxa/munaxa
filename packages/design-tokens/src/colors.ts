/**
 * Munaxa color tokens — the canonical brand palette and the single source of truth
 * for every color value across the platform (Admin, Landing, Demo, Design System).
 *
 * The brand is the munaxadesignsystem (Orbix) teal (#007595 / #00B8DB) — the single source of
 * truth. Surfaces still use the deep "ink" scale and theme-aware coral/aqua accents; those are
 * intentionally kept (brand-hue-only rebrand) and can be migrated to the DS neutral palette later.
 *
 * Two layers live here:
 *  - STATIC swatches (`brand`, `ink`, `neutral`, `dataViz`, `gradientStops`) — fixed hexes
 *    consumed directly by the Tailwind preset and design tooling.
 *  - THEME-AWARE pairs (`coral`, `aqua`, `semantic`) — each exposes a `{ light, dark }` value.
 *    Apps bind these to CSS variables (see ./css/tokens.css) so a single token edit reflows
 *    light and dark themes without touching component code.
 */
export const colors = {
  /** Primary brand teal — the munaxadesignsystem (Orbix) brand, single source of truth. */
  brand: {
    DEFAULT: '#007595',
    light: '#00B8DB',
    dark: '#005066',
  },

  /** Gradient stops used by brand surfaces (light → primary → deep). */
  gradientStops: {
    from: '#00B8DB',
    via: '#007595',
    to: '#005066',
  },

  /** Theme-aware accent — coral. Bind via CSS variable `--coral`. */
  coral: { light: '#D9534F', dark: '#FF8E6E' },
  /** Theme-aware accent — aqua. Bind via CSS variable `--aqua`. */
  aqua: { light: '#0D9488', dark: '#4DF4E1' },

  /** Deep neutral "ink" dark surfaces (munaxadesignsystem dark theme). */
  ink: {
    900: '#090B0C',
    800: '#131718',
    700: '#161B1D',
    600: '#1F2527',
    border: '#2A3133',
  },

  /** Light neutral scale (munaxadesignsystem light theme). */
  neutral: {
    0: '#FFFFFF',
    bg: '#F4F4F5',
    surface: '#F1F3F3',
    border: '#E3E7E8',
    input: '#E3E7E8',
    mutedText: '#67787C',
    ink: '#090B0C',
  },

  /** Semantic status colors — theme-aware (munaxadesignsystem). `danger` doubles as `destructive`. */
  semantic: {
    success: { light: '#0D9488', dark: '#4DF4E1' },
    warning: { light: '#F59E0B', dark: '#FBBF24' },
    info: { light: '#3B82F6', dark: '#60A5FA' },
    danger: { light: '#D9534F', dark: '#FF5C7A' },
  },

  /** Data-visualization scale (munaxadesignsystem chart-1 → chart-5). */
  dataViz: ['#D0D6D8', '#67787C', '#4B585B', '#394447', '#22292B'],
} as const;

export type Colors = typeof colors;
