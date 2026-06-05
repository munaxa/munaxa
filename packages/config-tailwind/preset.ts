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
        coral: '#FF8E6E',
        aqua: '#4DF4E1',
        // Surfaces (dark)
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
        // From the Munaxa Design System — soft elevation + a violet "glow" for primaries.
        card: '0 24px 50px -28px rgba(11,5,24,0.55), 0 0 0 1px hsl(var(--border)) inset',
        glow: '0 14px 40px -16px hsl(var(--primary) / 0.45)',
      },
      backgroundImage: {
        'grad-primary': 'linear-gradient(135deg, #7A3FFF 0%, #B97BFF 60%, #FF8E6E 120%)',
        'grad-hero':
          'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.16) 0%, transparent 62%)',
      },
    },
  },
  plugins: [animate],
};

export default preset;
