import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Munaxa design-system tokens — vendored verbatim from the Munaxa monorepo
 * (packages/config-tailwind/preset.ts) so this demo is visually identical to
 * production while remaining a standalone, dependency-free project.
 *
 * Palette: violet primary, coral accent, aqua highlight, on deep ink surfaces.
 * Theme-aware coral/aqua come from CSS variables in globals.css (light + dark).
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        violet: {
          DEFAULT: '#7A3FFF',
          light: '#B97BFF',
        },
        coral: 'hsl(var(--coral) / <alpha-value>)',
        aqua: 'hsl(var(--aqua) / <alpha-value>)',
        ink: {
          900: '#0B0518',
          800: '#140A2E',
          700: '#1A0F38',
          600: '#221547',
        },
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
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        card: '0 24px 50px -28px rgba(11,5,24,0.55), 0 0 0 1px hsl(var(--border)) inset',
        glow: '0 14px 40px -16px hsl(var(--primary) / 0.45)',
      },
      backgroundImage: {
        // No primary gradient — the Munaxa Design System uses solid `bg-primary` CTAs and bans
        // decorative gradients. Only the faint radial hero backdrop (--grad-hero) remains.
        'grad-hero':
          'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.16) 0%, transparent 62%)',
      },
    },
  },
  plugins: [animate],
};

export default config;
