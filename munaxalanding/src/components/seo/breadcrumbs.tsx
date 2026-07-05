import { ChevronRight } from '@munaxa/icons';
import type { Crumb } from '@/lib/seo/jsonld';

/**
 * Accessible visual breadcrumb trail. Styling uses only existing design-system tokens
 * (muted-foreground / foreground), so it inherits the brand without introducing any new
 * colours, spacing scale or typography. The BreadcrumbList JSON-LD is emitted separately
 * via <JsonLd> on each page.
 *
 * The last crumb is rendered as the current page (no link, aria-current).
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.url} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 opacity-60 rtl:rotate-180"
                  aria-hidden
                />
              )}
              {isLast ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <a href={crumb.url} className="transition hover:text-foreground">
                  {crumb.name}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
