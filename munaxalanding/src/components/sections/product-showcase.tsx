import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { AppFrame } from '@/components/product/app-frame';
import { DashboardPreview } from '@/components/product/dashboard-preview';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEMO_URL } from '@/lib/constants';
import type { Dictionary } from '@/lib/i18n/types';

export function ProductShowcase({ dict }: { dict: Dictionary }) {
  const s = dict.showcase;
  return (
    <section id="product" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <Badge>
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
            {s.eyebrow}
          </Badge>
          <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {s.heading}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{s.description}</p>
        </div>

        <div className="relative mt-12">
          <div
            className="absolute -inset-x-8 -top-8 bottom-0 -z-10 rounded-[2.5rem] bg-primary opacity-10 blur-3xl"
            aria-hidden
          />
          <AppFrame label={s.frameLabel} ariaLabel={s.altText} className="mx-auto max-w-5xl">
            <DashboardPreview />
          </AppFrame>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {s.bullets.map((bullet) => (
            <div key={bullet} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aqua/15 text-aqua">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              <p className="text-sm text-muted-foreground">{bullet}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a href={DEMO_URL} className={buttonVariants('default', 'lg', 'group')}>
            {s.cta}
            <ArrowRight
              className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180"
              aria-hidden
            />
          </a>
        </div>
      </div>
    </section>
  );
}
