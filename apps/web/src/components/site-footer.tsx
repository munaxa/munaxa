import Link from 'next/link';
import { CorporateMark } from './brand';
import type { NavLink } from './site-header';

/**
 * The footer on every page. Product links carry their full descriptors ("School Management
 * System") because they are the crawlable description of what each product is.
 */
export function SiteFooter({ blurb, company }: { blurb: string; company: NavLink[] }) {
  return (
    <footer className="border-t border-foreground/10">
      <div className="mx-auto max-w-7xl px-8 pt-14 pb-10 text-neutral-600">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3.5 sm:col-span-2">
            <CorporateMark size="sm" />
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{blurb}</p>
          </div>
          <nav aria-label="Products" className="flex flex-col gap-3 text-sm">
            <div className="text-sm font-semibold text-foreground">Products</div>
            <Link href="/school" className="hover:text-foreground">
              School Management System
            </Link>
            <Link href="/work" className="hover:text-foreground">
              Human Capital Management
            </Link>
            <Link href="/docs" className="hover:text-foreground">
              Document Management
            </Link>
          </nav>
          <nav aria-label="Company" className="flex flex-col gap-3 text-sm">
            <div className="text-sm font-semibold text-foreground">Company</div>
            {company.map((l) => (
              <Link key={l.label} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-foreground/10 pt-5 text-sm text-neutral-400">
          <span>© 2026 Munaxa Corporate. All rights reserved.</span>
          {/* Legal pages are not part of this site yet; link them here once published. */}
        </div>
      </div>
    </footer>
  );
}
