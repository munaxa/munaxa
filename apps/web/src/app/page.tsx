import Link from 'next/link';
import { buttonVariants, Card, CardHeader, CardTitle, CardDescription } from '@munaxa/ui';
import { PRODUCTS } from '@/components/site-shell';

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-16">
        <h1 className="font-display max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
          Operating systems for institutions.
        </h1>
        <p className="text-muted-foreground mt-6 max-w-2xl text-lg">
          Munaxa builds the systems institutions actually run on — schools, workforces and
          controlled documents. One platform, one design system, one way of working.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/products" className={buttonVariants('default', 'lg')}>
            Explore the products
          </Link>
          <Link href="/contact" className={buttonVariants('outline', 'lg')}>
            Talk to us
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6" aria-labelledby="products-heading">
        <h2 id="products-heading" className="sr-only">
          Products
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PRODUCTS.map((product) => (
            <Card key={product.name}>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.blurb}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
