import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 py-10">
      <div className="section-shell flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="text-center sm:text-start">
          <p className="font-display text-lg font-bold">
            {SITE_NAME}
            <span className="text-primary">.</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The School Operating System for modern, growing schools.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-foreground">
            Terms of Service
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>

      <div className="section-shell mt-6 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
        © {year} Munaxa. All rights reserved.
      </div>
    </footer>
  );
}
