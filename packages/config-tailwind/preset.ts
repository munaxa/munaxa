import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Shared Tailwind preset carrying the Munaxa design-system tokens.
 * Palette derived from the Munaxa Design System: violet primary, coral accent,
 * aqua highlight, on deep dark surfaces. Supports RTL/LTR via logical properties.
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
        // Dark neutral surfaces — Munaxa Design System navy scale (neutral.950 + slate steps).
        ink: {
          900: '#0B1020',
          800: '#111827',
          700: '#1A2332',
          600: '#2A3441',
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
        // From the Munaxa Design System — soft elevation + a violet "glow" for primaries.
        card: '0 24px 50px -28px rgba(11,5,24,0.55), 0 0 0 1px hsl(var(--border)) inset',
        glow: '0 14px 40px -16px hsl(var(--primary) / 0.45)',
        // Focus ring — ported from design-system/tokens/shadows.ts (brand @ 28%).
        focus: '0 0 0 3px rgb(122 63 255 / 0.28)',
      },
      backgroundImage: {
        // Violet-only brand gradient (Munaxa Design System data palette) — no coral tint.
        'grad-primary': 'linear-gradient(135deg, #8A4FFF 0%, #7A3FFF 55%, #652ED8 120%)',
        'grad-hero':
          'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.16) 0%, transparent 62%)',
      },
    },
  },
  plugins: [animate],
};

export default preset;
