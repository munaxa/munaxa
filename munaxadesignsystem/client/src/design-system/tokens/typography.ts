// Munaxa Design System v3 type families: Sora (display/headings), Inter (body),
// Cairo (Arabic/RTL — Sora & Inter lack Arabic glyphs).
export const typography = {
  fontFamily: {
    display: '"Sora", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    arabic: '"Cairo", sans-serif',
    mono: 'ui-monospace, "SFMono-Regular", monospace',
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.625 },
} as const;
