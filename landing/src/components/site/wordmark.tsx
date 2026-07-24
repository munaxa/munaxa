import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * The official Munaxa logo. Two theme assets are swapped with the `dark:` variant:
 * `logo-light.png` on light surfaces and `logo-dark.png` on dark.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <>
      <Image
        src="/logo-light.png"
        alt="Munaxa"
        width={640}
        height={427}
        unoptimized
        className={cn('h-10 w-auto object-contain dark:hidden', className)}
      />
      <Image
        src="/logo-dark.png"
        alt="Munaxa"
        width={640}
        height={427}
        unoptimized
        className={cn('hidden h-10 w-auto object-contain dark:block', className)}
      />
    </>
  );
}
