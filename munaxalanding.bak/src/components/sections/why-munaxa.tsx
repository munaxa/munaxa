import {
  Award,
  Building2,
  ShieldCheck,
  Globe2,
  Layers,
  Sparkles,
  type LucideIcon,
} from '@munaxa/icons';
import type { Dictionary } from '@/lib/i18n/types';

const ICONS: LucideIcon[] = [Award, Building2, Layers, Sparkles, Globe2, ShieldCheck];

export function WhyMunaxa({ dict }: { dict: Dictionary }) {
  return (
    <section id="why-munaxa" className="bg-secondary/30 py-20 sm:py-28">
      <div className="section-shell">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {dict.whyMunaxa.heading}
            </h2>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              {dict.whyMunaxa.description}
            </p>
            <div className="mt-8 hidden rounded-xl border border-border bg-card p-6 shadow-card lg:block">
              <p className="font-display text-lg font-semibold">{dict.whyMunaxa.cardTitle}</p>
              <p className="mt-2 text-sm text-muted-foreground">{dict.whyMunaxa.cardBody}</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {dict.whyMunaxa.reasons.map((reason, index) => {
              const Icon = ICONS[index]!;
              return (
                <div key={reason.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold">{reason.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{reason.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
