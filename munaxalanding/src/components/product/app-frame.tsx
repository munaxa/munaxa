import { Lock } from '@munaxa/icons';
import { cn } from '@/lib/cn';

/**
 * A browser/app window chrome used to frame in-product UI previews so they read as
 * real screenshots of the Munaxa platform. Purely presentational.
 */
export function AppFrame({
  label,
  children,
  className,
  ariaLabel,
}: {
  label: string;
  children: React.ReactNode;
  className?: string | undefined;
  ariaLabel?: string | undefined;
}) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-card',
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-destructive/70" />
          <span className="h-3 w-3 rounded-full bg-coral/70" />
          <span className="h-3 w-3 rounded-full bg-aqua/70" />
        </div>
        <div className="mx-auto flex max-w-[60%] items-center gap-1.5 truncate rounded-md border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden />
          <span className="truncate" dir="ltr">
            {label}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
