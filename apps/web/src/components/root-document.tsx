import type { Metadata, Viewport } from 'next';
import { brandIcons, corporateBrand, productBrands, type BrandedProductId } from '@munaxa/ui';
import { fontVariables } from '@/lib/fonts';
import { site } from '@/lib/site';

/**
 * The `<html>` shell every root layout renders.
 *
 * There are four root layouts (the hub and one per product, as route groups) because each page
 * wears exactly one theme and the platform's themes are written for `:root`. A link from one
 * group to another is a full page load, so a page never carries two themes' styles.
 */
export function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="overflow-x-clip">{children}</body>
    </html>
  );
}

export const baseMetadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: corporateBrand.name,
  openGraph: { siteName: site.name, type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

/** Browser chrome colour, read from the registry: it paints before any stylesheet exists. */
export function viewportFor(product?: BrandedProductId): Viewport {
  return { themeColor: product ? productBrands[product].color : corporateBrand.color };
}

export function iconsFor(product?: BrandedProductId): Metadata['icons'] {
  return brandIcons(product ? productBrands[product] : corporateBrand);
}
