import { Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Dictionary } from '@/lib/i18n/types';

export function Testimonials({ dict }: { dict: Dictionary }) {
  return (
    <section id="testimonials" className="bg-secondary/30 py-20 sm:py-28">
      <div className="section-shell">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {dict.testimonials.heading}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{dict.testimonials.description}</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {dict.testimonials.items.map((testimonial) => (
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
