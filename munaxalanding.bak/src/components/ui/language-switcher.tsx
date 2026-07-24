'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/cn';
import { LOCALE_COOKIE, locales, type Locale } from '@/lib/i18n/config';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  ar: 'ع',
};

interface LanguageSwitcherProps {
  locale: Locale;
  label: string;
  className?: string;
}

/** EN / ع segmented toggle — persists the choice in a cookie and refreshes the page for SSR. */
export function LanguageSwitcher({ locale, label, className }: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center rounded-lg border border-border bg-secondary/40 p-0.5',
        isPending && 'opacity-70',
        className,
      )}
    >
      {locales.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={locale === value}
          onClick={() => setLocale(value)}
          className={cn(
            'rounded-md px-2.5 py-1.5 text-sm font-medium transition',
            locale === value
              ? 'bg-background text-foreground shadow-card'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {LOCALE_LABELS[value]}
        </button>
      ))}
    </div>
  );
}
