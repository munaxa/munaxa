'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@munaxa/ui';

export interface FaqItem {
  q: string;
  a: string;
}

/** The questions section on each product page. The first answer starts open. */
export function Faq({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <section id="faq" className="mx-auto max-w-7xl px-8 pb-28">
      <h2 className="font-display mb-10 text-3xl leading-tight font-semibold tracking-tight lg:text-4xl">
        {title}
      </h2>
      <Accordion
        type="single"
        collapsible
        defaultValue="faq-0"
        className="border-t border-foreground/10"
      >
        {items.map((f, i) => (
          <AccordionItem key={f.q} value={`faq-${i}`} className="border-foreground/10">
            <AccordionTrigger level={3} className="font-display py-5 text-lg font-semibold">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="max-w-3xl pb-5 text-base leading-relaxed text-neutral-600">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
