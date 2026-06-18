'use client';

import { useEffect, useState } from 'react';
import { useI18n } from './i18n-provider';
import { Button } from './ui';

const THEME_KEY = 'munaxa.theme';
type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * Theme (light/dark) and locale (EN/AR → LTR/RTL) switcher for the shell top bar. Theme is local
 * to this control; locale is driven through the i18n provider so the whole app re-translates and
 * flips direction together. Both persist to localStorage.
 */
export function ThemeLocaleToggle() {
  const { locale, setLocale } = useI18n();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'light';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
        aria-label="Toggle language"
      >
        {locale === 'ar' ? 'AR' : 'EN'}
      </Button>
      <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? '☾' : '☀'}
      </Button>
    </div>
  );
}
