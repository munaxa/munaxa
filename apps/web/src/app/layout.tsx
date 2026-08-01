import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Munaxa — operating systems for institutions',
    template: '%s · Munaxa',
  },
  description:
    'Munaxa builds operating systems for institutions: School, Work and Docs — one platform, one design system, one way of working.',
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
