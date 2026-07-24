/**
 * JSON-LD structured-data builders.
 *
 * Every builder returns a plain, serialisable object (a schema.org node). Render them
 * with the <JsonLd> component, which serialises and injects a nonce'd
 * <script type="application/ld+json">. Builders are pure and tree-shakeable.
 *
 * Supported types: Organization, WebSite (+ SearchAction), SoftwareApplication, FAQPage,
 * HowTo, BreadcrumbList, Article, BlogPosting, Person, LocalBusiness, Review,
 * AggregateRating, Product, VideoObject, ImageObject, CollectionPage, ItemList.
 */
import { SITE_NAME, SITE_URL, ORG, absoluteUrl } from './config';

export type JsonLd = Record<string, unknown>;

const CTX = 'https://schema.org';
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Organization — the publisher behind every page. */
export function organization(): JsonLd {
  return {
    '@context': CTX,
    '@type': 'Organization',
    '@id': ORG_ID,
    name: ORG.name,
    legalName: ORG.legalName,
    url: ORG.url,
    logo: { '@type': 'ImageObject', url: ORG.logo, width: 512, height: 512 },
    image: ORG.logo,
    description: ORG.description,
    email: ORG.email,
    areaServed: ORG.areaServed,
    foundingLocation: ORG.foundingLocation,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: ORG.email,
        contactType: 'sales',
        areaServed: ORG.areaServed,
        availableLanguage: ['English', 'Arabic'],
      },
    ],
    sameAs: ORG.sameAs,
  };
}

