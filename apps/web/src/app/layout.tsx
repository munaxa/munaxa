import type { Metadata, Viewport } from 'next';
import { brandIcons, corporateBrand } from '@munaxa/ui';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import './globals.css';

/**
 * The company's own identity, which until now had no icon at all.
 *
 * The corporate mark exists as artwork for the first time — the shared M in the corporate navy —
 * so the tab can stop showing the framework's default. There is deliberately no lockup to render:
 * every lockup in the approved artwork sets a product word beneath `munaxa.`, so the header and
 * footer keep setting the wordmark as text, which is what they already did and what reads
 * correctly inside a line of type.
 */
export const metadata: Metadata = {
  title: {
    default: 'Munaxa — operating systems for institutions',
    template: '%s · Munaxa',
  },
  description:
    'Munaxa builds operating systems for institutions: School, Work and Docs — one platform, one design system, one way of working.',
  applicationName: corporateBrand.name,
  icons: brandIcons(corporateBrand),
};

export const viewport: Viewport = {
  // The corporate navy, read from the theme registry. The browser paints its chrome before any
  // stylesheet exists to read `--primary` from, which is the one case a raw hex is right.
  themeColor: corporateBrand.color,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
