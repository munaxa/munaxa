import { Card, CardHeader, CardTitle, CardDescription } from '@munaxa/ui';
import { Page, PRODUCTS } from '@/components/site-shell';

export const metadata = { title: 'Products' };

export default function ProductsPage() {
  return (
    <Page
      title="One platform, three products."
      lead="Each product is built on the same design system and the same engineering standards, so they look, behave and are operated alike."
    >
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
    </Page>
  );
}
