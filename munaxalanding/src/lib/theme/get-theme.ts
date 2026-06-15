import { cookies } from 'next/headers';
import { defaultTheme, isTheme, THEME_COOKIE, type Theme } from './config';

/** Reads the visitor's color theme preference from the theme cookie (set by the ThemeToggle). */
export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : defaultTheme;
}
