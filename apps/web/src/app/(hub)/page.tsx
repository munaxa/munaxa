import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { buttonVariants, cn, themes, type BrandedProductId } from '@munaxa/ui';
import { BilingualBand } from '@/components/bilingual-band';
import { Lockup } from '@/components/brand';
import { DemoForm } from '@/components/demo-form';
import { Faq } from '@/components/faq';
import { JsonLd, hubJsonLd } from '@/components/json-ld';
import { ShieldCheck } from '@/components/mocks/ui';
import { Eyebrow, SoonBadge } from '@/components/product-sections';
import { ProductDot, ProductScope } from '@/components/product-scope';
import { ProductStage, type StageProduct } from '@/components/product-stage';
import { pageMetadata } from '@/components/root-document';
import { SiteFooter } from '@/components/site-footer';
import { HUB_SOLID, SiteHeader } from '@/components/site-header';
import { productCopy } from '@/lib/product-copy';
import { site } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Munaxa: School, HR and document management software',
  description:
    'Munaxa makes standalone software for school management, HR and payroll, and document control: School, Work and Docs, on one enterprise security platform.',
  path: '/',
  image: {
    src: site.ogImage,
    width: 1200,
    height: 630,
    alt: 'Munaxa: School, Work and Docs',
  },
});

const soon = site.workLaunchingSoon;

/** Brand questions, answered from what the rest of the page says. Mirrored into FAQPage data. */
const faqs = [
  {
    q: 'What is Munaxa?',
    a: 'Munaxa is a software company that makes three standalone applications for education and business: Munaxa School, a school management system for K-12 schools; Munaxa Work, a human capital management system for HR and payroll; and Munaxa Docs, a document management system for controlled records.',
  },
  {
    q: 'Do I have to buy all three products?',
    a: 'No. Each Munaxa product is sold and deployed on its own, with no bundle. Munaxa School, Munaxa Work and Munaxa Docs do not depend on each other.',
  },
  {
    q: 'How does Munaxa keep data secure?',
    a: 'Every product runs on the same Munaxa security platform: single sign-on and MFA, roles and policy guards, a hash-chained audit trail, encryption with key rotation, session control, and rate limiting with risk scoring.',
  },
  {
    q: 'Does Munaxa work in Arabic?',
    a: 'Munaxa School works fully in Arabic and English, with proper right-to-left layout on every screen. Each user chooses their language.',
  },
  {
    q: 'How do I see a demo?',
    a: 'Book a 30-minute walkthrough of School, Work or Docs through the form on this page. A product specialist prepares the demo around how your organization already works.',
  },
];

const stage: StageProduct[] = [
  {
    id: 'school',
    name: 'Munaxa School',
    category: 'School management',
    shot: '/shots/school-dashboard.png',
    url: 'school.munaxa.com',
    caption: 'Munaxa School · Admin dashboard with attendance, fees and live activity.',
    href: '/school',
    link: 'Explore School →',
  },
  {
    id: 'work',
    name: 'Munaxa Work',
    category: 'Human capital management',
    shot: '/shots/work-dashboard.png',
    url: 'work.munaxa.com',
    caption: `Munaxa Work · HR dashboard with payroll run, approvals and headcount.${soon ? ' Launching soon.' : ''}`,
    href: '/work',
    link: 'Explore Work →',
  },
  {
    id: 'docs',
    name: 'Munaxa Docs',
    category: 'Document management',
    shot: '/shots/docs-dashboard.png',
    url: 'docs.munaxa.com',
    caption: 'Munaxa Docs · Home with approvals awaiting decision and recent documents.',
    href: '/docs',
    link: 'Explore Docs →',
  },
];

interface Chapter {
  id: BrandedProductId;
  index: string;
  label: string;
  title: string;
  body: string;
  link: string;
  shotAlt: string;
  points: { t: string; d: string }[];
  padding: string;
}

