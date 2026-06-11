import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@munaxa/ui';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium ' +
  'transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:pointer-events-none disabled:opacity-50';

const variantClass: Record<ButtonVariant, string> = {
  default: 'bg-grad-primary text-primary-foreground shadow-glow hover:opacity-95',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-transparent text-foreground hover:bg-secondary/50',
  ghost: 'bg-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
};

/** Returns the Button's classes — usable on non-`<button>` elements (e.g. `<a>` CTAs). */
export function buttonVariants(
  variant: ButtonVariant = 'default',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, variantClass[variant], sizeClass[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonVariants(variant, size, className)} {...props} />
  );
});
