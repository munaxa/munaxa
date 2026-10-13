import type { Metadata } from 'next';
import { InfoPage, ProseSections, type ProseSection } from '@/components/info-page';
import { JsonLd, infoPageJsonLd } from '@/components/json-ld';
import { pageMetadata } from '@/components/root-document';
import { site } from '@/lib/site';

const title = 'Privacy policy';
const description =
  'How Munaxa Corporate collects, uses and protects personal data on munaxa.com, under the Jordanian Personal Data Protection Law No. 24 of 2023.';
const updated = '13 October 2026';

export const metadata: Metadata = pageMetadata({
  title: `${title} | Munaxa`,
  description,
  path: '/privacy',
  image: { src: site.ogImage, width: 1200, height: 630, alt: 'Munaxa: School, Work and Docs' },
});

/*
 * Written for the Hashemite Kingdom of Jordan, Personal Data Protection Law No. 24 of 2023 (PDPL),
 * and to describe what this website actually does: it sets no cookies, runs no analytics, and the
 * only personal data it receives is the demo / waitlist form, emailed to the team through Resend.
 * Keep it in step with the code: a new form field, tracker or provider means a change here.
 */
const sections: ProseSection[] = [
  {
    id: 'who-we-are',
    heading: 'Who we are',
    body: [
      `Munaxa Corporate ("Munaxa", "we", "us") operates www.munaxa.com and decides how the personal data collected through it is used, which makes us the controller of that data. You can reach us about anything in this policy at ${site.contactEmail}.`,
      'This policy is written to meet the Personal Data Protection Law No. 24 of 2023 of the Hashemite Kingdom of Jordan (the "PDPL") and the regulations and instructions issued under it.',
    ],
  },
  {
    id: 'scope',
    heading: 'What this policy covers',
    body: [
      'This policy covers personal data we collect through this website, through demo and waitlist requests, and in sales and support correspondence with prospective customers.',
      'It does not cover data that our customers put into Munaxa School, Munaxa Work or Munaxa Docs, such as student, employee or document records. For that data the customer (the school, employer or organization) is the controller, and Munaxa processes it only on the customer’s instructions under the customer agreement and its data processing terms. If your school or employer uses a Munaxa product, please contact them first about your data; we will support them in answering you.',
    ],
  },
  {
    id: 'what-we-collect',
    heading: 'Personal data we collect',
    body: [
      'When you request a demo or join a waitlist, we collect what you enter in the form:',
      [
        'your name, work email address and phone number;',
        'your organization’s name and the product you are interested in;',
        'any details you add, such as the number of students or employees, and your message;',
        'the page you sent the request from and the time you sent it.',
      ],
      'When you email us or speak with our team, we keep that correspondence.',
      'When you visit the website, our hosting and security provider processes technical data such as your IP address, browser type, the page requested and the time of the request, to deliver the page and protect the site from abuse.',
      'This website does not set cookies and does not use analytics, advertising or tracking tools. If that changes, we will update this policy first and ask for your consent where the law requires it.',
    ],
  },
  {
    id: 'how-we-use-it',
    heading: 'How we use it, and on what basis',
    body: [
      [
        'To answer your request and arrange a demo, based on your request and your consent when you submit the form, and as steps you ask us to take before any contract.',
        'To send you an email confirming that we received your request.',
        'To follow up with you about the Munaxa product you asked about. You can tell us to stop at any time.',
        'To keep the website and our systems secure and working, which is necessary for our legitimate operation of the service.',
        'To comply with our legal obligations and respond to lawful requests from competent authorities.',
      ],
      'We do not sell personal data, we do not use it for advertising profiles, and we do not make decisions about you by automated means alone.',
    ],
  },
  {
    id: 'sharing',
    heading: 'Who we share it with',
    body: [
      'We share personal data only with service providers that process it on our behalf and under our instructions, and only as far as they need to:',
      [
        'Cloudflare, Inc., which hosts and delivers this website and protects it from attacks;',
        'Resend, which delivers the emails sent from the website, including your request to our team and your confirmation;',
        'our business email provider, which hosts the inbox your request and correspondence arrive in.',
      ],
      'We may also disclose personal data where the law requires it, or to a competent judicial or official authority acting within its powers. If Munaxa is reorganized, merged or sold, personal data may pass to the successor under the same protections, and we will tell you if that happens.',
    ],
  },
  {
    id: 'transfers',
    heading: 'Transfers outside Jordan',
    body: [
      'Our service providers operate infrastructure in several countries, so your personal data may be processed outside the Hashemite Kingdom of Jordan. We transfer personal data abroad only as the PDPL allows: to a destination with an adequate level of protection, under contractual safeguards that bind the recipient to protect it, or with your consent.',
    ],
  },
  {
    id: 'retention',
    heading: 'How long we keep it',
    body: [
      'We keep demo and waitlist requests and related correspondence for up to 24 months after our last contact with you, then delete them. If your organization becomes a customer, we keep the contact details needed to manage the relationship for as long as the contract requires. We keep data longer only where the law requires it. Our hosting provider keeps technical request logs for short periods for security.',
    ],
  },
  {
    id: 'security',
    heading: 'How we protect it',
    body: [
      'The website is served only over encrypted connections (HTTPS with HSTS). Access to requests and correspondence is limited to the people who need it to respond to you, and we choose providers that commit to protecting the data they process for us.',
      'If a breach affects your personal data, we will notify the competent authority and, where the law requires it, you, within the time limits the PDPL sets.',
    ],
  },
  {
    id: 'your-rights',
    heading: 'Your rights',
    body: [
      'Under the PDPL you have the right to:',
      [
        'know whether we process your personal data, and get access to it and a copy of it;',
        'have inaccurate or incomplete data corrected or updated;',
        'have your data deleted, or its processing restricted, where the law allows;',
        'object to processing, including follow-up messages about our products;',
        'withdraw your consent at any time, without affecting processing that took place before you withdrew it.',
      ],
      `To use any of these rights, email ${site.contactEmail}. We may ask you to confirm your identity first, and we will respond without undue delay and within the period the law sets. Exercising your rights is free of charge.`,
      'If you believe we have not handled your personal data lawfully, you can complain to the competent authority under the PDPL (the Personal Data Protection Council and its unit at the Ministry of Digital Economy and Entrepreneurship). We would appreciate the chance to resolve it with you first.',
    ],
  },
  {
    id: 'children',
    heading: 'Children',
    body: [
      'This website is for schools, companies and other organizations, and is not directed at children. We do not knowingly collect children’s personal data through it. Student data in Munaxa School is processed for the school that uses it, under that school’s agreement with us, as described in section 2.',
    ],
  },
  {
    id: 'changes',
    heading: 'Changes to this policy',
    body: [
      'We will update this policy when what we do with personal data changes. The date at the top shows the latest version. If a change is significant, we will say so on this page before it takes effect.',
    ],
  },
  {
    id: 'contact',
    heading: 'Contact',
    body: [
      `Questions about this policy or your personal data: ${site.contactEmail}.`,
      'Munaxa Corporate, Hashemite Kingdom of Jordan.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Privacy policy"
      updated={updated}
      intro="This policy explains what personal data Munaxa collects through this website, why, who we share it with, and the rights you have over it."
    >
      <JsonLd
        data={infoPageJsonLd({ type: 'WebPage', name: title, description, path: '/privacy' })}
      />
      <ProseSections sections={sections} />
    </InfoPage>
  );
}
