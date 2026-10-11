import type { Metadata } from 'next';
import { BilingualBand } from '@/components/bilingual-band';
import { DemoForm } from '@/components/demo-form';
import { Faq } from '@/components/faq';
import { JsonLd, productJsonLd } from '@/components/json-ld';
import { FeesMock, GradebookMock, ParentAppMock, TimetableMock } from '@/components/mocks/school';
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
  'Munaxa School is a school management system for K-12 schools and school groups, with timetabling, attendance, grading, fees and family apps in Arabic and English.';

export const metadata: Metadata = {
  title: 'Munaxa School: School management system for K-12',
  description,
  alternates: { canonical: '/school' },
  openGraph: {
    title: 'Munaxa School',
    description,
    url: '/school',
    images: ['/shots/school-dashboard.png'],
  },
};

const capabilities = [
  {
    t: 'Admissions',
    d: 'Applications, assessments and offers in a pipeline that becomes enrollment.',
  },
  {
    t: 'Student and staff records',
    d: 'One profile per person, with history that follows them year to year.',
  },
  {
    t: 'Roles and permissions',
    d: 'Teachers, coordinators, finance and admins each see only what they need.',
  },
  { t: 'Announcements', d: 'School-wide, grade or section messages to families and staff.' },
  { t: 'Reporting', d: 'Attendance, academic and finance reports, ready to export.' },
  { t: 'Privacy mode', d: 'Hide fees and balances with one click when screens are shared.' },
  { t: 'School groups', d: 'Run several schools as separate tenants under one group.' },
  {
    t: 'Classroom and Teams links',
    d: 'Deep links into Google Classroom and Microsoft Teams for lessons.',
  },
];

const faqs = [
  {
    q: 'Is Munaxa School a learning management system?',
    a: 'No. Munaxa School runs the school: people, timetables, attendance, grades, fees and communication. For lesson delivery it links directly into Google Classroom or Microsoft Teams, so teachers keep the tools they already use.',
  },
  {
    q: 'Does it work fully in Arabic?',
    a: 'Yes. Every screen is available in Arabic and English with proper right-to-left layout. Each user can choose their language.',
  },
  {
    q: 'Do I need other Munaxa products?',
    a: 'No. Munaxa School is sold and deployed on its own. It does not depend on Munaxa Work or Munaxa Docs.',
  },
  {
    q: 'Are there mobile apps?',
    a: 'Yes. There are separate app experiences for parents, students and teachers, alongside the web parent portal.',
  },
];

export default function SchoolPage() {
  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: 'Munaxa School',
          category: 'School management',
          description,
          path: '/school',
        })}
      />
      <SiteHeader
        product="school"
        links={[
          { label: 'Features', href: anchor('features') },
          { label: 'Arabic', href: '#arabic' },
          { label: 'FAQ', href: '#faq' },
        ]}
        cta={{ label: 'Book a demo', href: '#demo' }}
      />
      <main>
        <ProductHero
          product="school"
          title="Run your whole school from one system."
          sub="Admissions, timetables, attendance, grading, fees and communication with families, in Arabic and English. Built for K-12 schools and school groups."
          primaryCta="Book a demo"
          bullets={[
            'Arabic and English, full RTL',
            'Parent, student and teacher apps',
            'Works with Google Classroom and Teams',
          ]}
          shot={{
            src: '/shots/school-dashboard.png',
            alt: 'Munaxa School admin dashboard',
            url: 'app.munaxa.school',
          }}
        />
        <Facts
          items={[
            {
              value: '6',
              text: 'Core areas in one system: people, timetable, attendance, academics, finance and communication.',
            },
            { value: '3', text: 'Mobile app experiences, for parents, students and teachers.' },
            {
              value: '2',
              text: 'Languages on every screen, Arabic and English, with right-to-left layout.',
            },
          ]}
        />
        <FeaturesIntro product="school" title="Less time on admin. More time on teaching." />
        <Feature
          product="school"
          index="01"
          label="Timetable"
          title="A full week's timetable, without the clashes."
          body="The timetable engine places every lesson against teacher availability, rooms and class loads. When something changes, it finds the conflict and proposes a fix."
          checks={[
            'Teacher, room and class conflicts detected automatically',
            'Publish once, and teachers and families see it instantly',
          ]}
          visual={<TimetableMock />}
        />
        <Feature
          product="school"
          index="02"
          label="Attendance and academics"
          title="From the morning register to the report card."
          body="Teachers take attendance in seconds and enter grades in one gradebook. Report cards build themselves from the same record, so there's nothing to copy across at the end of term."
          checks={[
            'Live attendance with late, excused and absent tracking',
            'Grading and report cards on one academic record',
          ]}
          visual={<GradebookMock />}
          visualFirst
        />
        <Feature
          product="school"
          index="03"
          label="Fees and finance"
          title="Know what's billed, paid and overdue, today."
          body="Fee plans, invoices, payments and balances sit in the same system as enrollment. When a student joins, billing starts. When a parent pays, the balance updates for everyone."
          checks={[
            'Fee plans, discounts and installments',
            'Privacy mode hides amounts on shared screens',
          ]}
          visual={<FeesMock />}
        />
        <Feature
          product="school"
          index="04"
          label="Families"
          title="Parents see what they need, as it happens."
          body="The parent portal and mobile apps show attendance, grades, messages and fees in real time. Students and teachers get their own apps, built from the same record."
          checks={[
            'Separate apps for parents, students and teachers',
            'Announcements and direct messages, without WhatsApp groups',
          ]}
          visual={<ParentAppMock />}
          visualFirst
          last
        />
        <BilingualBand
          id="arabic"
          text="Every screen works in both languages. Layout, numbers and navigation mirror properly, so Arabic-speaking staff and parents get the same product as everyone else."
        />
        <Capabilities productName="Munaxa School" items={capabilities} shaded={false} />
        <SecurityStrip
          flushTop
          title="Student records deserve enterprise-grade protection."
          text="Single sign-on with MFA, role-based access, a hash-chained audit trail, encryption with key rotation and session control. All of it comes standard."
        />
        <Faq title="Questions schools ask us." items={faqs} />
        <DemoBand
          product="school"
          title="See Munaxa School with your school's data."
          sub="A 30-minute walkthrough set up around your grades, sections and fee structure."
        >
          <DemoForm
            product="school"
            page="/school"
            namePlaceholder="Rania Khalil"
            emailPlaceholder="rania@school.edu.jo"
            organization={{ label: 'School', placeholder: 'School name' }}
            detail={{ label: 'Students', placeholder: 'e.g. 1,200' }}
            submitLabel="Request a demo"
            submitClassName={productTone.school.solid}
            note="A Munaxa School specialist will contact you to schedule."
            sentTitle="Request received."
            sentBody="A Munaxa School specialist will be in touch to schedule your demo."
          />
        </DemoBand>
      </main>
      <SiteFooter
        blurb={description}
        company={[
          { label: 'About Munaxa', href: '/' },
          { label: 'Security', href: '/#security' },
          { label: 'Contact sales', href: '#demo' },
        ]}
      />
    </>
  );
}
