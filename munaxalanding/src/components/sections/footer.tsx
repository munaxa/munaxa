import Image from 'next/image';
import Link from 'next/link';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';
import type { Dictionary } from '@/lib/i18n/types';

export function Footer({ dict }: { dict: Dictionary }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 py-10">
      <div className="section-shell flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="text-center sm:text-start">
          <p className="flex items-center justify-center gap-2 font-display text-lg font-bold sm:justify-start">
            <Image
              src="/logo.png"
              alt="Munaxa"
              width={44}
              height={36}
              className="h-8 w-auto object-contain"
            />
            {SITE_NAME}
            <span className="text-primary">.</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{dict.footer.tagline}</p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            {dict.footer.privacy}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {dict.footer.terms}
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>

      <div className="section-shell mt-6 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
        {dict.footer.rights.replace('{year}', String(year))}
      </div>
    </footer>
  );
}
