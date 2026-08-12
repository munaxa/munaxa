import { Page, PRODUCTS, ProductCard } from '@/components/site-shell';

export const metadata = { title: 'Products' };

export default function ProductsPage() {
  return (
    <Page
      title="One platform, three products."
      lead="Each product is built on the same design system and the same engineering standards, so they look, behave and are operated alike."
    >
      <div className="grid gap-6 md:grid-cols-3">
        {PRODUCTS.map((product) => (
          <ProductCard key={product.id} id={product.id} blurb={product.blurb} />
        ))}
      </div>
    </Page>
  );
}
