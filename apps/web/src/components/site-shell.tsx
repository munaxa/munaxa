import Link from 'next/link';
import {
  BrandProvider,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ProductLogo,
  cn,
  productBrands,
  type BrandedProductId,
} from '@munaxa/ui';

/**
 * The corporate site chrome: header, primary navigation and footer.
 *
 * Every visual decision here — colour, type, spacing, radius — resolves to a platform token
 * through the Corporate theme imported in `globals.css`. There are no local design values,
 * and there is no local component library; anything reusable belongs in `@munaxa/ui`.
 */

/**
 * The three products, keyed to their ids in the platform's brand registry.
 *
 * The name is not written out here. `productBrands.<id>.name` is where a product is called what
 * it is called, and a second copy on the corporate site is a second thing to update when one is
 * renamed — on the surface most likely to be missed, because nobody working on a product opens it.
 */
export const PRODUCTS = [
  {
    id: 'school',
    href: 'https://munaxa.com',
    blurb: 'The School Operating System — admissions, attendance, finance and communication.',
  },
  {
    id: 'work',
    href: '#',
    blurb: 'HCM: people, contracts, leave, performance and payroll operations.',
  },
  {
    id: 'docs',
    href: '#',
    blurb: 'Enterprise document control: workflows, revisions, numbering and audit evidence.',
  },
] as const satisfies readonly { id: BrandedProductId; href: string; blurb: string }[];

/**
 * One product's card, wearing its own identity.
 *
 * This is the one corporate surface where product branding belongs. The site itself keeps the
 * group's — the header wordmark, the navy palette, the `corporate` theme — because it is the
 * company speaking; but a page whose subject is the three products is a page where showing three
 * identical navy cards would be hiding the very thing it is describing.
 *
 * The symbol carries the colour, so nothing here names a hex. Each card scopes its own
 * `BrandProvider`, which is exactly what the provider is for: the product a logo shows is a
 * property of where it sits, and here the three sit side by side.
 *
 * The symbol is decorative — the product's name is written beside it, and a picture captioned
 * with the text next to it is announced twice.
 */
export function ProductCard({ id, blurb }: { id: BrandedProductId; blurb: string }) {
  return (
    <BrandProvider product={id}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ProductLogo variant="symbol" height={24} decorative />
            <CardTitle>{productBrands[id].name}</CardTitle>
          </div>
          <CardDescription>{blurb}</CardDescription>
        </CardHeader>
      </Card>
    </BrandProvider>
  );
}

const NAV = [
  { href: '/products', label: 'Products' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/careers', label: 'Careers' },
  { href: '/contact', label: 'Contact' },
] as const;

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-lg font-semibold lowercase tracking-tight', className)}>
      munaxa
      <span
        aria-hidden="true"
        className="bg-primary ms-[0.12em] inline-block h-[0.22em] w-[0.22em] align-baseline"
      />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Munaxa home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-border/60 mt-24 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm md:flex-row md:items-center md:justify-between">
        <Wordmark className="text-foreground text-base" />
        <p>© {new Date().getFullYear()} Munaxa. All rights reserved.</p>
      </div>
    </footer>
  );
}

/** Shared page frame: a heading block over centred content. */
export function Page({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      {lead ? <p className="text-muted-foreground mt-4 max-w-2xl text-lg">{lead}</p> : null}
      {children ? <div className="mt-12">{children}</div> : null}
    </div>
  );
}
