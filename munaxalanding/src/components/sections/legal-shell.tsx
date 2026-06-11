import type { ReactNode } from 'react';
import { Header } from '@/components/sections/header';
import { Footer } from '@/components/sections/footer';

export function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="section-shell py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:ps-5 [&_li]:mt-1">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
