import type { Metadata } from 'next';
import { RootDocument, baseMetadata, iconsFor, viewportFor } from '@/components/root-document';
import '@/styles/corporate.css';

export const metadata: Metadata = { ...baseMetadata, icons: iconsFor() };
export const viewport = viewportFor();

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument>{children}</RootDocument>;
}
