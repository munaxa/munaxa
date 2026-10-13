import type { Metadata } from 'next';
import Link from 'next/link';
import { DemoForm } from '@/components/demo-form';
import { InfoPage } from '@/components/info-page';
import { JsonLd, infoPageJsonLd } from '@/components/json-ld';
import { pageMetadata } from '@/components/root-document';
import { HUB_SOLID } from '@/components/site-header';
import { site } from '@/lib/site';

const title = 'Contact Munaxa';
const description =
  'Contact the Munaxa team about Munaxa School, Munaxa Work or Munaxa Docs, or email info@munaxa.com.';

export const metadata: Metadata = pageMetadata({
  title: `${title}: talk to our team`,
  description,
  path: '/contact',
  image: { src: site.ogImage, width: 1200, height: 630, alt: 'Munaxa: School, Work and Docs' },
});

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Talk to the Munaxa team."
      intro="Tell us which product you are interested in and what you run today, and a product specialist will get back to you."
    >
      <JsonLd
        data={infoPageJsonLd({ type: 'ContactPage', name: title, description, path: '/contact' })}
      />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-9">
        <DemoForm
          page="/contact"
          namePlaceholder="Rania Khalil"
          emailPlaceholder="rania@organization.com"
          organization={{ label: 'Organization', placeholder: 'School, company or institution' }}
          submitLabel="Contact us"
          submitClassName={HUB_SOLID}
          note="A product specialist will get back to you."
          sentTitle="Request received."
          sentBody="A Munaxa {product} specialist will be in touch soon."
        />
      </div>
      <p className="mt-10 text-base leading-relaxed text-neutral-700">
        Prefer email? Write to{' '}
        <a
          href={`mailto:${site.contactEmail}`}
          className="font-semibold text-primary-800 underline"
        >
          {site.contactEmail}
        </a>
        . For how we handle what you send us, see the{' '}
        <Link href="/privacy" className="font-semibold text-primary-800 underline">
          privacy policy
        </Link>
        .
      </p>
    </InfoPage>
  );
}
