import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppFrame } from '@/components/product/app-frame';
import { DashboardPreview } from '@/components/product/dashboard-preview';
import { DEMO_URL } from '@/lib/constants';
import type { Dictionary } from '@/lib/i18n/types';

export function Hero({ dict }: { dict: Dictionary }) {
  return (
    <section id="top" className="relative overflow-hidden bg-grad-hero pb-20 pt-16 lg:pt-24">
      <div className="section-shell grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Badge>
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
            {dict.hero.badge}
          </Badge>

          <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {dict.hero.titleLine1}
            <span className="bg-grad-primary bg-clip-text text-transparent">
              {dict.hero.titleHighlight}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            {dict.hero.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={DEMO_URL} className={buttonVariants('default', 'lg', 'group')}>
              {dict.hero.ctaPrimary}
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180"
                aria-hidden
              />
            </a>
            <a href="#modules" className={buttonVariants('outline', 'lg')}>
              {dict.hero.ctaSecondary}
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {dict.hero.trust.map((item) => (
              <span key={item} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-aqua" aria-hidden />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-6 -z-10 rounded-3xl bg-grad-primary opacity-20 blur-3xl"
            aria-hidden
          />
          <AppFrame
            label="app.munaxa.com/dashboard"
            ariaLabel={dict.hero.illustrationAlt}
            className="w-full"
          >
            <DashboardPreview />
          </AppFrame>
        </div>
      </div>
    </section>
  );
}
