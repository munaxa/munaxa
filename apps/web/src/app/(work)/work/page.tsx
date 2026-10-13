import type { Metadata } from 'next';
import { DemoForm } from '@/components/demo-form';
import { Faq } from '@/components/faq';
import { pageMetadata } from '@/components/root-document';
import { JsonLd, productJsonLd } from '@/components/json-ld';
import { LeaveMock, OnboardingMock, PayrollMock, ReviewMock } from '@/components/mocks/work';
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
import { site } from '@/lib/site';

const description =
  'Munaxa Work is a human capital management system covering hiring, onboarding, attendance, leave, payroll and performance on one employee record.';

export const metadata: Metadata = pageMetadata({
  title: 'Munaxa Work: HR, payroll and human capital management',
  description,
  path: '/work',
  image: {
    src: '/shots/work-dashboard.png',
    width: 1600,
    height: 1000,
    alt: 'Munaxa Work HR dashboard',
  },
});

const capabilities = [
  { t: 'Org structure', d: 'Departments, positions and reporting lines that drive approvals.' },
  { t: 'Employee self-service', d: 'Payslips, leave balances and requests, without emailing HR.' },
  {
    t: 'Documents and contracts',
    d: 'Contracts and letters stored on the employee record, signed electronically.',
  },
  {
    t: 'Shifts and schedules',
    d: 'Rotations and shift patterns that attendance and payroll understand.',
  },
  { t: 'Expense claims', d: 'Claims with receipts, routed for approval and paid through payroll.' },
  { t: 'Training records', d: 'Courses, certifications and renewal dates per employee.' },
  {
    t: 'Reports and exports',
    d: 'Headcount, turnover, leave and payroll reports, ready to export.',
  },
  { t: 'Roles and permissions', d: 'HR, finance and managers each see only what they need.' },
];

const launchFaq = {
  q: 'When is Munaxa Work available?',
  a: 'Munaxa Work is launching soon. Waitlist members get early onboarding and help configuring payroll and leave rules before launch.',
};

const faqs = [
  {
    q: 'Is it sold separately from other Munaxa products?',
    a: 'Yes. Munaxa Work has its own license and runs on its own. It does not depend on Munaxa School or Munaxa Docs.',
  },
  {
    q: 'Can it follow our leave and overtime policies?',
    a: 'Yes. Accruals, carry-over, overtime verification and approval chains are configured, not custom-coded, so the system applies your policy consistently.',
  },
  {
    q: 'Who can see salary information?',
    a: 'Only roles you allow. Access is role-based, every view of pay data is audited, and privacy mode hides figures on shared screens.',
  },
];

// Wording follows `site.workLaunchingSoon`, as the design's "Launching soon" toggle did.
const copy = site.workLaunchingSoon
  ? {
      ctaShort: 'Join the waitlist',
      ctaLong: 'Join the waitlist',
      demoTitle: 'Be first in line when Munaxa Work launches.',
      demoSub:
        'Waitlist members get early onboarding and help setting up payroll and leave rules before launch.',
      formNote: 'We’ll contact you before launch to plan your onboarding.',
      sentTitle: 'You’re on the list.',
      sentBody: 'We’ll be in touch before launch to plan your onboarding.',
      faqs: [launchFaq, ...faqs],
    }
  : {
      ctaShort: 'Contact us',
      ctaLong: 'Contact us',
      demoTitle: 'Talk to us about Munaxa Work.',
      demoSub:
        'Tell us about your departments, policies and payroll cycle, and a Munaxa Work specialist will get back to you.',
      formNote: 'A Munaxa Work specialist will get back to you.',
      sentTitle: 'Request received.',
      sentBody: 'A Munaxa Work specialist will be in touch soon.',
      faqs,
    };

