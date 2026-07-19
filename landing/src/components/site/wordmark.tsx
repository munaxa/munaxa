import { cn } from '@/lib/cn';

/**
 * Munaxa wordmark — the monogram "M" tile (brand teal) + name, built from tokens so it tracks
 * the theme. Used in the header and footer.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-[0.55rem] bg-primary font-display text-sm font-bold text-primary-foreground shadow-[0_6px_18px_-8px_var(--glow)]"
      >
        M
      </span>
      <span className="font-display text-[1.05rem] font-semibold tracking-[-0.02em]">Munaxa</span>
    </span>
  );
}
