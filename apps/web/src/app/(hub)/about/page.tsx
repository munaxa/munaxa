import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/info-page';
import { JsonLd, infoPageJsonLd } from '@/components/json-ld';
import { pageMetadata } from '@/components/root-document';
import { site } from '@/lib/site';

const title = 'About Munaxa';
const description =
  'Munaxa Corporate makes Munaxa School, Munaxa Work and Munaxa Docs: standalone software for school management, HR and payroll, and document control.';

export const metadata: Metadata = pageMetadata({
  title: `${title}: school, HR and document management software`,
  description,
  path: '/about',
  image: { src: site.ogImage, width: 1200, height: 630, alt: 'Munaxa: School, Work and Docs' },
});

const products = [
  {
    href: '/school',
    name: 'Munaxa School',
    what: 'School management system',
    text: 'For K-12 schools and school groups: admissions, timetables, attendance, grading, fees and communication with families, in Arabic and English.',
  },
  {
    href: '/work',
    name: 'Munaxa Work',
    what: 'HR and payroll software',
    text: 'Human capital management on one employee record: hiring, onboarding, attendance, leave, payroll and performance.',
  },
  {
    href: '/docs',
    name: 'Munaxa Docs',
    what: 'Document management system',
    text: 'Document control for organizations that answer to auditors: lifecycles, permanent numbering, approvals, e-signatures and a tamper-proof audit trail.',
  },
];

const security = [
  'Single sign-on and MFA',
  'Roles and policy guards',
  'Hash-chained audit trail',
  'Encryption and key rotation',
  'Session control',
  'Rate limiting and risk scoring',
];

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About Munaxa"
      title="We build the systems schools and businesses run on."
      intro="Munaxa Corporate is a software company based in Jordan. We make three standalone applications, Munaxa School, Munaxa Work and Munaxa Docs, each sold on its own and all built on one enterprise security platform."
    >
      <JsonLd
        data={infoPageJsonLd({ type: 'AboutPage', name: title, description, path: '/about' })}
      />

      <h2 className="font-display text-2xl font-semibold tracking-tight">What we make</h2>
      <ul className="mt-6 flex flex-col border-t border-foreground/10">
        {products.map((p) => (
          <li key={p.href} className="border-b border-foreground/10 py-6">
            <Link
              href={p.href}
              className="font-display text-xl font-semibold text-primary-800 hover:text-primary-900"
            >
              {p.name}
            </Link>
            <span className="ms-3 text-sm font-medium text-muted-foreground">{p.what}</span>
            <p className="mt-2 text-base leading-relaxed text-neutral-700">{p.text}</p>
          </li>
        ))}
      </ul>

      <h2 className="font-display mt-14 text-2xl font-semibold tracking-tight">
        Buy the product you need
      </h2>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">
        Each product has its own license and runs on its own. A school can run Munaxa School without
        Munaxa Work or Munaxa Docs, and a company can run Munaxa Docs without either of the others.
        There is no bundle to buy.
      </p>

      <h2 className="font-display mt-14 text-2xl font-semibold tracking-tight">
        One security platform underneath
      </h2>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">
        School, Work and Docs reuse one tested implementation of sign-in, permissions and auditing,
        so none of them builds its own. That platform includes:
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {security.map((m) => (
          <li key={m} className="border-t border-foreground/10 py-3 text-base font-medium">
            {m}
          </li>
        ))}
      </ul>

      <h2 className="font-display mt-14 text-2xl font-semibold tracking-tight">
        Arabic and English
      </h2>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">
        In Munaxa School every screen works in both languages, with proper right-to-left layout, so
        Arabic-speaking staff and parents get the same product as everyone else.
      </p>

      <h2 className="font-display mt-14 text-2xl font-semibold tracking-tight">Talk to us</h2>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">
        Ask about the product you need on the{' '}
        <Link href="/contact" className="font-semibold text-primary-800 underline">
          contact page
        </Link>
        , or email{' '}
        <a
          href={`mailto:${site.contactEmail}`}
          className="font-semibold text-primary-800 underline"
        >
          {site.contactEmail}
        </a>
        .
      </p>
    </InfoPage>
  );
}
