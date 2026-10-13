import type { Metadata } from 'next';
import { InfoPage, ProseSections, type ProseSection } from '@/components/info-page';
import { JsonLd, infoPageJsonLd } from '@/components/json-ld';
import { pageMetadata } from '@/components/root-document';
import { site } from '@/lib/site';

const title = 'Terms of use';
const description =
  'The terms that apply to using munaxa.com, governed by the laws of the Hashemite Kingdom of Jordan.';
const updated = '13 October 2026';

export const metadata: Metadata = pageMetadata({
  title: `${title} | Munaxa`,
  description,
  path: '/terms',
  image: { src: site.ogImage, width: 1200, height: 630, alt: 'Munaxa: School, Work and Docs' },
});

/*
 * Terms for the website itself, governed by Jordanian law (Civil Law No. 43 of 1976, Electronic
 * Transactions Law No. 15 of 2015, Cybercrime Law No. 17 of 2023). Subscriptions to the products are
 * governed by each customer's own agreement, which section 2 says prevails.
 */
const sections: ProseSection[] = [
  {
    id: 'agreement',
    heading: 'Agreement to these terms',
    body: [
      'These terms govern your use of www.munaxa.com (the "website"), operated by Munaxa Corporate ("Munaxa", "we", "us"). By using the website you agree to them. If you use it on behalf of an organization, you confirm that you are authorized to accept these terms for it. If you do not agree, please do not use the website.',
    ],
  },
  {
    id: 'products',
    heading: 'The website and our products',
    body: [
      'The website describes Munaxa School, Munaxa Work and Munaxa Docs. Its content is general information and an invitation to contact us; it is not an offer capable of acceptance. Features, availability and products marked as launching soon may change.',
      'Use of any Munaxa product is governed by a separate written agreement or order with the customer. If that agreement conflicts with these terms, the agreement prevails.',
    ],
  },
  {
    id: 'acceptable-use',
    heading: 'Using the website',
    body: [
      'You may use the website for lawful purposes only. You must not:',
      [
        'access or attempt to access any part of the website, its servers or our systems without authorization, or probe, scan or test their vulnerability;',
        'interfere with the website’s operation, overload it, or introduce malicious code;',
        'copy or collect the website’s content by automated means at a volume that burdens it, or for building a competing product;',
        'submit false information, impersonate another person or organization, or send unsolicited messages through our forms;',
        'use the website in any way that breaches Jordanian law, including the Cybercrime Law No. 17 of 2023, or the law that applies to you.',
      ],
    ],
  },
  {
    id: 'requests',
    heading: 'Contact and information requests',
    body: [
      'When you contact us or join a waitlist, please give accurate details. Contacting us creates no obligation for either side. We may decline a request at our discretion. Any demonstration, trial, pilot or subscription is subject to its own terms, agreed separately.',
      'How we handle the personal data you send us is explained in our privacy policy.',
    ],
  },
  {
    id: 'intellectual-property',
    heading: 'Intellectual property',
    body: [
      'The website and its content, including text, design, screenshots and graphics, and the names and logos Munaxa, Munaxa School, Munaxa Work and Munaxa Docs, belong to Munaxa or its licensors and are protected by the intellectual property laws of Jordan and international treaties.',
      'You may view the website and print or save pages for your own use in evaluating our products. Any other copying, modification, distribution or use of our names and logos requires our prior written permission. Screenshots show sample data for illustration only.',
    ],
  },
  {
    id: 'feedback',
    heading: 'Feedback',
    body: [
      'If you send us suggestions or feedback, we may use them to improve our products without any obligation to you.',
    ],
  },
  {
    id: 'third-party-links',
    heading: 'Links to other websites',
    body: [
      'The website may link to websites run by others. We do not control them and are not responsible for their content or practices.',
    ],
  },
  {
    id: 'electronic-communications',
    heading: 'Electronic communications',
    body: [
      'By submitting a form or emailing us, you agree to receive our replies electronically. Electronic records and communications exchanged with us have legal effect as provided in the Electronic Transactions Law No. 15 of 2015.',
    ],
  },
  {
    id: 'disclaimer',
    heading: 'Disclaimer',
    body: [
      'We work to keep the website accurate and available, but it is provided as is and as available. To the extent the law allows, we do not guarantee that it is complete, error-free or uninterrupted, or that it is suitable for any particular purpose.',
    ],
  },
  {
    id: 'liability',
    heading: 'Limitation of liability',
    body: [
      'To the extent the law allows, Munaxa is not liable for indirect or consequential loss, or for loss of profit, data or business, arising from your use of the website or your reliance on its content.',
      'Nothing in these terms limits or excludes liability that cannot be limited or excluded under Jordanian law, including liability for harm caused intentionally, by fraud or by gross fault.',
    ],
  },
  {
    id: 'changes',
    heading: 'Changes to the website and these terms',
    body: [
      'We may change, suspend or withdraw the website or any part of it. We may update these terms; the date at the top shows the latest version, and continuing to use the website after a change means you accept the updated terms.',
    ],
  },
  {
    id: 'governing-law',
    heading: 'Governing law and disputes',
    body: [
      'These terms are governed by the laws of the Hashemite Kingdom of Jordan. We will first try to resolve any dispute amicably; if it is not resolved within 30 days of one side notifying the other, the courts of Amman have exclusive jurisdiction.',
    ],
  },
  {
    id: 'general',
    heading: 'General',
    body: [
      'If any part of these terms is found invalid or unenforceable, the rest remains in effect. Our not enforcing a provision is not a waiver of it. These terms are written in English; if we publish a translation and the two differ, the English version applies to the extent the law allows.',
    ],
  },
  {
    id: 'contact',
    heading: 'Contact',
    body: [
      `Questions about these terms: ${site.contactEmail}.`,
      'Munaxa Corporate, Hashemite Kingdom of Jordan.',
    ],
  },
];

export default function TermsPage() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of use" updated={updated}>
      <JsonLd
        data={infoPageJsonLd({ type: 'WebPage', name: title, description, path: '/terms' })}
      />
      <ProseSections sections={sections} />
    </InfoPage>
  );
}