/** WebSite node including a Sitelinks SearchAction. */
export function website(): JsonLd {
  return {
    '@context': CTX,
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ['en', 'ar'],
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

interface SoftwareAppInput {
  name?: string;
  description: string;
  url?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  rating?: AggregateRatingInput;
  offers?: { price: string; priceCurrency: string };
  featureList?: string[];
}

/** SoftwareApplication — Munaxa as a product. */
export function softwareApplication(input: SoftwareAppInput): JsonLd {
  return {
    '@context': CTX,
    '@type': 'SoftwareApplication',
    name: input.name ?? SITE_NAME,
    description: input.description,
    url: input.url ?? SITE_URL,
    applicationCategory: input.applicationCategory ?? 'BusinessApplication',
    operatingSystem: input.operatingSystem ?? 'Web, iOS, Android',
    inLanguage: ['en', 'ar'],
    publisher: { '@id': ORG_ID },
    ...(input.featureList ? { featureList: input.featureList } : {}),
    ...(input.offers
      ? {
          offers: {
            '@type': 'Offer',
            price: input.offers.price,
            priceCurrency: input.offers.priceCurrency,
          },
        }
      : {}),
    ...(input.rating ? { aggregateRating: aggregateRating(input.rating) } : {}),
  };
}

interface AggregateRatingInput {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
}

export function aggregateRating(r: AggregateRatingInput): JsonLd {
  return {
    '@type': 'AggregateRating',
    ratingValue: r.ratingValue,
    reviewCount: r.reviewCount,
    bestRating: r.bestRating ?? 5,
  };
}

export function review(input: {
  author: string;
  reviewBody: string;
  ratingValue: number;
  itemName?: string;
}): JsonLd {
  return {
    '@context': CTX,
    '@type': 'Review',
    itemReviewed: { '@type': 'SoftwareApplication', name: input.itemName ?? SITE_NAME },
    author: { '@type': 'Person', name: input.author },
    reviewBody: input.reviewBody,
    reviewRating: { '@type': 'Rating', ratingValue: input.ratingValue, bestRating: 5 },
  };
}

export function product(input: {
  name: string;
  description: string;
  url?: string;
  rating?: AggregateRatingInput;
}): JsonLd {
  return {
    '@context': CTX,
    '@type': 'Product',
    name: input.name,
    description: input.description,
    brand: { '@type': 'Brand', name: SITE_NAME },
    ...(input.url ? { url: input.url } : {}),
    ...(input.rating ? { aggregateRating: aggregateRating(input.rating) } : {}),
  };
}

export function faqPage(items: { question: string; answer: string }[]): JsonLd {
  return {
    '@context': CTX,
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

export function howTo(input: {
  name: string;
  description?: string;
  steps: { name: string; text: string }[];
}): JsonLd {
  return {
    '@context': CTX,
    '@type': 'HowTo',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    step: input.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export interface Crumb {
  name: string;
  url: string;
}

export function breadcrumbList(crumbs: Crumb[]): JsonLd {
  return {
    '@context': CTX,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

interface ArticleInput {
  type?: 'Article' | 'BlogPosting';
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  locale?: string;
}

export function article(input: ArticleInput): JsonLd {
  return {
    '@context': CTX,
    '@type': input.type ?? 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    image: input.image ?? ORG.logo,
    inLanguage: input.locale ?? 'en',
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    dateModified: input.dateModified ?? input.datePublished ?? new Date().toISOString(),
    author: {
      '@type': input.authorName ? 'Person' : 'Organization',
      name: input.authorName ?? SITE_NAME,
    },
    publisher: { '@id': ORG_ID },
  };
}

export function person(input: {
  name: string;
  jobTitle?: string;
  url?: string;
  image?: string;
}): JsonLd {
  return {
    '@context': CTX,
    '@type': 'Person',
    name: input.name,
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.image ? { image: input.image } : {}),
    worksFor: { '@id': ORG_ID },
  };
}

/** LocalBusiness — used on country/city pages to signal geo relevance. */
export function localBusiness(input: {
  name?: string;
  description: string;
  url: string;
  addressCountry: string;
  addressLocality?: string;
  areaServed?: string[];
}): JsonLd {
  return {
    '@context': CTX,
    '@type': 'LocalBusiness',
    name: input.name ?? SITE_NAME,
    description: input.description,
    url: input.url,
    image: ORG.logo,
    email: ORG.email,
    address: {
      '@type': 'PostalAddress',
      addressCountry: input.addressCountry,
      ...(input.addressLocality ? { addressLocality: input.addressLocality } : {}),
    },
    ...(input.areaServed ? { areaServed: input.areaServed } : {}),
    parentOrganization: { '@id': ORG_ID },
  };
}

export function imageObject(input: {
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}): JsonLd {
  return {
    '@context': CTX,
    '@type': 'ImageObject',
    contentUrl: input.url,
    url: input.url,
    ...(input.caption ? { caption: input.caption } : {}),
    ...(input.width ? { width: input.width } : {}),
    ...(input.height ? { height: input.height } : {}),
  };
}

export function videoObject(input: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl?: string;
  embedUrl?: string;
  duration?: string;
}): JsonLd {
  return {
    '@context': CTX,
    '@type': 'VideoObject',
    name: input.name,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
    uploadDate: input.uploadDate,
    ...(input.contentUrl ? { contentUrl: input.contentUrl } : {}),
    ...(input.embedUrl ? { embedUrl: input.embedUrl } : {}),
    ...(input.duration ? { duration: input.duration } : {}),
    publisher: { '@id': ORG_ID },
  };
}

/** CollectionPage + embedded ItemList — for hub/index pages (features, blog, …). */
export function collectionPage(input: {
  name: string;
  description: string;
  url: string;
  items: { name: string; url: string }[];
}): JsonLd {
  return {
    '@context': CTX,
    '@type': 'CollectionPage',
    name: input.name,
    description: input.description,
    url: input.url,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: itemListNode(input.items),
  };
}

export function itemList(items: { name: string; url: string }[]): JsonLd {
  return { '@context': CTX, ...itemListNode(items) };
}

function itemListNode(items: { name: string; url: string }[]): JsonLd {
  return {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

/** Convenience: absolute URL helper re-exported for builders used in page files. */
export { absoluteUrl };
