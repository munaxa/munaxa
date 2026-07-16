import Image from 'next/image';
import { cn } from '@/lib/cn';

// Intrinsic aspect ratio of the Munaxa open-book + graduation-cap mark (the vendored logo.png).
const RATIO = 894 / 736;

/** The Munaxa brand mark. `size` is the rendered height in px; width is derived from
 *  the logo's intrinsic aspect ratio so it never distorts. */
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
      className={cn('object-contain', className)}
    />
  );
}
