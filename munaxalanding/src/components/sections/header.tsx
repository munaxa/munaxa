'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NAV_LINKS, SITE_NAME } from '@/lib/constants';

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="section-shell flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <Image
            src="/munaxa-logo.png"
            alt="Munaxa"
            width={24}
            height={36}
            priority
            className="h-9 w-auto object-contain"
          />
          {SITE_NAME}
          <span className="text-primary">.</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button size="sm" onClick={() => scrollToContact()}>
            Request a Demo
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-border/60 md:hidden" aria-label="Mobile">
          <div className="section-shell flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button className="mt-2" onClick={() => scrollToContact()}>
              Request a Demo
            </Button>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function scrollToContact() {
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
}
