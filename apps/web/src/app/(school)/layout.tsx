import type { Metadata } from 'next';
import { RootDocument, baseMetadata, iconsFor, viewportFor } from '@/components/root-document';
import '@/styles/school.css';

export const metadata: Metadata = { ...baseMetadata, icons: iconsFor('school') };
export const viewport = viewportFor('school');

/** The Munaxa School page wears the School theme, and only that. */
export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument>{children}</RootDocument>;
}
