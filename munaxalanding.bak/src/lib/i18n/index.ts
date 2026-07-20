import type { Locale } from './config';
import type { Dictionary } from './types';
import { en } from './dictionaries/en';
import { ar } from './dictionaries/ar';

export const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export * from './config';
export * from './get-locale';
export type { Dictionary, IconItem, FaqEntry, TestimonialEntry } from './types';
