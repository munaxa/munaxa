import {
  Users,
  CalendarCheck2,
  GraduationCap,
  MessagesSquare,
  Bus,
  Wallet,
  UserCog,
  BarChart4,
  type LucideIcon,
} from '@munaxa/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/types';

const ICONS: LucideIcon[] = [
  Users,
  CalendarCheck2,
  GraduationCap,
  MessagesSquare,
  Bus,
  Wallet,
  UserCog,
  BarChart4,
];

export function Modules({ dict }: { dict: Dictionary }) {
  return (
    <section id="modules" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {dict.modules.heading}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{dict.modules.description}</p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dict.modules.items.map((module, index) => {
            const Icon = ICONS[index]!;
            return (
              <Card key={module.title} className="h-full transition hover:border-primary/40">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-secondary/60 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle>{module.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{module.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
