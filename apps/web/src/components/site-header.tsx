import Link from 'next/link';
import { PRODUCT_ORDER, cn, productBrands, type BrandedProductId } from '@munaxa/ui';
import { CorporateMark } from './brand';
import { ProductDot } from './product-scope';
import { productRoutes, productTone } from '@/lib/products';

/** Solid fill on the hub, which wears the corporate navy. */
export const HUB_SOLID = 'bg-primary-800 text-background hover:bg-primary-900';

export interface NavLink {
  label: string;
  href: string;
}

/**
 * The sticky header on every page.
 *
 * On a product page it carries a School / Work / Docs switcher. The pages sit in separate route
 * groups with their own root layouts (one theme each); Next turns a link across root layouts into a
 * full page load, so only one theme is ever applied.
 */
export function SiteHeader({
  product,
  links,
  cta,
}: {
  /** The product page the header sits on; omit on the hub. */
  product?: BrandedProductId;
  links: NavLink[];
  cta: NavLink;
}) {
  return (
    <header className="sticky top-0 z-sticky border-b border-foreground/5 bg-background/90 backdrop-blur-lg backdrop-saturate-150">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-8 py-3"
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/" aria-label="Munaxa home">
            <CorporateMark />
          </Link>
          {product && (
            <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
              {PRODUCT_ORDER.map((id) => {
                const active = id === product;
                return (
                  <Link
                    key={id}
                    href={productRoutes[id]}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
                      active
                        ? 'bg-background font-semibold text-foreground shadow-xs'
                        : 'font-medium text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <ProductDot product={id} />
                    {productBrands[id].name.replace('Munaxa ', '')}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm font-medium">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-600 hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <Link
            href={cta.href}
            className={cn(
              'whitespace-nowrap rounded-md px-4 py-2 font-semibold',
              product ? productTone[product].solid : HUB_SOLID,
            )}
          >
            {cta.label}
          </Link>
        </div>
      </nav>
    </header>
  );
}
