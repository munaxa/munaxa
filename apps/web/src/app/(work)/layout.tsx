import type { Metadata } from 'next';
import { RootDocument, baseMetadata, iconsFor, viewportFor } from '@/components/root-document';
import '@/styles/work.css';

export const metadata: Metadata = { ...baseMetadata, icons: iconsFor('work') };
export const viewport = viewportFor('work');

/** The Munaxa Work page wears the Work theme, and only that. */
export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument>{children}</RootDocument>;
}
