export interface IconItem {
  title: string;
  description: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface TestimonialEntry {
  quote: string;
  name: string;
  role: string;
  org: string;
}

interface LegalLinkParagraph {
  before: string;
  after: string;
}

export interface Dictionary {
  meta: {
    titleDefault: string;
    titleTemplate: string;
    description: string;
    keywords: string[];
    ogLocale: string;
    alternateOgLocale: string;
  };
  nav: {
    links: { href: string; label: string }[];
    requestDemo: string;
    openMenu: string;
    closeMenu: string;
    primaryNav: string;
    mobileNav: string;
  };
  languageSwitcher: {
    label: string;
    en: string;
    ar: string;
  };
  themeSwitcher: {
    label: string;
    light: string;
    dark: string;
  };
  hero: {
    badge: string;
    titleLine1: string;
    titleHighlight: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust: [string, string, string];
    illustrationAlt: string;
  };
  benefits: {
    heading: string;
    description: string;
    items: IconItem[];
  };
  whyMunaxa: {
    heading: string;
    description: string;
    cardTitle: string;
    cardBody: string;
    reasons: IconItem[];
  };
  modules: {
    heading: string;
    description: string;
    items: IconItem[];
  };
  testimonials: {
    heading: string;
    description: string;
    items: TestimonialEntry[];
  };
  faq: {
    heading: string;
    description: string;
    items: FaqEntry[];
  };
  contact: {
    heading: string;
    description: string;
    responseTime: string;
    servingArea: string;
    form: {
      name: string;
      schoolName: string;
      email: string;
      phone: string;
      message: string;
      submit: string;
      sending: string;
      success: string;
      errorDefault: string;
      networkError: string;
      consentBefore: string;
      privacyLink: string;
      consentAfter: string;
    };
  };
  footer: {
    tagline: string;
    privacy: string;
    terms: string;
    rights: string;
  };
  legal: {
    privacy: {
      title: string;
      description: string;
      intro: string;
      infoCollect: { heading: string; intro: string; items: string[] };
      infoUse: { heading: string; items: string[] };
      retention: { heading: string; body: string };
      sharing: { heading: string; body: string };
      rights: { heading: string } & LegalLinkParagraph;
      security: { heading: string; body: string };
      contact: { heading: string } & LegalLinkParagraph;
    };
    terms: {
      title: string;
      description: string;
      intro: string;
      use: { heading: string; body: string };
      content: { heading: string; before: string; after: string };
      inquiries: { heading: string; before: string; after: string };
      noWarranty: { heading: string; body: string };
      liability: { heading: string; before: string; after: string };
      changes: { heading: string; body: string };
      contact: { heading: string } & LegalLinkParagraph;
    };
  };
}