const chapters: Chapter[] = [
  {
    id: 'school',
    index: '01',
    label: 'School management',
    title: 'The whole school day, in one system.',
    body: 'A K-12 school operating system covering administration, people, timetables, attendance, academics, finance and communication with families.',
    link: 'Explore Munaxa School',
    shotAlt: 'Munaxa School admin dashboard',
    points: productCopy.school.points,
    padding: 'py-24',
  },
  {
    id: 'work',
    index: '02',
    label: 'Human capital management',
    title: 'One employee record, from offer to payslip.',
    body: 'Hiring, onboarding, attendance, leave, payroll and performance read and write the same record, so nothing gets typed in twice.',
    link: soon ? 'Join the Work waitlist' : 'Explore Munaxa Work',
    shotAlt: 'Munaxa Work HR dashboard',
    points: productCopy.work.points,
    padding: 'pt-30 pb-24',
  },
  {
    id: 'docs',
    index: '03',
    label: 'Document management',
    title: 'Know which version is in force, and who approved it.',
    body: 'Document control for organizations that answer to auditors. Every document has an identity, a permanent number, a lifecycle, an owner and a full history.',
    link: 'Explore Munaxa Docs',
    shotAlt: 'Munaxa Docs home dashboard',
    points: productCopy.docs.points,
    padding: 'pt-6 pb-30',
  },
];

const securityModules = [
  'Single sign-on and MFA',
  'Roles and policy guards',
  'Hash-chained audit trail',
  'Encryption and key rotation',
  'Session control',
  'Rate limiting and risk scoring',
];

/** Audit log entries; `no` is the entry's sequence number, shown as `#041`. */
const auditLog: {
  no: string;
  product?: BrandedProductId;
  title: string;
  sub: string;
  hash: string;
}[] = [
  {
    no: '041',
    product: 'docs',
    title: 'Signature witnessed',
    sub: 'Docs · TPL-0007 · R. Salameh',
    hash: 'a3f2…9c',
  },
  {
    no: '040',
    product: 'work',
    title: 'Payroll approved',
    sub: 'Work · August run · HR Manager',
    hash: '77be…41',
  },
  {
    no: '039',
    product: 'school',
    title: 'Grades published',
    sub: 'School · Grade 7 · Ms. Haddad',
    hash: '1c9a…7d',
  },
  {
    no: '038',
    title: 'Role changed · Finance viewer',
    sub: 'Platform · approved by School Admin',
    hash: 'f03b…6e',
  },
];

/** The coloured full stops in the hero, one per product. */
function Stop({ product }: { product: BrandedProductId }) {
  return <span style={{ color: themes[product].brand.color.DEFAULT }}>.</span>;
}

