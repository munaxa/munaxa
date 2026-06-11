import type { Metadata } from 'next';
import { LegalShell } from '@/components/sections/legal-shell';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${SITE_NAME} collects, uses, and protects information submitted through this website.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This Privacy Policy explains how {SITE_NAME} (&ldquo;{SITE_NAME}&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects, uses, and protects information submitted through this marketing
        website. It does not cover data processed within the Munaxa school platform itself, which is
        governed by the agreement between Munaxa and the relevant school.
      </p>

      <h2>Information we collect</h2>
      <p>When you submit the contact form, we collect:</p>
      <ul>
        <li>Your name and the name of your school or organization</li>
        <li>Your email address and phone number</li>
        <li>The message you send us</li>
        <li>
          Technical metadata associated with the submission (IP address, browser user agent, and
          submission time), used for security, spam prevention, and abuse monitoring
        </li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To respond to your inquiry and follow up about Munaxa</li>
        <li>To send you a confirmation email acknowledging receipt of your message</li>
        <li>To protect our website from spam, abuse, and automated submissions</li>
        <li>To maintain internal records of inquiries for our sales and support teams</li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Inquiry records are retained only as long as necessary to respond to your request and for
        legitimate business record-keeping, after which they are deleted or anonymized.
      </p>

      <h2>Data sharing</h2>
      <p>
        We do not sell your information. Submitted data is processed using trusted infrastructure
        providers solely to operate this website and respond to your inquiry (for example, email
        delivery and database hosting providers acting on our behalf).
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of the information you submitted by
        contacting us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Security</h2>
      <p>
        We apply industry-standard technical and organizational measures — including encrypted
        transport (HTTPS), input validation, and access controls — to protect information submitted
        through this site.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about this policy can be sent to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
