import Image from 'next/image';
import Link from 'next/link';
import { buttonVariants, cn, type BrandedProductId } from '@munaxa/ui';
import { Lockup } from './brand';
import { BrowserChrome, ScreenshotStage } from './browser-frame';
import { anchor } from '@/lib/anchor';
import { productTone } from '@/lib/products';

/*
 * The sections every product page is built from, top to bottom. Each takes the product so it can
 * read the product's ramp steps from `productTone`; the page's root layout has already loaded that
 * product's theme.
 */

const container = 'mx-auto max-w-7xl px-8';

/* ---------- Hero ---------- */

export function ProductHero({
  product,
  badge,
  title,
  sub,
  primaryCta,
  bullets,
  shot,
}: {
  product: BrandedProductId;
  badge?: string;
  title: string;
  sub: string;
  primaryCta: string;
  bullets: string[];
  shot: { src: string; alt: string; url: string };
}) {
  const tone = productTone[product];
  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className={cn('hero-grid pointer-events-none absolute inset-0', tone.grid)}
      />
      <div className={cn(container, 'relative pt-20')}>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Lockup product={product} height={44} priority />
            {badge && <SoonBadge>{badge}</SoonBadge>}
          </div>
          <h1 className="font-display max-w-4xl text-5xl leading-none font-bold tracking-tighter text-balance sm:text-6xl lg:text-7xl xl:text-8xl">
            {title}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-neutral-600 lg:text-xl">{sub}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="#demo"
              className={buttonVariants(
                'default',
                'lg',
                cn('h-12 rounded-lg px-7 font-semibold', tone.solid),
              )}
            >
              {primaryCta}
            </a>
            <a
              href={anchor('features')}
              className={buttonVariants('outline', 'lg', 'h-12 rounded-lg px-7 font-semibold')}
            >
              See features
            </a>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone.mark)} />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <ScreenshotStage className={cn('mt-14', tone.stage)} frameClassName={tone.frame}>
          <BrowserChrome url={shot.url} />
          <Image
            src={shot.src}
            alt={shot.alt}
            width={1600}
            height={1000}
            sizes="(max-width: 1280px) 100vw, 1216px"
            priority
            className="block h-auto w-full"
          />
        </ScreenshotStage>
      </div>
    </section>
  );
}

/** "Launching soon" marker for Work, used while `site.workLaunchingSoon` is on. */
export function SoonBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold whitespace-nowrap text-primary-800">
      {children}
    </span>
  );
}

/* ---------- Facts ---------- */

