import { cn } from '@munaxa/ui';

/** The browser title bar (three dots and a URL pill) above every product screenshot. */
export function BrowserChrome({ url }: { url: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-2 border-b border-border bg-neutral-50 px-4 py-2.5"
    >
      <span className="size-3 rounded-full bg-neutral-200" />
      <span className="size-3 rounded-full bg-neutral-200" />
      <span className="size-3 rounded-full bg-neutral-200" />
      <span className="mx-auto rounded-md border border-border bg-background px-10 py-1 text-xs text-muted-foreground">
        {url}
      </span>
    </div>
  );
}

/** Tinted stage with a screenshot rising out of its bottom edge. */
export function ScreenshotStage({
  className,
  frameClassName,
  children,
}: {
  className?: string;
  frameClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl px-4 pt-4 sm:px-8 sm:pt-8 lg:px-11 lg:pt-11',
        className,
      )}
    >
      <div
        className={cn(
          'overflow-hidden rounded-t-xl border border-b-0 bg-background shadow-card',
          frameClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
