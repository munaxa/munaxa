'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@munaxa/ui';

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * The questions section on each product page. The first answer starts open.
 *
 * Every answer is force-mounted so it is in the server-rendered HTML for crawlers, and closed ones
 * are hidden with CSS instead of being left out. `AccordionContent` puts `className` on its inner
 * wrapper, so the rule targets the region from the item.
 */
export function Faq({
  title,
  items,
  className = 'pb-28',
}: {
  title: string;
  items: FaqItem[];
  className?: string;
}) {
  return (
    <section id="faq" className={`mx-auto max-w-7xl px-8 ${className}`}>
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
          <AccordionItem
            key={f.q}
            value={`faq-${i}`}
            className="border-foreground/10 [&_[role=region][data-state=closed]]:hidden"
          >
            <AccordionTrigger level={3} className="font-display py-5 text-lg font-semibold">
              {f.q}
            </AccordionTrigger>
            <AccordionContent
              forceMount
              className="max-w-3xl pb-5 text-base leading-relaxed text-neutral-600"
            >
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
