import { CalendarCheck, MessageSquare, Smartphone, GraduationCap, Wallet } from '@munaxa/icons';
import { type Icon } from '@munaxa/icons';
import { Reveal } from '@/components/motion/reveal';

/**
 * "A single day, connected" — one event (a student marked present at 08:12) traced as it ripples
 * through the platform. This is how attendance and academics show up on the page: not as a card,
 * but as a chain of consequences no one had to trigger by hand.
 */

type Step = { time: string; module: string; icon: Icon; title: string; body: string };

const STEPS: Step[] = [
  {
    time: '08:12',
    module: 'Attendance',
    icon: CalendarCheck,
    title: 'Adam is marked present',
    body: 'A teacher taps once on the class register. The student record updates instantly.',
  },
  {
    time: '08:12',
    module: 'Communication',
    icon: MessageSquare,
    title: 'A note goes out — automatically',
    body: 'No one composes it. Attendance itself triggers the parent update.',
  },
  {
    time: '08:13',
    module: 'Parent app',
    icon: Smartphone,
    title: 'His mother already knows',
    body: '“Present · 08:12.” She never had to call the front office.',
  },
  {
    time: '13:40',
    module: 'Academics',
    icon: GraduationCap,
    title: 'A grade is entered',
    body: 'Term averages recalculate and the report card reflects it — no spreadsheet in sight.',
  },
  {
    time: '16:00',
    module: 'Finance',
    icon: Wallet,
    title: 'The books stay current',
    body: 'Fees, discounts and balances move with the record, ready for JoFotara.',
  },
];

export function ConnectedDay() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-secondary/30 py-24 sm:py-32">
      <div className="shell">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">03 — How it feels</p>
          <h2 className="display mt-4 text-4xl sm:text-5xl">A single day, connected.</h2>
          <p className="mt-5 text-lg text-muted-foreground">
            One tap on the attendance register. Watch what happens next — none of it typed twice.
          </p>
        </Reveal>

        <ol className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {/* connecting rail (desktop) */}
          <div
            className="absolute left-0 right-0 top-6 hidden h-px bg-border lg:block"
            aria-hidden
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal as="li" key={i} delay={i * 90} className="relative">
                <div className="relative z-10 grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card text-primary shadow-sm">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <p className="mono mt-4 text-[0.72rem] text-muted-foreground">
                  {s.time} · {s.module}
                </p>
                <p className="mt-1 font-display text-[0.95rem] font-semibold leading-snug">
                  {s.title}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
