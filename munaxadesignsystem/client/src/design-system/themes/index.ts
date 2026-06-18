import { colors } from "../tokens";

export const themes = {
  light: { background: colors.neutral[50], foreground: colors.neutral[900], surface: colors.neutral[0], border: colors.neutral[200], primary: colors.brand.primary },
  dark: { background: colors.neutral[950], foreground: colors.neutral[50], surface: "#1A2332", border: "#2A3441", primary: "#8A4FFF" },
} as const;

export type ThemeName = keyof typeof themes;
