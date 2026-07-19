import { NAV, CONTACT_EMAIL } from '@/lib/site';
import { Wordmark } from './wordmark';

const YEAR = new Date().getFullYear();

/** Footer — restrained, editorial. */
export function Footer() {
  return (
    <footer className="border-t border-border py-14">
      <div className="shell-wide">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-xs">
            <Wordmark />
            <p className="mt-4 text-sm text-muted-foreground">
              The School Operating System for K-12 schools and education groups — Jordan and the
              wider region.
            </p>
          </div>

          <div className="flex flex-wrap gap-12">
            <nav aria-label="Sections">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Platform
              </p>
              <ul className="mt-3 space-y-2">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="text-sm text-muted-foreground transition hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Contact
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="mono text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rule mt-12" />
        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>© {YEAR} Munaxa. All rights reserved.</p>
          <p>Not an LMS · a School Operating System.</p>
        </div>
      </div>
    </footer>
  );
}
