import { getLocale } from '@/lib/i18n/get-locale';
import { getDictionary } from '@/lib/i18n';
import { getTheme } from '@/lib/theme/get-theme';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Theme } from '@/lib/theme/config';

export interface PageContext {
  locale: Locale;
  theme: Theme;
  dict: Dictionary;
}

/** Resolve the per-request locale, theme and dictionary used by every page renderer. */
export async function getPageContext(): Promise<PageContext> {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return { locale, theme, dict: getDictionary(locale) };
}
