import type { Metadata } from 'next';
import { RootDocument, baseMetadata, iconsFor, viewportFor } from '@/components/root-document';
import '@/styles/docs.css';

export const metadata: Metadata = { ...baseMetadata, icons: iconsFor('docs') };
export const viewport = viewportFor('docs');

/** The Munaxa Docs page wears the Docs theme, and only that. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument>{children}</RootDocument>;
}