export function Facts({ items }: { items: { value: string; text: string }[] }) {
  return (
    <section aria-label="Key facts" className={cn(container, 'pt-20')}>
      <dl className="grid grid-cols-1 border-t border-foreground/10 md:grid-cols-3">
        {items.map((f, i) => (
          <div
            key={f.text}
            className={cn(
              'py-7 md:px-7',
              i === 0 ? 'md:ps-0' : 'md:border-s md:border-foreground/10',
            )}
          >
            <dt className="font-display text-5xl leading-none font-semibold tracking-tighter">
              {f.value}
            </dt>
            <dd className="mt-3 max-w-xs text-base leading-normal text-neutral-600">{f.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------- Features ---------- */

export function FeaturesIntro({ product, title }: { product: BrandedProductId; title: string }) {
  return (
    <div id="features" className={cn(container, 'pt-28 pb-6')}>
      <div className="flex max-w-3xl flex-col gap-4">
        <div className={cn('text-sm font-semibold', productTone[product].eyebrow)}>
          What&apos;s inside
        </div>
        <h2 className="font-display text-4xl leading-tight font-semibold tracking-tight lg:text-5xl">
          {title}
        </h2>
      </div>
    </div>
  );
}

/** "01 · Timetable", preceded by a short rule in the product colour. */
export function Eyebrow({
  product,
  children,
}: {
  product: BrandedProductId;
  children: React.ReactNode;
}) {
  const tone = productTone[product];
  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-sm font-semibold', tone.eyebrow)}>
      <span aria-hidden="true" className={cn('h-0.5 w-7', tone.mark)} />
      {children}
    </div>
  );
}

export function Feature({
  product,
  id,
  index,
  label,
  title,
  body,
  checks,
  visual,
  visualFirst,
  last,
}: {
  product: BrandedProductId;
  id?: string;
  index: string;
  label: string;
  title: string;
  body: string;
  checks: string[];
  /** The product mock-up, usually a `MockPanel`. */
  visual: React.ReactNode;
  /** Put the mock-up first, which is also its reading order on narrow screens. */
  visualFirst?: boolean;
  last?: boolean;
}) {
  const tone = productTone[product];
  const copy = (
    <div className="flex max-w-md flex-col gap-4">
      <Eyebrow product={product}>
        {index} · {label}
      </Eyebrow>
      <h3 className="font-display text-3xl leading-tight font-semibold tracking-tight lg:text-4xl">
        {title}
      </h3>
      <p className="text-base leading-relaxed text-neutral-600">{body}</p>
      <ul className="mt-1 flex flex-col gap-2.5 text-base text-foreground">
        {checks.map((c) => (
          <li key={c} className="flex items-baseline gap-3">
            <span aria-hidden="true" className={cn('font-bold', tone.markText)}>
              ✓
            </span>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section id={id} className={cn(container, 'py-14', last && 'pb-28')}>
      <div className="grid grid-cols-1 items-center gap-x-20 gap-y-12 lg:grid-cols-2">
        {visualFirst ? (
          <>
            {visual}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {visual}
          </>
        )}
      </div>
    </section>
  );
}

/** Tinted panel holding a white card: the frame every feature mock-up sits in. */
export function MockPanel({
  product,
  className,
  children,
}: {
  product: BrandedProductId;
  className?: string;
  children: React.ReactNode;
}) {
  const tone = productTone[product];
  return (
    <div aria-hidden="true" className={cn('rounded-2xl p-4 sm:p-8', tone.tint)}>
      <div className={cn('rounded-xl border bg-card p-5 shadow-card', tone.frame, className)}>
        {children}
      </div>
    </div>
  );
}

/* ---------- Capabilities ---------- */

export function Capabilities({
  productName,
  items,
  shaded,
}: {
  productName: string;
  items: { t: string; d: string }[];
  shaded: boolean;
}) {
  return (
    <section className={cn(shaded && 'bg-muted')}>
      <div className={cn(container, 'py-28')}>
        <div className="mb-11 flex flex-wrap items-end justify-between gap-x-12 gap-y-5">
          <h2 className="font-display max-w-md text-3xl leading-tight font-semibold tracking-tight lg:text-4xl">
            Also included, with no add-ons.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-neutral-600">
            Every {productName} license includes the full product, with nothing held back for a
            higher tier.
          </p>
        </div>
        <ul className="grid grid-cols-1 border-s border-t border-foreground/10 bg-background sm:grid-cols-2 lg:grid-cols-4">
          {items.map((c) => (
            <li key={c.t} className="border-e border-b border-foreground/10 px-6 py-6">
              <div className="font-display text-base font-semibold">{c.t}</div>
              <div className="mt-1.5 text-sm leading-relaxed text-neutral-600">{c.d}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Security strip ---------- */

export function SecurityStrip({
  title,
  text,
  flushTop,
}: {
  title: string;
  text: string;
  flushTop?: boolean;
}) {
  return (
    <section className={cn(container, 'py-28', flushTop && 'pt-0')}>
      <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-7 rounded-3xl bg-neutral-950 p-8 text-neutral-100 lg:p-12">
        <div className="flex min-w-0 flex-1 basis-96 flex-col gap-3">
          <div className="text-sm font-semibold text-neutral-400">
            Built on the Munaxa security platform
          </div>
          <h2 className="font-display text-2xl leading-tight font-semibold tracking-tight lg:text-3xl">
            {title}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-neutral-400">{text}</p>
        </div>
        <Link
          href="/#security"
          className="rounded-lg border border-background/25 px-5 py-3 text-sm font-semibold whitespace-nowrap text-background hover:border-background"
        >
          How we protect your data →
        </Link>
      </div>
    </section>
  );
}

/* ---------- Demo band ---------- */

export function DemoBand({
  product,
  title,
  sub,
  children,
}: {
  product: BrandedProductId;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  const tone = productTone[product];
  return (
    <section id="demo" className={cn(tone.band, 'text-background')}>
      <div className={cn(container, 'py-28')}>
        <div className="grid grid-cols-1 items-center gap-x-22 gap-y-14 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-4xl leading-none font-semibold tracking-tighter lg:text-6xl">
              {title}
            </h2>
            <p className={cn('max-w-md text-lg leading-relaxed', tone.bandText)}>{sub}</p>
          </div>
          <div className="rounded-2xl bg-card p-6 text-card-foreground shadow-card sm:p-9">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
