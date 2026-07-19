import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * The official Munaxa logo — the full brand block (the "munaxa." wordmark shown as one unit with
 * its upper light half and lower dark half). Rendered as a single image, identical in both
 * themes, since the block carries its own light/dark treatment.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Munaxa"
      width={640}
      height={427}
      unoptimized
      className={cn('h-10 w-auto object-contain', className)}
    />
  );
}
