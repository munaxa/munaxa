// Munaxa Design System v3 palette — the canonical brand used by the Munaxa
// website (munaxalanding). Violet primary with theme-aware coral/aqua accents on
// deep "ink" dark surfaces or light violet-tinted surfaces. Components should
// consume the semantic CSS variables (see index.css / themes); these typed
// values are the source-of-truth reference for design tooling and docs.
export const colors = {
  // Brand violet (DEFAULT is the marketing brand; primary* are the legible semantic tints per theme)
  brand: {
    violet: "#7A3FFF",
    violetLight: "#B97BFF",
    primaryLight: "#5B1FD6",
    primaryDark: "#B97BFF",
  },
  // Theme-aware accents (light / dark)
  coral: { light: "#D9534F", dark: "#FF8E6E" },
  aqua: { light: "#0D9488", dark: "#4DF4E1" },
  // Deep "ink" dark surfaces
  ink: {
    900: "#0B0518",
    800: "#140A2E",
    700: "#1A0F38",
    600: "#221547",
    border: "#2F224F",
  },
  // Light violet-tinted neutrals
  neutral: {
    0: "#FFFFFF",
    bg: "#F7F5FF",
    surface: "#F0ECFA",
    border: "#E3DFEF",
    input: "#C8C0DC",
    mutedText: "#5A4D7A",
    ink: "#1E0B4D",
  },
  semantic: {
    success: "#0D9488",
    warning: "#F59E0B",
    danger: "#D9534F",
    info: "#3B82F6",
  },
  // Data-viz scale — brand violets + v3 accents
  data: ["#7A3FFF", "#B97BFF", "#0D9488", "#D9534F", "#5B1FD6"],
} as const;

export type ColorToken = typeof colors;
