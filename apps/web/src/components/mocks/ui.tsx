import { Badge, cn, type Tone } from '@munaxa/ui';

/*
 * Small pieces the product mock-ups share. Mock-ups are illustrations of product screens: they sit
 * in an `aria-hidden` panel, so these are presentational only.
 */

/** Status pill: the platform badge, rounded as the product screens draw it. */
export function Pill({ tone = 'default', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <Badge
      tone={tone}
      className="shrink-0 rounded-full border-0 px-2.5 font-semibold whitespace-nowrap"
    >
      {children}
    </Badge>
  );
}

export function CardHead({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <span className="font-display text-sm font-semibold">{title}</span>
      {children}
    </div>
  );
}

/** A document number or code beside a card title, e.g. QM-0001. */
export function Code({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs font-normal text-muted-foreground">{children}</span>;
}

/** Bold-ish title over a muted caption. */
export function TwoLine({
  title,
  sub,
  quiet,
}: {
  title: React.ReactNode;
  sub: React.ReactNode;
  /** Render the title at regular weight in body grey (a step not reached yet). */
  quiet?: boolean;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className={cn('block text-sm', quiet ? 'text-neutral-600' : 'font-medium')}>
        {title}
      </span>
      <span className="block text-xs text-muted-foreground">{sub}</span>
    </span>
  );
}

/** Round marker: a filled step, an initials avatar, a numbered step. */
export function Dot({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <span
      className={cn(
        'flex size-6.5 shrink-0 items-center justify-center rounded-full text-xs',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A step not reached yet: an empty grey ring. */
export function Ring({ className }: { className?: string }) {
  return (
    <span className={cn('size-6.5 shrink-0 rounded-full border-2 border-border', className)} />
  );
}

export function SmallButton({ solid, children }: { solid?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-md px-3 py-1.5 text-xs font-semibold',
        solid ?? 'border border-border text-neutral-600',
      )}
    >
      {children}
    </span>
  );
}

export function Bar({ pct, className }: { pct: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded bg-muted">
      <div className={cn('h-full', className)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-3.5', className)}
    >
      <path d="M12 3.5 5 6v5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export const rowRule = 'border-b border-border/70';
