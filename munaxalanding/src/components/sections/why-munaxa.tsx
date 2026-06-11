import {
  Award,
  Building2,
  ShieldCheck,
  Globe2,
  Layers,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface Reason {
  icon: LucideIcon;
  title: string;
  description: string;
}

const REASONS: Reason[] = [
  {
    icon: Award,
    title: 'Built specifically for schools',
    description:
      'Munaxa is purpose-built for K-12 schools and educational groups — not a generic business tool adapted for education.',
  },
  {
    icon: Building2,
    title: 'Enterprise-grade platform',
    description:
      'Designed to support single campuses, multi-campus networks, and large educational groups with consistent, reliable performance.',
  },
  {
    icon: Layers,
    title: 'Scalable by design',
    description:
      'Start with one school and grow to a full network of campuses without changing platforms or re-training your staff.',
  },
  {
    icon: Sparkles,
    title: 'Modern technology',
    description:
      'Built on a modern, cloud-ready foundation that delivers a fast, reliable, and intuitive experience for staff, parents, and students.',
  },
  {
    icon: Globe2,
    title: 'Bilingual by nature',
    description:
      'Full Arabic and English support with native right-to-left layouts, designed for the region from day one.',
  },
  {
    icon: ShieldCheck,
    title: 'Local compliance support',
    description:
      'Built with regional regulatory and reporting requirements in mind, helping your school stay aligned with local standards.',
  },
];

export function WhyMunaxa() {
  return (
    <section id="why-munaxa" className="bg-secondary/30 py-20 sm:py-28">
      <div className="section-shell">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Why school leaders choose Munaxa
            </h2>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Munaxa combines the depth of an enterprise platform with the simplicity schools
              actually need — so your team can adopt it quickly and rely on it for years.
            </p>
            <div className="mt-8 hidden rounded-xl border border-border bg-card p-6 shadow-card lg:block">
              <p className="font-display text-lg font-semibold">A platform that grows with you</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Whether you run a single campus or a group of international schools across multiple
                cities, Munaxa adapts to your structure — without disrupting how your teams already
                work.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {REASONS.map((reason) => (
              <div key={reason.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <reason.icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold">{reason.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{reason.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
