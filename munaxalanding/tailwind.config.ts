import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import containerQueries from '@tailwindcss/container-queries';
import { colors } from '@munaxa/design-tokens';

/**
 * Munaxa design tokens. Static brand/surface swatches are sourced directly from
 * `@munaxa/design-tokens` (the single source of truth) — Landing is a workspace member, so it
 * imports the package live; editing a token there reflows Landing with no per-app edit.
 *
 * Landing keeps its own (intentionally marketing-flavored) theme for radius/shadow/glow/fonts +
 * container-queries, which differ from the shared preset; consolidating those onto the preset is
 * a separate design decision (see DESIGN_SYSTEM_MONOREPO_REFACTOR.md §12). Theme-aware
 * coral/aqua/primary come from CSS variables in globals.css. Supports RTL/LTR + `font-arabic`.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — from @munaxa/design-tokens.
        violet: {
          DEFAULT: colors.brand.DEFAULT,
          light: colors.brand.light,
        },
        // Theme-aware (CSS vars in globals.css): full-brightness on dark, darker on light so the
        // accents stay legible in both themes. Alpha modifiers (e.g. text-coral/40) supported.
        coral: 'hsl(var(--coral) / <alpha-value>)',
        aqua: 'hsl(var(--aqua) / <alpha-value>)',
        // Surfaces (dark) — from @munaxa/design-tokens.
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
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'var(--radius-sm)',
        '2xl': 'var(--radius-lg)',
        '3xl': 'var(--radius-xl)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        arabic: ['var(--font-arabic)', 'sans-serif'],
      },
      boxShadow: {
        // From the Munaxa Design System — soft elevation (light-theme formula, the
        // landing page's default) + a violet "glow" for primaries.
        card: '0 24px 50px -30px rgba(30,11,77,0.25), 0 0 0 1px hsl(var(--border)) inset',
        glow: '0 14px 40px -16px rgba(122,63,255,0.55)',
      },
      backgroundImage: {
        // No primary gradient — the Munaxa Design System uses solid `bg-primary` CTAs and bans
        // decorative gradients. Only the faint radial hero backdrop (--grad-hero) remains.
        'grad-hero': 'var(--grad-hero)',
      },
    },
  },
  plugins: [animate, containerQueries],
};

export default config;
