import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { site } from '@/lib/site';

/**
 * The frame for the hub's text pages (About, Contact, Privacy, Terms): the hub header and footer
 * around a single readable column.
 */
export function InfoPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  /** Shown under the title on legal pages, e.g. "13 October 2026". */
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader
        links={[
          { label: 'School', href: '/school' },
          { label: 'Work', href: '/work' },
          { label: 'Docs', href: '/docs' },
          { label: 'Security', href: '/#security' },
        ]}
        cta={{ label: 'Book a demo', href: '/contact' }}
      />
      <main className="mx-auto max-w-3xl px-8 pt-20 pb-28">
        <div className="text-sm font-semibold text-primary-700">{eyebrow}</div>
        <h1 className="font-display mt-4 text-4xl leading-tight font-semibold tracking-tight lg:text-5xl">
          {title}
        </h1>
        {updated && <p className="mt-4 text-sm text-muted-foreground">Last updated: {updated}</p>}
        {intro && <p className="mt-6 text-lg leading-relaxed text-neutral-600">{intro}</p>}
        <div className="mt-12">{children}</div>
      </main>
      <SiteFooter
        blurb={site.description}
        company={[
          { label: 'About Munaxa', href: '/about' },
          { label: 'Security', href: '/#security' },
          { label: 'Contact', href: '/contact' },
        ]}
      />
    </>
  );
}

/** One section of a text page. A string is a paragraph; an array of strings is a bullet list. */
export interface ProseSection {
  id: string;
  heading: string;
  body: (string | string[])[];
}

/** Sections with an anchor each, so a clause can be linked to directly. Legal pages number them. */
export function ProseSections({
  sections,
  numbered = true,
}: {
  sections: ProseSection[];
  numbered?: boolean;
}) {
  return (
    <div className="flex flex-col gap-11">
      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="scroll-mt-24">
          <h2 className="font-display text-2xl leading-snug font-semibold tracking-tight">
            {numbered && `${i + 1}. `}
            {s.heading}
          </h2>
          <div className="mt-4 flex flex-col gap-4 text-base leading-relaxed text-neutral-700">
            {s.body.map((b, j) =>
              typeof b === 'string' ? (
                <p key={j}>{b}</p>
              ) : (
                <ul key={j} className="flex list-disc flex-col gap-2 ps-6 marker:text-primary-500">
                  {b.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
