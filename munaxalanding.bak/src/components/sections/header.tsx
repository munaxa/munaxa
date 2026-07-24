'use client';

import { useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from '@munaxa/icons';
import { buttonVariants } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { DEMO_URL } from '@/lib/constants';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Theme } from '@/lib/theme/config';

export function Header({
  locale,
  theme,
  dict,
}: {
  locale: Locale;
  theme: Theme;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';
  const sectionHref = (hash: string) => (isHome ? hash : `/${hash}`);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="section-shell flex h-16 items-center justify-between">
        <a
          href={isHome ? '#top' : '/'}
          className="flex items-center gap-2 font-display text-xl font-bold tracking-tight"
        >
          <Image
            src="/logo-light.png"
            alt="Munaxa"
            width={54}
            height={36}
            priority
            unoptimized
            className="h-9 w-auto object-contain dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt="Munaxa"
            width={54}
            height={36}
            priority
            unoptimized
            className="hidden h-9 w-auto object-contain dark:block"
          />
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label={dict.nav.primaryNav}>
          {dict.nav.links.map((link) => (
            <a
              key={link.href}
              href={sectionHref(link.href)}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle
            theme={theme}
            lightLabel={dict.themeSwitcher.light}
            darkLabel={dict.themeSwitcher.dark}
          />
          <LanguageSwitcher locale={locale} label={dict.languageSwitcher.label} />
          <a href={DEMO_URL} className={buttonVariants('default', 'sm')}>
            {dict.nav.requestDemo}
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle
            theme={theme}
            lightLabel={dict.themeSwitcher.light}
            darkLabel={dict.themeSwitcher.dark}
          />
          <LanguageSwitcher locale={locale} label={dict.languageSwitcher.label} />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border"
            aria-label={open ? dict.nav.closeMenu : dict.nav.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-border/60 md:hidden" aria-label={dict.nav.mobileNav}>
          <div className="section-shell flex flex-col gap-1 py-4">
            {dict.nav.links.map((link) => (
              <a
                key={link.href}
                href={sectionHref(link.href)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href={DEMO_URL}
              className={buttonVariants('default', 'md', 'mt-2 w-full')}
              onClick={() => setOpen(false)}
            >
              {dict.nav.requestDemo}
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
