export const themes = ['light', 'dark'] as const;

export type Theme = (typeof themes)[number];

export const defaultTheme: Theme = 'light';

/** Cookie used to persist the visitor's chosen color theme across requests. */
export const THEME_COOKIE = 'theme';

export function isTheme(value: string | undefined): value is Theme {
  return !!value && (themes as readonly string[]).includes(value);
}
