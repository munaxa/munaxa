import Image from 'next/image';
import { cn } from '@munaxa/ui';

// Intrinsic aspect ratio of the Munaxa wordmark logo (docs/design-system/logo-*.png).
const RATIO = 1264 / 843;

/**
 * The Munaxa logo. `size` is the rendered height in px; width is derived from the logo's
 * intrinsic aspect ratio so it never distorts. Theme-aware: the black-bordered light logo
 * shows on the light theme and the white-bordered dark logo on the dark theme. Served as
 * static assets (the Cloudflare/OpenNext optimizer chokes on the detailed image).
 */
export function Logo({
  size = 32,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const width = Math.round(size * RATIO);
  return (
    <>
      <Image
        src="/munaxa-logo-light.png"
        alt="Munaxa"
        width={width}
        height={size}
        priority={priority}
        unoptimized
        className={cn('object-contain dark:hidden', className)}
      />
      <Image
        src="/munaxa-logo-dark.png"
        alt="Munaxa"
        width={width}
        height={size}
        priority={priority}
        unoptimized
        className={cn('hidden object-contain dark:block', className)}
      />
    </>
  );
}
