import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import { colors, elevation, motion, zIndex, typography } from '@munaxa/design-tokens';

/**
 * Shared Tailwind preset carrying the Munaxa design-system tokens.
 *
 * The single source of truth for every token value is `@munaxa/design-tokens`. This preset
 * only *maps* those tokens onto Tailwind's theme — it invents no values. Editing a token in
 * `packages/design-tokens` therefore reflows every app that consumes this preset (Admin,
 * Landing, Demo) and `@munaxa/ui`, with no per-app edits.
 *
 * Theme-aware semantic colors (`primary`, `background`, `border`, …) remain wired to CSS
 * variables (`hsl(var(--token))`) defined per app in globals.css, so light/dark theming works.
 * The static brand swatches (`violet`, `ink`) and the structural scales below pull their values
 * straight from the token package. Supports RTL/LTR via logical properties.
 */
const preset: Omit<Config, 'content'> = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Brand — static swatches sourced from the token package.
        violet: {
          DEFAULT: colors.brand.DEFAULT,
          light: colors.brand.light,
        },
        // Theme-aware (CSS vars in globals.css): full-brightness on dark, darker on light so the
        // accents stay legible in both themes. Alpha modifiers (e.g. text-coral/40) supported.
        coral: 'hsl(var(--coral) / <alpha-value>)',
        aqua: 'hsl(var(--aqua) / <alpha-value>)',
        // Ink surfaces — deep ink/violet scale from the token package.
        ink: {
          900: colors.ink[900],
          800: colors.ink[800],
          700: colors.ink[700],
          600: colors.ink[600],
        },
        // shadcn token bridge (CSS variables defined in globals.css)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Semantic status colors — theme-aware (CSS vars in globals.css; light + dark
        // variants live in the token package). `danger` is covered by `destructive`.
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Named layering scale — from @munaxa/design-tokens.
      // Additive (Tailwind's numeric z-* utilities remain available).
      zIndex: {
        base: String(zIndex.base),
        sticky: String(zIndex.sticky),
        dropdown: String(zIndex.dropdown),
        overlay: String(zIndex.overlay),
        modal: String(zIndex.modal),
        toast: String(zIndex.toast),
      },
      // Motion tokens — from @munaxa/design-tokens.
      transitionDuration: {
        fast: motion.duration.fast,
        normal: motion.duration.normal,
        slow: motion.duration.slow,
      },
      transitionTimingFunction: {
        standard: motion.easing.standard,
        enter: motion.easing.enter,
        exit: motion.easing.exit,
      },
      // Typography — from @munaxa/design-tokens. --font-display / --font-body are IBM Plex
      // Sans; --font-arabic carries Arabic glyphs (the Latin face has none).
      fontFamily: {
        display: [...typography.fontFamily.display],
        body: [...typography.fontFamily.body],
        mono: [...typography.fontFamily.mono],
      },
      boxShadow: {
        // Elevation — from @munaxa/design-tokens (soft violet-tinted card shadow, brand glow,
        // and the accessible focus ring).
        card: elevation.card,
        glow: elevation.glow,
        focus: elevation.focus,
      },
      backgroundImage: {
        // Brand violet gradient — stops from @munaxa/design-tokens.
        'grad-primary': `linear-gradient(135deg, ${colors.gradientStops.from} 0%, ${colors.gradientStops.via} 55%, ${colors.gradientStops.to} 120%)`,
        'grad-hero':
          'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.16) 0%, transparent 62%)',
      },
    },
  },
  plugins: [animate],
};

export default preset;
