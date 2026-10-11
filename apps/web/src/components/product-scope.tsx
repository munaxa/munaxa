import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cn, themes, type BrandedProductId } from '@munaxa/ui';

/**
 * Gives one product's colours to everything inside it, on a page themed for another product (or
 * for the group). See `.product-scope` in `styles/corporate.css` for how the ramp is derived.
 *
 * The colours are read from the platform's theme registry, so nothing here names one.
 */
export function ProductScope({
  product,
  as: Tag = 'div',
  className,
  children,
  ...rest
}: {
  product: BrandedProductId;
  as?: ElementType;
  className?: string | undefined;
  children: ReactNode;
  id?: string | undefined;
}) {
  const { color } = themes[product].brand;
  const style = { '--scope-brand': color.DEFAULT, '--scope-deep': color.dark } as CSSProperties;
  return (
    <Tag className={cn('product-scope', className)} style={style} {...rest}>
      {children}
    </Tag>
  );
}

/** A product's colour dot, for lists that name all three products. */
export function ProductDot({
  product,
  className,
}: {
  product: BrandedProductId;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ backgroundColor: themes[product].brand.color.DEFAULT }}
    />
  );
}
