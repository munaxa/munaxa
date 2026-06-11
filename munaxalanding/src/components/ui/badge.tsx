import type { HTMLAttributes } from 'react';
import { cn } from '@munaxa/ui';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 ' +
          'px-3 py-1 text-xs font-medium text-secondary-foreground',
        className,
      )}
      {...props}
    />
  );
}
