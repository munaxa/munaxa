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
import { FAQ_ITEMS } from '@/lib/faq-data';

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

export default async function HomePage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Benefits />
        <WhyMunaxa />
        <Modules />
        <Testimonials />
        <Faq />
        <Contact nonce={nonce} />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
