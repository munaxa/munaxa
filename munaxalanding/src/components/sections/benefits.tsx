import {
  LayoutGrid,
  ClipboardCheck,
  MessageCircle,
  CalendarCheck,
  TrendingUp,
  Wallet,
  Bus,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/types';

const ICONS: LucideIcon[] = [
  LayoutGrid,
  ClipboardCheck,
  MessageCircle,
  CalendarCheck,
  TrendingUp,
  Wallet,
  Bus,
  Gauge,
];

export function Benefits({ dict }: { dict: Dictionary }) {
  return (
    <section id="benefits" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {dict.benefits.heading}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{dict.benefits.description}</p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dict.benefits.items.map((benefit, index) => {
            const Icon = ICONS[index]!;
            return (
              <Card key={benefit.title} className="h-full">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-grad-primary text-primary-foreground shadow-glow">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
