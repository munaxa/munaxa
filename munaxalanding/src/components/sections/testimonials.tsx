import { Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  org: string;
}

/**
 * Placeholder testimonials. Replace with real, permissioned customer quotes before launch —
 * each entry should be reviewed and approved by the named school/contact.
 */
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Munaxa gave our leadership team a single, clear view of attendance, finance, and academics across all three campuses. Decisions that used to take days now take minutes.',
    name: 'Lina Haddad',
    role: 'Director General',
    org: 'Al Noor International Schools',
  },
  {
    quote:
      'Parent communication used to be our biggest headache. With Munaxa, announcements, attendance updates, and fee notices reach parents instantly — and our front office workload has dropped noticeably.',
    name: 'Omar Khalil',
    role: 'School Principal',
    org: 'Riverside Academy',
  },
  {
    quote:
      'As an owner overseeing multiple schools, financial transparency was non-negotiable. Munaxa gives me real-time visibility into collections and outstanding balances across every branch.',
    name: 'Sara Mansour',
    role: 'Founder & Owner',
    org: 'Horizon Education Group',
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-secondary/30 py-20 sm:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by schools and education groups
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Hear from school leaders who use Munaxa to run their institutions every day.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.name} className="flex h-full flex-col">
              <CardContent className="flex h-full flex-col pt-6">
                <Quote className="h-7 w-7 text-primary" aria-hidden />
                <p className="mt-4 flex-1 text-pretty text-sm leading-relaxed text-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-6 border-t border-border pt-4">
                  <p className="font-display text-sm font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.org}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
