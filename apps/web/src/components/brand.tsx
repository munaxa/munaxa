import Image from 'next/image';
import { BrandProvider, ProductLogo, cn, corporateBrand, type BrandedProductId } from '@munaxa/ui';

/**
 * A product's approved horizontal lockup.
 *
 * `ProductLogo` reads its product from a `BrandProvider`. The corporate pages name products rather
 * than belonging to one, so each lockup scopes its own provider — what the provider is for.
 */
export function Lockup({
  product,
  height,
  priority,
  className,
}: {
  product: BrandedProductId;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <BrandProvider product={product}>
      <ProductLogo height={height} priority={priority ?? false} className={className ?? ''} />
    </BrandProvider>
  );
}

/**
 * The corporate mark and wordmark. There is no corporate lockup in the approved artwork, so the
 * wordmark is set as text beside the symbol, as the platform recommends.
 */
export function CorporateMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { symbol } = corporateBrand.assets;
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src={symbol.src}
        alt=""
        aria-hidden="true"
        width={symbol.width}
        height={symbol.height}
        className={cn('w-auto', size === 'sm' ? 'h-6' : 'h-7')}
      />
      <span
        className={cn(
          'font-display font-bold tracking-tight text-foreground',
          size === 'sm' ? 'text-base' : 'text-lg',
        )}
      >
        munaxa
      </span>
    </span>
  );
}
