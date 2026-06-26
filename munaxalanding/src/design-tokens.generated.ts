// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Source of truth: packages/design-tokens (@munaxa/design-tokens).
// Regenerate with:  pnpm sync:tokens   (from the monorepo root)
//
// These are the static design tokens shared from the canonical token package into this
// standalone app. Theme-aware colors remain CSS variables in globals.css.
/* eslint-disable */

export const brand = {
  "DEFAULT": "#7A3FFF",
  "light": "#B97BFF"
} as const;

export const ink = {
  "600": "#221547",
  "700": "#1A0F38",
  "800": "#140A2E",
  "900": "#0B0518"
} as const;

export const radius = {
  "sm": "0.5rem",
  "md": "0.75rem",
  "lg": "0.875rem",
  "xl": "1.375rem",
  "2xl": "2rem"
} as const;

export const shadowFocus = "0 0 0 3px rgb(122 63 255 / 0.28)" as const;

export const motion = {
  "duration": {
    "instant": "0ms",
    "fast": "120ms",
    "normal": "200ms",
    "slow": "300ms"
  },
  "easing": {
    "standard": "cubic-bezier(0.2, 0, 0, 1)",
    "enter": "cubic-bezier(0, 0, 0, 1)",
    "exit": "cubic-bezier(0.3, 0, 1, 1)"
  }
} as const;

export const zIndex = {
  "base": 0,
  "sticky": 10,
  "dropdown": 20,
  "overlay": 30,
  "modal": 40,
  "toast": 50
} as const;

export const breakpoints = {
  "sm": "640px",
  "md": "768px",
  "lg": "1024px",
  "xl": "1280px",
  "2xl": "1536px"
} as const;
