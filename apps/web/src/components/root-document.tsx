import type { Metadata, Viewport } from 'next';
import { brandIcons, corporateBrand, productBrands, type BrandedProductId } from '@munaxa/ui';
import { fontVariables } from '@/lib/fonts';
import { site, siteVerification } from '@/lib/site';

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
  creator: site.legalName,
  publisher: site.legalName,
  // Let search engines show large image previews and full-length snippets.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    ...(siteVerification.google && { google: siteVerification.google }),
    ...(siteVerification.bing && { other: { 'msvalidate.01': siteVerification.bing } }),
  },
  openGraph: { siteName: site.name, type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
};

/**
 * A page's own metadata. Next merges `openGraph` and `twitter` shallowly, so a page that sets them
 * replaces the layout's entirely; this rebuilds both in full for every page.
 */
export function pageMetadata(p: {
  title: string;
  description: string;
  path: string;
  /** Share image, 1200 wide. */
  image: { src: string; width: number; height: number; alt: string };
}): Metadata {
  const images = [
    { url: p.image.src, width: p.image.width, height: p.image.height, alt: p.image.alt },
  ];
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: p.path },
    openGraph: {
      siteName: site.name,
      type: 'website',
      locale: 'en_US',
      title: p.title,
      description: p.description,
      url: p.path,
      images,
    },
    twitter: { card: 'summary_large_image', title: p.title, description: p.description, images },
  };
}

/** Browser chrome colour, read from the registry: it paints before any stylesheet exists. */
export function viewportFor(product?: BrandedProductId): Viewport {
  return { themeColor: product ? productBrands[product].color : corporateBrand.color };
}

export function iconsFor(product?: BrandedProductId): Metadata['icons'] {
  return brandIcons(product ? productBrands[product] : corporateBrand);
}
