import type { ReactNode } from 'react';
import { Header } from '@/components/sections/header';
import { Footer } from '@/components/sections/footer';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Theme } from '@/lib/theme/config';

export function LegalShell({
  locale,
  theme,
  dict,
  title,
  children,
}: {
  locale: Locale;
  theme: Theme;
  dict: Dictionary;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header locale={locale} theme={theme} dict={dict} />
      <main className="section-shell py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:ps-5 [&_li]:mt-1">
            {children}
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </>
  );
}
