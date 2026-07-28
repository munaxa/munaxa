import { colors } from "../tokens";

// light (website default) + dark "ink" theme contract. Values mirror the
// semantic CSS variables in index.css.
export const themes = {
  light: {
    background: colors.neutral.bg,
    foreground: colors.neutral.ink,
    surface: colors.neutral[0],
    border: colors.neutral.border,
    primary: colors.brand.primaryLight,
    coral: colors.coral.light,
    aqua: colors.aqua.light,
  },
  dark: {
    background: colors.ink[900],
    foreground: "#F4F0FF",
    surface: colors.ink[700],
    border: colors.ink.border,
    primary: colors.brand.primaryDark,
    coral: colors.coral.dark,
    aqua: colors.aqua.dark,
  },
} as const;

export type ThemeName = keyof typeof themes;
