import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

const toneClass: Record<Tone, string> = {
  default: 'border-primary/30 bg-primary/15 text-primary',
  success: 'border-aqua/30 bg-aqua/15 text-aqua',
  warning: 'border-coral/30 bg-coral/15 text-coral',
  danger: 'border-destructive/30 bg-destructive/15 text-destructive',
  muted: 'border-border bg-secondary/60 text-muted-foreground',
};

export function Badge({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
