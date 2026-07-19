import { cn } from '@/lib/cn';

/**
 * The Munaxa wordmark — the name always set lowercase, followed by the square brand mark (the
 * teal `--primary` square from the official "munaxa." logo / favicon). The square is sized in
 * `em` so it scales with the surrounding type and tracks the brand color across themes.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-end font-display text-[1.15rem] font-semibold lowercase tracking-[-0.02em]',
        className,
      )}
    >
      munaxa
      <span
        aria-hidden
        className="mb-[0.12em] ms-[0.14em] inline-block h-[0.26em] w-[0.26em] rounded-[1px] bg-primary"
      />
    </span>
  );
}
