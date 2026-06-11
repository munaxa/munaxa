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

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: LayoutGrid,
    title: 'Centralized school operations',
    description:
      'Bring every department — admissions, academics, finance, HR, and transportation — onto a single platform, eliminating scattered spreadsheets and disconnected tools.',
  },
  {
    icon: ClipboardCheck,
    title: 'Reduced administrative workload',
    description:
      'Automate routine tasks like enrollment, scheduling, and reporting so your staff can focus on students instead of paperwork.',
  },
  {
    icon: MessageCircle,
    title: 'Improved parent communication',
    description:
      'Keep families informed and engaged with timely updates, announcements, and direct messaging — building trust and satisfaction.',
  },
  {
    icon: CalendarCheck,
    title: 'Better attendance monitoring',
    description:
      'Track student and staff attendance in real time, spot patterns early, and reduce absenteeism with automated alerts.',
  },
  {
    icon: TrendingUp,
    title: 'Academic performance visibility',
    description:
      'Give leadership, teachers, and parents a clear view of academic progress with consolidated, easy-to-understand insights.',
  },
  {
    icon: Wallet,
    title: 'Financial transparency',
    description:
      'Get a clear, real-time picture of tuition collections, outstanding balances, and overall school finances at every level.',
  },
  {
    icon: Bus,
    title: 'Transportation management',
    description:
      'Coordinate routes, vehicles, and student assignments to keep transportation safe, organized, and on schedule.',
  },
  {
    icon: Gauge,
    title: 'Operational efficiency',
    description:
      'Streamline day-to-day workflows across campuses so your school runs smoothly — even as it grows.',
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Outcomes that matter to your school
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Munaxa is designed around the results school leaders care about — less admin overhead,
            happier families, and clearer visibility into how your school is running.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title} className="h-full">
              <CardHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-grad-primary text-primary-foreground shadow-glow">
                  <benefit.icon className="h-5 w-5" aria-hidden />
                </div>
                <CardTitle>{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{benefit.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
