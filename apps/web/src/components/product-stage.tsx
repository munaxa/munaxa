'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { cn, themes, type BrandedProductId } from '@munaxa/ui';
import { BrowserChrome } from './browser-frame';
import { ProductDot } from './product-scope';

export interface StageProduct {
  id: BrandedProductId;
  name: string;
  category: string;
  shot: string;
  url: string;
  caption: string;
  href: string;
  link: string;
}

const ROTATE_MS = 6000;

/**
 * The hub hero's product window: School, Work and Docs dashboards in turn, every six seconds, with
 * a tab for each and a bar showing when the next switch comes. Visitors who ask for reduced motion
 * get a still window they switch themselves.
 */
export function ProductStage({ products }: { products: StageProduct[] }) {
  const [active, setActive] = useState(0);
  // Bumped on every switch so the progress bar restarts and the timer resets.
  const [cycle, setCycle] = useState(0);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setAuto(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setActive((a) => (a + 1) % products.length);
      setCycle((c) => c + 1);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [auto, cycle, products.length]);

  const go = useCallback((i: number) => {
    setActive(i);
    setCycle((c) => c + 1);
  }, []);

  const current = products[active] ?? products[0];
  if (!current) return null;

  return (
    <div className="relative mx-auto max-w-7xl px-8 pt-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-primary-950 to-primary-900 px-4 pt-4 sm:px-7 sm:pt-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute start-1/2 top-1/3 h-150 w-225 -translate-x-1/2 rounded-full opacity-45 blur-3xl transition-colors duration-700 rtl:translate-x-1/2"
          style={{ backgroundColor: themes[current.id].brand.color.DEFAULT }}
        />
        <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-3">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={i === active}
              onClick={() => go(i)}
              className={cn(
                'relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3.5 text-start transition-colors',
                'focus-visible:ring-2 focus-visible:ring-background focus-visible:outline-none',
                i === active
                  ? 'border-background bg-background text-foreground'
                  : 'border-background/10 bg-background/5 text-neutral-300',
              )}
            >
              <ProductDot product={p.id} className="size-2.5" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-base font-semibold">{p.name}</span>
                <span className="text-xs opacity-70">{p.category}</span>
              </span>
              {i === active && auto && (
                <span
                  key={cycle}
                  aria-hidden="true"
                  className="stage-progress absolute inset-x-0 bottom-0 h-0.75"
                  style={{ backgroundColor: themes[p.id].brand.color.DEFAULT }}
                />
              )}
            </button>
          ))}
        </div>
        <div className="relative mt-4 overflow-hidden rounded-t-2xl bg-background sm:mt-7">
          <BrowserChrome url={current.url} />
          <div className="relative aspect-16/10">
            {products.map((p, i) => (
              <Image
                key={p.shot}
                src={p.shot}
                alt={i === active ? `${p.name} dashboard` : ''}
                aria-hidden={i === active ? undefined : true}
                fill
                sizes="(max-width: 1280px) 100vw, 1160px"
                priority={i === 0}
                className={cn(
                  'object-cover object-left-top transition-opacity duration-700',
                  i === active ? 'opacity-100' : 'opacity-0',
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 px-1 pt-4 text-sm text-muted-foreground">
        <span>{current.caption}</span>
        <Link href={current.href} className="font-semibold text-primary-800 hover:text-primary-600">
          {current.link}
        </Link>
      </div>
    </div>
  );
}
