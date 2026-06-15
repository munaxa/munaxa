import { headers } from 'next/headers';
import { Header } from '@/components/sections/header';
import { Hero } from '@/components/sections/hero';
import { Benefits } from '@/components/sections/benefits';
import { WhyMunaxa } from '@/components/sections/why-munaxa';
import { Modules } from '@/components/sections/modules';
import { Testimonials } from '@/components/sections/testimonials';
import { Faq } from '@/components/sections/faq';
import { Contact } from '@/components/sections/contact';
import { Footer } from '@/components/sections/footer';
import { getLocale } from '@/lib/i18n/get-locale';
import { getDictionary } from '@/lib/i18n';
import { getTheme } from '@/lib/theme/get-theme';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export default async function HomePage() {
  const [nonce, locale, theme] = await Promise.all([
    headers().then((h) => h.get('x-nonce') ?? undefined),
    getLocale(),
    getTheme(),
  ]);
  const dict = getDictionary(locale);

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: dict.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: dict.meta.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: ['en', 'ar'],
  };

  return (
    <>
      <Header locale={locale} theme={theme} dict={dict} />
      <main>
        <Hero dict={dict} />
        <Benefits dict={dict} />
        <WhyMunaxa dict={dict} />
        <Modules dict={dict} />
        <Testimonials dict={dict} />
        <Faq dict={dict} />
        <Contact dict={dict} nonce={nonce} />
      </main>
      <Footer dict={dict} />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
    </>
  );
}
