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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ModuleItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const MODULES: ModuleItem[] = [
  {
    icon: Users,
    title: 'Student Management',
    description:
      'A complete profile for every student — enrollment, records, guardians, and academic history — all in one place.',
  },
  {
    icon: CalendarCheck2,
    title: 'Attendance',
    description:
      'Effortless daily attendance tracking for students and staff, with real-time visibility for administrators and parents.',
  },
  {
    icon: GraduationCap,
    title: 'Academics',
    description:
      'Manage classes, subjects, schedules, and academic results in a structured, organized way.',
  },
  {
    icon: MessagesSquare,
    title: 'Communication',
    description:
      'Reach parents and staff instantly with announcements, notifications, and direct messaging.',
  },
  {
    icon: Bus,
    title: 'Transportation',
    description: 'Plan and manage bus routes and student transportation with confidence.',
  },
  {
    icon: Wallet,
    title: 'Finance',
    description:
      'Manage tuition, billing, and payments with clarity for both your finance team and parents.',
  },
  {
    icon: UserCog,
    title: 'HR',
    description:
      'Keep staff records, roles, and school structure organized as your institution grows.',
  },
  {
    icon: BarChart4,
    title: 'Reporting',
    description:
      'Turn school data into clear, actionable reports for leadership, owners, and boards.',
  },
];

export function Modules() {
  return (
    <section id="modules" className="py-20 sm:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your school needs, in one platform
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Munaxa brings together the core operational areas of a modern school — built to work
            together, so information flows naturally across your organization.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((module) => (
            <Card key={module.title} className="h-full transition hover:border-primary/40">
              <CardHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-secondary/60 text-primary">
                  <module.icon className="h-5 w-5" aria-hidden />
                </div>
                <CardTitle>{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{module.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
