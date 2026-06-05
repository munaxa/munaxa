'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_LOCALE, directionForLocale, type Locale } from '@/lib/i18n';
import { Button } from './ui';

const THEME_KEY = 'munaxa.theme';
const LOCALE_KEY = 'munaxa.locale';
type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function applyLocale(locale: Locale) {
  const el = document.documentElement;
  el.lang = locale;
  el.dir = directionForLocale(locale);
}

/**
 * Lightweight theme (light/dark) and locale (EN/AR → LTR/RTL) switcher for the shell top bar.
 * Persists to localStorage and applies to <html> so the whole app reflows. A full i18n message
 * catalog is a later step; this flips direction + theme today.
 */
export function ThemeLocaleToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const savedTheme = (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'dark';
    const savedLocale = (localStorage.getItem(LOCALE_KEY) as Locale | null) ?? DEFAULT_LOCALE;
    setTheme(savedTheme);
    setLocale(savedLocale);
    applyTheme(savedTheme);
    applyLocale(savedLocale);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  function toggleLocale() {
    const next: Locale = locale === 'ar' ? 'en' : 'ar';
    setLocale(next);
    localStorage.setItem(LOCALE_KEY, next);
    applyLocale(next);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="sm" onClick={toggleLocale} aria-label="Toggle language">
        {locale === 'ar' ? 'AR' : 'EN'}
      </Button>
      <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? '☾' : '☀'}
      </Button>
    </div>
  );
}