export default function HubPage() {
  return (
    <>
      <JsonLd data={hubJsonLd(faqs)} />
      <SiteHeader
        links={[
          { label: 'School', href: '/school' },
          { label: 'Work', href: '/work' },
          { label: 'Docs', href: '/docs' },
          { label: 'Security', href: '#security' },
        ]}
        cta={{ label: 'Book a demo', href: '#demo' }}
      />
      <main>
        <section className="relative">
          <div
            aria-hidden="true"
            className="hero-grid pointer-events-none absolute inset-0 text-foreground/5"
          />
          <div className="relative mx-auto max-w-7xl px-8 pt-22">
            <h1 className="font-display text-5xl leading-none font-bold tracking-tighter sm:text-7xl lg:text-8xl">
              <span className="mb-6 block font-sans text-base font-semibold tracking-normal text-primary-800">
                School, HR and document management software
              </span>
              <span className="block">
                Run the school
                <Stop product="school" />
              </span>
              <span className="block">
                Pay the people
                <Stop product="work" />
              </span>
              <span className="block">
                Control every record
                <Stop product="docs" />
              </span>
            </h1>
            <div className="mt-10 flex flex-wrap items-end justify-between gap-x-12 gap-y-7">
              <p className="max-w-xl text-lg leading-relaxed text-neutral-600 lg:text-xl">
                Munaxa makes three standalone applications: School, Work and Docs. Each one is sold
                on its own and runs on the same enterprise security platform.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#demo"
                  className={buttonVariants(
                    'default',
                    'lg',
                    cn('h-12 rounded-lg px-7 font-semibold', HUB_SOLID),
                  )}
                >
                  Book a demo
                </a>
                <a
                  href="#school"
                  className={buttonVariants('outline', 'lg', 'h-12 rounded-lg px-7 font-semibold')}
                >
                  See the products
                </a>
              </div>
            </div>
          </div>
          <ProductStage products={stage} />
        </section>

        <section aria-label="Key facts" className="mx-auto max-w-7xl px-8 pt-24 pb-6">
          <dl className="grid grid-cols-1 border-t border-foreground/10 md:grid-cols-3">
            {[
              { v: '3', t: 'Standalone products. Buy the one you need, without a bundle.' },
              { v: '12', t: 'Security modules underneath every product, from sign-in to audit.' },
              {
                v: '2',
                t: 'Languages in Munaxa School, Arabic and English, with full right-to-left layout.',
              },
            ].map((f, i) => (
              <div
                key={f.t}
                className={cn(
                  'py-7 md:px-7',
                  i === 0 && 'md:ps-0',
                  i < 2 && 'md:border-e md:border-foreground/10',
                )}
              >
                <dt className="font-display text-6xl leading-none font-semibold tracking-tighter">
                  {f.v}
                </dt>
                <dd className="mt-3 max-w-xs text-base leading-normal text-neutral-600">{f.t}</dd>
              </div>
            ))}
          </dl>
        </section>

        {chapters[0] && <ProductChapter c={chapters[0]} />}
        <BilingualBand
          scoped
          text="In Munaxa School, every screen works in both languages. Layout, numbers and navigation mirror properly, so Arabic-speaking staff and parents get the same product as everyone else."
        />
        {chapters.slice(1).map((c) => (
          <ProductChapter key={c.id} c={c} />
        ))}

        <section id="security" className="bg-neutral-950 text-neutral-100">
          <div className="mx-auto max-w-7xl px-8 py-30">
            <div className="grid grid-cols-1 items-center gap-x-22 gap-y-16 lg:grid-cols-2">
              <div className="flex flex-col gap-5.5">
                <div className="text-sm font-semibold text-primary-300">
                  The Munaxa security platform
                </div>
                <h2 className="font-display text-4xl leading-tight font-semibold tracking-tight lg:text-5xl">
                  Built so your auditors can check our work.
                </h2>
                <p className="max-w-xl text-lg leading-relaxed text-neutral-400">
                  School, Work and Docs all run on the same security core. Each product reuses one
                  tested implementation of sign-in, permissions and auditing, so none of them builds
                  its own.
                </p>
                <ul className="mt-2 grid grid-cols-2 gap-x-7">
                  {securityModules.map((m, i) => (
                    <li
                      key={m}
                      className={cn(
                        'border-t border-background/10 py-4 text-base font-medium',
                        i >= securityModules.length - 2 && 'border-b',
                      )}
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-hidden rounded-2xl border border-background/10 bg-neutral-900 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-background/10 px-5.5 py-4.5">
                  <div>
                    <div className="font-display text-base font-semibold">Audit log</div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      Each entry carries the fingerprint of the one before it
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                    <ShieldCheck />
                    Chain intact
                  </span>
                </div>
                <ol reversed className="px-5.5 pt-2 pb-1">
                  {auditLog.map((e, i) => (
                    <li
                      key={e.no}
                      className={cn(
                        'flex items-center gap-3.5 py-3.5',
                        i < auditLog.length - 1 && 'border-b border-background/5',
                      )}
                    >
                      <span className="w-11 shrink-0 font-mono text-xs text-neutral-500">{`#${e.no}`}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {e.product ? (
                            <ProductDot product={e.product} />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="size-2 rounded-full bg-primary-300"
                            />
                          )}
                          {e.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-neutral-500">{e.sub}</span>
                      </span>
                      <span className="font-mono text-xs text-primary-300">{e.hash}</span>
                    </li>
                  ))}
                </ol>
                <div className="border-t border-background/5 bg-background/5 px-5.5 py-4 text-sm text-neutral-400">
                  If any past entry is altered, every fingerprint after it stops matching, and the
                  change shows up the next time the chain is verified.
                </div>
              </div>
            </div>
          </div>
        </section>

        <Faq title="Questions about Munaxa." items={faqs} className="pt-30" />

        <section id="demo" className="mx-auto max-w-7xl px-8 pt-24 pb-24">
          <div className="grid grid-cols-1 items-start gap-x-22 gap-y-14 lg:grid-cols-2">
            <div className="flex flex-col gap-5.5">
              <h2 className="font-display text-4xl leading-none font-semibold tracking-tighter lg:text-6xl">
                See the product you need, on your data.
              </h2>
              <p className="max-w-md text-lg leading-relaxed text-neutral-600">
                A 30-minute walkthrough of School, Work or Docs, set up around how your organization
                already works.
              </p>
              <ol className="mt-3 border-t border-foreground/10">
                {[
                  'Tell us which product and what you run today.',
                  'A product specialist prepares a demo around your workflows.',
                  'You decide, with no bundle and no obligation.',
                ].map((s, i) => (
                  <li key={s} className="flex gap-4 border-b border-foreground/10 py-4 text-base">
                    <span className="font-display w-5.5 shrink-0 font-semibold text-primary-800">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-9">
              <DemoForm
                page="/"
                namePlaceholder="Rania Khalil"
                emailPlaceholder="rania@organization.com"
                organization={{
                  label: 'Organization',
                  placeholder: 'School, company or institution',
                }}
                submitLabel="Request a demo"
                submitClassName={HUB_SOLID}
                note="A product specialist will contact you to schedule."
                sentTitle="Request received."
                sentBody="A Munaxa {product} specialist will be in touch to schedule your demo."
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter
        blurb={site.description}
        company={[
          { label: 'About Munaxa', href: '/about' },
          { label: 'Security', href: '#security' },
          { label: 'Contact', href: '/contact' },
        ]}
      />
    </>
  );
}

/** One product's chapter on the hub, in that product's colours. */
function ProductChapter({ c }: { c: Chapter }) {
  return (
    <ProductScope
      as="section"
      product={c.id}
      id={c.id}
      className={cn('mx-auto max-w-7xl px-8', c.padding)}
    >
      <div className="grid grid-cols-1 items-start gap-x-18 gap-y-12 lg:grid-cols-3">
        <div className="flex max-w-md flex-col gap-5">
          <Eyebrow product={c.id}>
            {c.index} · {c.label}
            {c.id === 'work' && soon && <SoonBadge>Launching soon</SoonBadge>}
          </Eyebrow>
          <Lockup product={c.id} height={40} className="self-start" />
          <h2 className="font-display text-4xl leading-tight font-semibold tracking-tight lg:text-5xl">
            {c.title}
          </h2>
          <p className="text-base leading-relaxed text-neutral-600">{c.body}</p>
          <Link
            href={`/${c.id}`}
            className="inline-flex items-center gap-2 self-start border-b-2 border-primary-300 pb-1 text-base font-semibold text-primary-800 hover:border-primary-500 hover:text-primary-900"
          >
            {c.link} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="flex min-w-0 flex-col gap-9 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl bg-primary-50 px-4 pt-4 sm:px-9 sm:pt-9">
            <div className="overflow-hidden rounded-t-xl border border-b-0 border-primary-800/15 shadow-card">
              <Image
                src={`/shots/${c.id}-dashboard.png`}
                alt={c.shotAlt}
                width={1600}
                height={1000}
                sizes="(max-width: 1024px) 100vw, 800px"
                className="block h-auto w-full"
              />
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
            {c.points.map((p) => (
              <li key={p.t} className="border-t border-foreground/10 pt-4.5">
                <div className="font-display text-base font-semibold">{p.t}</div>
                <div className="mt-1.5 text-sm leading-relaxed text-neutral-600">{p.d}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ProductScope>
  );
}
