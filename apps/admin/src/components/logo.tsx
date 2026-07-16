import Image from 'next/image';
import { cn } from '@munaxa/ui';

// Intrinsic aspect ratio of the Munaxa open-book + graduation-cap mark (docs/design-system/logo.png).
const RATIO = 1103 / 904;

/**
 * The Munaxa brand mark. `size` is the rendered height in px; width is derived from the
 * logo's intrinsic aspect ratio so it never distorts. Served from /munaxa-logo.png.
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
  return (
    <Image
      src="/munaxa-logo.png"
      alt="Munaxa"
      width={Math.round(size * RATIO)}
      height={size}
      priority={priority}
      // The detailed glossy mark loses gradient/edge detail at next/image's default
      // quality (75) — render it lossless so it stays crisp at hero sizes.
      quality={100}
      className={cn('object-contain', className)}
    />
  );
}