export default function WorkPage() {
  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: 'Munaxa Work',
          category: 'Human capital management',
          description,
          path: '/work',
          image: '/shots/work-dashboard.png',
          faqs: copy.faqs,
        })}
      />
      <SiteHeader
        product="work"
        links={[
          { label: 'Features', href: anchor('features') },
          { label: 'FAQ', href: '#faq' },
        ]}
        cta={{ label: copy.ctaShort, href: '#demo' }}
      />
      <main>
        <ProductHero
          product="work"
          kicker="HR and payroll software"
          {...(site.workLaunchingSoon ? { badge: 'Launching soon' } : {})}
          title="One employee record, from offer to payslip."
          sub="Hiring, onboarding, attendance, leave, payroll and performance in one human capital management system. Nothing is typed in twice, and every number can be traced."
          primaryCta={copy.ctaLong}
          bullets={[
            'Hire-to-retire on one record',
            'Payroll by exception',
            'Privacy mode for salary data',
          ]}
          shot={{
            src: '/shots/work-dashboard.png',
            alt: 'Munaxa Work HR dashboard',
            url: 'work.munaxa.com',
          }}
        />
        <Facts
          items={[
            {
              value: '1',
              text: 'Employee record shared by recruitment, time, pay and performance.',
            },
            {
              value: '4',
              text: 'Connected modules: hiring and onboarding, time and leave, payroll, and performance.',
            },
            { value: '0', text: 'Spreadsheets needed to close the monthly payroll.' },
          ]}
        />
        <FeaturesIntro
          product="work"
          title="HR that runs the month, instead of the month running HR."
        />
        <Feature
          product="work"
          index="01"
          label="Hiring and onboarding"
          title="From signed offer to productive first day."
          body="Openings, candidate pipelines and offer approvals lead straight into an onboarding checklist. Each task has an owner and a due date, and the new hire's record is ready before they arrive."
          checks={[
            'Offer approvals routed by department and budget',
            'Onboarding tasks for HR, IT, finance and the manager',
          ]}
          visual={<OnboardingMock />}
        />
        <Feature
          product="work"
          index="02"
          label="Time and leave"
          title="Your leave policy, applied the same way every time."
          body="Accruals, carry-over, overtime and approval chains are configured once. Managers approve in context, with balances and attendance shown alongside each request."
          checks={[
            'Overtime checked against attendance automatically',
            'Approval chains that follow your org structure',
          ]}
          visual={<LeaveMock />}
          visualFirst
        />
        <Feature
          product="work"
          index="03"
          label="Payroll"
          title="Close payroll in hours, not days."
          body="Attendance, leave and variable pay flow into the run on their own. You review only the exceptions, approve, and payslips go out with an audit record behind every figure."
          checks={[
            'Exceptions surfaced before cutoff',
            'Privacy mode hides salaries on shared screens',
          ]}
          visual={<PayrollMock />}
        />
        <Feature
          product="work"
          index="04"
          label="Performance"
          title="Reviews built on a year of evidence."
          body="Goals and check-ins live on the employee record all year. When the review cycle opens, the evidence is already there, and HR can see progress and calibrate across teams."
          checks={[
            'Goals, check-ins and 1:1 notes in one place',
            'Cycle progress and calibration for HR',
          ]}
          visual={<ReviewMock />}
          visualFirst
          last
        />
        <Capabilities productName="Munaxa Work" items={capabilities} shaded />
        <SecurityStrip
          title="Salary data deserves enterprise-grade protection."
          text="Single sign-on with MFA, role-based access, a hash-chained audit trail, encryption with key rotation and session control. All of it comes standard."
        />
        <Faq title="Questions HR teams ask us." items={copy.faqs} />
        <DemoBand product="work" title={copy.demoTitle} sub={copy.demoSub}>
          <DemoForm
            product="work"
            kind={site.workLaunchingSoon ? 'waitlist' : 'demo'}
            page="/work"
            namePlaceholder="Lina Nasser"
            emailPlaceholder="lina@company.com"
            organization={{ label: 'Company', placeholder: 'Company name' }}
            detail={{ label: 'Employees', placeholder: 'e.g. 350' }}
            submitLabel={copy.ctaLong}
            submitClassName={productTone.work.solid}
            note={copy.formNote}
            sentTitle={copy.sentTitle}
            sentBody={copy.sentBody}
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
