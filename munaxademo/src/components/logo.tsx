import Image from 'next/image';
import { cn } from '@/lib/cn';

// Intrinsic aspect ratio of the Munaxa wordmark logo (the vendored logo-*.png).
const RATIO = 1264 / 843;

/** The Munaxa logo. `size` is the rendered height in px; width is derived from the logo's
 *  intrinsic aspect ratio so it never distorts. Theme-aware: black-bordered light logo on the
 *  light theme, white-bordered dark logo on the dark theme. Served as static assets. */
export function Logo({
  size = 32,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  // Rendered at the requested height (1x); callers size each placement directly.
  const height = size;
  const width = Math.round(height * RATIO);
  return (
    <>
      <Image
        src="/munaxa-logo-light.png"
        alt="Munaxa"
        width={width}
        height={height}
        priority={priority}
        unoptimized
        className={cn('object-contain dark:hidden', className)}
      />
      <Image
        src="/munaxa-logo-dark.png"
        alt="Munaxa"
        width={width}
        height={height}
        priority={priority}
        unoptimized
        className={cn('hidden object-contain dark:block', className)}
      />
    </>
  );
}
