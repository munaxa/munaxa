import type { Config } from 'tailwindcss';
import preset from '@munaxa/config-tailwind/preset';

/**
 * Demo Tailwind config — consumes the shared Munaxa preset (@munaxa/config-tailwind), whose
 * token values come from @munaxa/design-tokens (the single source of truth). The `content` glob
 * also scans @munaxa/ui's source so the shared components' utility classes are emitted.
 *
 * The two `theme.extend` overrides below preserve the Demo's existing look exactly where it had
 * drifted from the preset (a softer card shadow + a CSS-variable hero backdrop) — so this
 * migration is zero-visual-change. Reconciling these against the preset is a deliberate, separate
 * design decision (tracked in DESIGN_SYSTEM_MONOREPO_REFACTOR.md).
 */
const config: Config = {
  darkMode: ['class'],
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}', '../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        // Demo's existing softer card elevation (preserved to avoid a visual change).
        card: '0 24px 50px -28px rgba(11,5,24,0.55), 0 0 0 1px hsl(var(--border)) inset',
      },
      backgroundImage: {
        // Demo drives its hero backdrop from a CSS variable in globals.css (preserved).
        'grad-hero': 'var(--grad-hero)',
      },
    },
  },
};

export default config;
