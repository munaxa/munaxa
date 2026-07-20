'use client';

import { Moon, Sun } from '@munaxa/icons';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/cn';
import { THEME_COOKIE, type Theme } from '@/lib/theme/config';

interface ThemeToggleProps {
  theme: Theme;
  lightLabel: string;
  darkLabel: string;
  className?: string;
}

/** Light/dark toggle — persists the choice in a cookie and refreshes the page for SSR. */
export function ThemeToggle({ theme, lightLabel, darkLabel, className }: ThemeToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  function toggleTheme() {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.classList.toggle('dark', next === 'dark');
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? lightLabel : darkLabel}
      onClick={toggleTheme}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary/40 text-muted-foreground transition hover:text-foreground',
        isPending && 'opacity-70',
        className,
      )}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
