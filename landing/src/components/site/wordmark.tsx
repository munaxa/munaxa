import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * The official Munaxa logo — the "munaxa." wordmark. Two theme-specific lockups (the brand's
 * official artwork, cropped to transparency): the ink wordmark on light backgrounds and the
 * white wordmark on dark. Swapped via the `dark:` variant so it always reads against the surface.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <>
      <Image
        src="/logo-light.png"
        alt="Munaxa"
        width={508}
        height={65}
        unoptimized
        className={cn('h-6 w-auto object-contain dark:hidden', className)}
      />
      <Image
        src="/logo-dark.png"
        alt="Munaxa"
        width={508}
        height={65}
        unoptimized
        className={cn('hidden h-6 w-auto object-contain dark:block', className)}
      />
    </>
  );
}
