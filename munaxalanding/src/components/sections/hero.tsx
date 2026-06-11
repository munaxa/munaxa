import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroIllustration } from '@/components/icons/hero-illustration';

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-grad-hero pb-20 pt-16 lg:pt-24">
      <div className="section-shell grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Badge>
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
            Built for K-12 schools &amp; education groups
          </Badge>

          <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            One platform to run your entire school —{' '}
            <span className="bg-grad-primary bg-clip-text text-transparent">
              from admissions to graduation
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            Munaxa is the enterprise School Operating System that brings students, staff, parents,
            attendance, academics, finance, and transportation into one secure, beautifully designed
            platform — so your team spends less time on paperwork and more time on education.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#contact" className={buttonVariants('default', 'lg', 'group')}>
              Book a Demo
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </a>
            <a href="#modules" className={buttonVariants('outline', 'lg')}>
              Explore the Platform
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-aqua" aria-hidden />
              Enterprise-grade security
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-aqua" aria-hidden />
              Multi-campus &amp; multi-tenant ready
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-aqua" aria-hidden />
              Arabic &amp; English, RTL native
            </span>
          </div>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-6 -z-10 rounded-[2rem] bg-grad-primary opacity-20 blur-3xl"
            aria-hidden
          />
          <HeroIllustration className="w-full drop-shadow-card" />
        </div>
      </div>
    </section>
  );
}
