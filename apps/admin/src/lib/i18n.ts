import { Locale, DEFAULT_LOCALE, directionForLocale, SUPPORTED_LOCALES } from '@munaxa/domain';

export { Locale, DEFAULT_LOCALE, directionForLocale, SUPPORTED_LOCALES };

/** Resolve a requested locale string to a supported Locale, falling back to the default. */
export function resolveLocale(input: string | undefined | null): Locale {
  if (input && (SUPPORTED_LOCALES as string[]).includes(input)) {
    return input as Locale;
  }
  return DEFAULT_LOCALE;
}
