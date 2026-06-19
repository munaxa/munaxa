import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Shared Tailwind preset carrying the Munaxa design-system tokens.
 *
 * Colours are the Munaxa Design System v3 brand — the single source of truth lives in
 * munaxadesignsystem/client/src/index.css: violet primary (#5B1FD6 light / #B97BFF dark) on
 * ink/violet surfaces, with coral + aqua accents. The theme-aware CSS variables consumed below
 * (`hsl(var(--token))`) are defined per app (apps/admin/src/app/globals.css); the static brand
 * swatches here (`violet`, `ink`) mirror the v3 hexes directly. Keep both in sync with
 * munaxadesignsystem when the brand changes. Supports RTL/LTR via logical properties.
 */
const preset: Omit<Config, 'content'> = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        // Brand
        violet: {
          DEFAULT: '#7A3FFF',
          light: '#B97BFF',
        },
        // Theme-aware (CSS vars in globals.css): full-brightness on dark, darker on light so the
        // accents stay legible in both themes. Alpha modifiers (e.g. text-coral/40) supported.
        coral: 'hsl(var(--coral) / <alpha-value>)',
        aqua: 'hsl(var(--aqua) / <alpha-value>)',
        // Ink surfaces — Munaxa Design System v3 deep ink/violet scale (matches the dark
        // --background/--sidebar/--card/--secondary in munaxadesignsystem/client/src/index.css).
        ink: {
          900: '#0B0518',
          800: '#140A2E',
          700: '#1A0F38',
          600: '#221547',
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
        // variants from the Munaxa Design System). `danger` is covered by `destructive`.
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // Named layering scale — ported from design-system/tokens/zIndex.ts.
      // Additive (Tailwind's numeric z-* utilities remain available).
      zIndex: {
        base: '0',
        sticky: '10',
        dropdown: '20',
        overlay: '30',
        modal: '40',
        toast: '50',
      },
      // Motion tokens — ported from design-system/tokens/motion.ts.
      transitionDuration: {
        fast: '120ms',
        normal: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        enter: 'cubic-bezier(0, 0, 0, 1)',
        exit: 'cubic-bezier(0.3, 0, 1, 1)',
      },
      // Typography per design-system/tokens/typography.ts:
      //   sans: "IBM Plex Sans", "IBM Plex Sans Arabic", system-ui, sans-serif
      //   mono: ui-monospace, "SFMono-Regular", monospace
      // --font-display / --font-body are IBM Plex Sans; --font-arabic carries Arabic glyphs
      // (the Latin face has none, so the browser falls through to it for Arabic text).
      // --font-mono is intentionally left first as a fallback hook for other preset consumers;
      // the admin app no longer defines it, so it resolves to the reference system mono stack.
      fontFamily: {
        display: ['var(--font-display)', 'var(--font-arabic)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'var(--font-arabic)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Munaxa Design System v3 elevation — soft violet-tinted card shadow (mirrors
        // --shadow-card in munaxadesignsystem) plus a brand "glow" for accents.
        card: '0 24px 50px -30px rgb(30 11 77 / 0.25), 0 0 0 1px hsl(var(--border)) inset',
        glow: '0 14px 40px -16px hsl(var(--primary) / 0.45)',
        // Focus ring — brand violet #7A3FFF @ 28%.
        focus: '0 0 0 3px rgb(122 63 255 / 0.28)',
      },
      backgroundImage: {
        // Brand violet gradient — Munaxa Design System v3 chart violets (#B97BFF→#7A3FFF→#5B1FD6).
        'grad-primary': 'linear-gradient(135deg, #B97BFF 0%, #7A3FFF 55%, #5B1FD6 120%)',
        'grad-hero':
          'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.16) 0%, transparent 62%)',
      },
    },
  },
  plugins: [animate],
};

export default preset;
