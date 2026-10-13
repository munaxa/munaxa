import type { Metadata } from 'next';
import { DemoForm } from '@/components/demo-form';
import { Faq } from '@/components/faq';
import { pageMetadata } from '@/components/root-document';
import { JsonLd, productJsonLd } from '@/components/json-ld';
import { AuditMock, LifecycleMock, SearchMock, WorkflowMock } from '@/components/mocks/docs';
import {
  Capabilities,
  DemoBand,
  Facts,
  Feature,
  FeaturesIntro,
  ProductHero,
  SecurityStrip,
} from '@/components/product-sections';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { anchor } from '@/lib/anchor';
import { productTone } from '@/lib/products';

const description =
  'Munaxa Docs is an enterprise document management system with controlled lifecycles, approval workflows, electronic signatures, OCR search and a tamper-proof audit trail.';

export const metadata: Metadata = pageMetadata({
  title: 'Munaxa Docs: Document control and management system',
  description,
  path: '/docs',
  image: {
    src: '/shots/docs-dashboard.png',
    width: 1600,
    height: 1000,
    alt: 'Munaxa Docs home dashboard',
  },
});

const capabilities = [
  {
    t: 'Controlled templates',
    d: 'New documents start from approved templates, so formats stay consistent.',
  },
  {
    t: 'Read and acknowledge',
    d: 'Assign required reading and track who has confirmed each revision.',
  },
  {
    t: 'Retention and legal hold',
    d: 'Retention policies per document type, with legal hold that overrides them.',
  },
  {
    t: 'Delegation',
    d: 'Hand your approvals to a deputy for a set period, with full traceability.',
  },
  {
    t: 'Bulk operations',
    d: 'Approve, reassign or update metadata across many documents at once.',
  },
  {
    t: 'Dashboards and reports',
    d: 'Overdue approvals, review cycles and document status across departments.',
  },
  { t: 'API and webhooks', d: 'Connect other systems through API access and event webhooks.' },
  {
    t: 'Federated sign-in and SIEM',
    d: 'Sign in with your identity provider and stream events to your SIEM.',
  },
];

const faqs = [
  {
    q: 'How is this different from SharePoint or Google Drive?',
    a: 'File shares store files. Munaxa Docs controls records: every document has an identity, a permanent number, a lifecycle state, an owner and an unalterable history, with workflows and signatures built in.',
  },
  {
    q: 'Will it satisfy our auditors?',
    a: 'It is designed for audit. Signatures re-verify identity and record their meaning, the audit trail is hash-chained so it cannot be quietly changed, and retention and legal hold are built in.',
  },
  {
    q: 'Can it connect to our other systems?',
    a: 'Yes. Munaxa Docs includes API access, webhooks, federated sign-in through your identity provider and a SIEM event stream.',
  },
  {
    q: 'Is it sold separately from other Munaxa products?',
    a: 'Yes. Munaxa Docs has its own license and runs on its own. It does not depend on Munaxa School or Munaxa Work.',
  },
];

export default function DocsPage() {
  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: 'Munaxa Docs',
          category: 'Document management',
          description,
          path: '/docs',
          image: '/shots/docs-dashboard.png',
          faqs: faqs,
        })}
      />
      <SiteHeader
        product="docs"
        links={[
          { label: 'Features', href: anchor('features') },
          { label: 'Compliance', href: '#compliance' },
          { label: 'FAQ', href: '#faq' },
        ]}
        cta={{ label: 'Book a demo', href: '#demo' }}
      />
      <main>
        <ProductHero
          product="docs"
          kicker="Document management system"
          title="Every document a controlled record."
          sub="Lifecycle, permanent numbering, approvals, e-signatures and a tamper-proof audit trail. Document control for organizations that answer to auditors."
          primaryCta="Book a demo"
          bullets={[
            'Part 11-style witnessed signatures',
            'Hash-chained audit trail',
            'OCR full-text search',
          ]}
          shot={{
            src: '/shots/docs-dashboard.png',
            alt: 'Munaxa Docs home dashboard',
            url: 'docs.munaxa.com',
          }}
        />
        <Facts
          items={[
            {
              value: '1',
              text: 'Revision in force at any time. Readers never see a draft by mistake.',
            },
            {
              value: '6',
              text: 'Lifecycle states, from draft through review, approval and publication to retirement.',
            },
            {
              value: '0',
              text: 'Ways to quietly edit the history. Every entry is chained to the one before.',
            },
          ]}
        />
        <FeaturesIntro
          product="docs"
          title="A file share stores files. Munaxa Docs controls them."
        />
        <Feature
          product="docs"
          index="01"
          label="Lifecycle and revisions"
          title="Always the right version, with no guessing."
          body="Each document moves through a controlled lifecycle and gets a permanent number on approval. While a new revision is being reviewed, everyone else keeps reading the one in force."
          checks={[
            'Permanent numbering: QM-0001 stays QM-0001',
            'Check-out locks and controlled templates',
          ]}
          visual={<LifecycleMock />}
        />
        <Feature
          product="docs"
          index="02"
          label="Approval workflows"
          title="Approvals that keep moving, even when people are away."
          body="Multi-step workflows route each document to the right people in the right order. Steps have deadlines, overdue steps escalate, and delegation covers leave and travel."
          checks={[
            'Deadlines, escalation and delegation on every step',
            'Approve in bulk, or return with comments',
          ]}
          visual={<WorkflowMock />}
          visualFirst
        />
        <Feature
          product="docs"
          index="03"
          label="Search"
          title="Find any document by what's written inside it."
          body="Full-text search covers every document, including scanned paper through OCR. Filter by type, department, status or number, and preview without downloading."
          checks={['OCR makes scans searchable', 'Results only include what each user may see']}
          visual={<SearchMock />}
        />
        <Feature
          product="docs"
          id="compliance"
          index="04"
          label="Signatures and audit"
          title="Give auditors evidence they can check."
          body="Electronic signatures re-verify identity and record what each signature means. Every action is written to a hash-chained audit trail, so an auditor's question becomes a quick lookup."
          checks={['Part 11-style witnessed attestation', 'Retention policies and legal hold']}
          visual={<AuditMock />}
          visualFirst
          last
        />
        <Capabilities productName="Munaxa Docs" items={capabilities} shaded />
        <SecurityStrip
          title="Controlled documents deserve enterprise-grade protection."
          text="Single sign-on with MFA, role-based access, encryption with key rotation, session control and a SIEM event stream. All of it comes standard."
        />
        <Faq title="Questions quality teams ask us." items={faqs} />
        <DemoBand
          product="docs"
          title="Bring us your hardest document process."
          sub="We'll show it running as a controlled workflow, with your numbering scheme and your approval chain."
        >
          <DemoForm
            product="docs"
            page="/docs"
            namePlaceholder="Rami Salameh"
            emailPlaceholder="rami@company.com"
            organization={{ label: 'Organization', placeholder: 'Company name' }}
            detail={{ label: 'Industry', placeholder: 'e.g. Pharma' }}
            submitLabel="Request a demo"
            submitClassName={productTone.docs.solid}
            note="A Munaxa Docs specialist will contact you to schedule."
            sentTitle="Request received."
            sentBody="A Munaxa Docs specialist will be in touch to schedule your demo."
          />
        </DemoBand>
      </main>
      <SiteFooter
        blurb={description}
        company={[
          { label: 'About Munaxa', href: '/about' },
          { label: 'Security', href: '/#security' },
          { label: 'Contact sales', href: '#demo' },
        ]}
      />
    </>
  );
}
