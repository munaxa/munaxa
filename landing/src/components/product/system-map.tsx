import {
  UserPlus,
  Users,
  CalendarCheck,
  GraduationCap,
  Wallet,
  Briefcase,
  Bus,
  MessageSquare,
  type Icon,
} from '@munaxa/icons';

/**
 * The connective diagram — one core with every department orbiting it, each wired back to the
 * center. This is the argument of the whole page: the modules are not apps side by side, they are
 * one system sharing one record. Lines animate a slow "data flow" toward the core.
 */

type Node = { label: string; icon: Icon; x: number; y: number };

// Eight departments evenly placed on a ring around the core (percent coordinates).
const NODES: Node[] = [
  { label: 'Admissions', icon: UserPlus, x: 50, y: 6 },
  { label: 'Students', icon: Users, x: 81, y: 19 },
  { label: 'Attendance', icon: CalendarCheck, x: 94, y: 50 },
  { label: 'Academics', icon: GraduationCap, x: 81, y: 81 },
  { label: 'Finance', icon: Wallet, x: 50, y: 94 },
  { label: 'HR', icon: Briefcase, x: 19, y: 81 },
  { label: 'Transport', icon: Bus, x: 6, y: 50 },
  { label: 'Communication', icon: MessageSquare, x: 19, y: 19 },
];

export function SystemMap() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-xl">
      {/* Connecting lines + soft core glow */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#coreGlow)" />
        {NODES.map((n) => (
          <line
            key={n.label}
            x1="50"
            y1="50"
            x2={n.x}
            y2={n.y}
            stroke="var(--primary)"
            strokeOpacity="0.45"
            strokeWidth="0.4"
            strokeDasharray="1.4 2.4"
            style={{ animation: 'dash-flow 1.6s linear infinite' }}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Core */}
      <div className="absolute left-1/2 top-1/2 z-10 flex h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-primary/30 bg-card text-center shadow-[0_20px_60px_-20px_var(--glow)]">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-base font-bold text-primary-foreground">
          M
        </span>
        <span className="mt-1.5 px-1 font-display text-[0.7rem] font-semibold leading-tight">
          Munaxa OS
        </span>
      </div>

      {/* Nodes */}
      {NODES.map((n) => {
        const Icon = n.icon;
        return (
          <div
            key={n.label}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card text-primary shadow-[0_10px_30px_-16px_color-mix(in_oklch,var(--foreground)_50%,transparent)]">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="whitespace-nowrap text-[0.62rem] font-medium text-muted-foreground">
              {n.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
