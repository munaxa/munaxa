import type { Metadata } from 'next';
import { LegalShell } from '@/components/sections/legal-shell';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms governing the use of the ${SITE_NAME} marketing website.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of this marketing website (the
        &ldquo;Site&rdquo;), operated by {SITE_NAME}. By using the Site, you agree to these Terms.
        These Terms apply only to the marketing website and do not govern use of the Munaxa school
        platform, which is subject to a separate agreement between Munaxa and the relevant school.
      </p>

      <h2>Use of the Site</h2>
      <p>
        You may use this Site to learn about Munaxa and to contact us. You agree not to misuse the
        Site, including by attempting to disrupt its operation, submitting fraudulent or abusive
        content, or attempting to bypass security controls such as rate limiting or bot-protection
        measures.
      </p>

      <h2>Content</h2>
      <p>
        All content on this Site, including text, graphics, logos, and design, is the property of{' '}
        {SITE_NAME} or its licensors and is protected by applicable intellectual property laws. You
        may not reproduce or distribute this content without prior written consent.
      </p>

      <h2>Inquiries and communications</h2>
      <p>
        By submitting the contact form, you consent to {SITE_NAME} contacting you regarding your
        inquiry, including by email and phone, using the details you provide.
      </p>

      <h2>No warranty</h2>
      <p>
        This Site and its content are provided &ldquo;as is&rdquo; without warranties of any kind,
        to the fullest extent permitted by law.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {SITE_NAME} shall not be liable for any indirect,
        incidental, or consequential damages arising from your use of this Site.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Site after changes are
        posted constitutes acceptance of the revised Terms.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about these Terms can be sent to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
