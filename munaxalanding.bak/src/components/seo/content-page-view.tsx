import Link from 'next/link';
import * as Icons from '@munaxa/icons';
import type { LucideIcon } from '@munaxa/icons';
import { ArrowRight } from '@munaxa/icons';
import { Header } from '@/components/sections/header';
import { Footer } from '@/components/sections/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { DEMO_URL } from '@/lib/constants';
import { buildBreadcrumbs } from '@/lib/seo/breadcrumbs';
import * as schema from '@/lib/seo/jsonld';
import type { JsonLd as JsonLdData } from '@/lib/seo/jsonld';
import { absoluteUrl } from '@/lib/seo/config';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Theme } from '@/lib/theme/config';
import type { ContentPage } from '@/content/types';
import { t } from '@/content/types';
import { pathFor, resolveRelated, findBySlug, COUNTRY_ISO } from '@/content';

/** Resolve a Lucide icon by name, falling back to a neutral dot if unknown. */
function getIcon(name?: string): LucideIcon {
  const map = Icons as unknown as Record<string, LucideIcon>;
  return (name && map[name]) || (map.Circle as LucideIcon);
}

/** Localized labels for the section hubs used in breadcrumbs. */
const HUB_LABEL: Record<string, Record<Locale, string>> = {
  '/features': { en: 'Features', ar: 'الميزات' },
  '/solutions': { en: 'Solutions', ar: 'الحلول' },
  '/integrations': { en: 'Integrations', ar: 'التكاملات' },
  '/compare': { en: 'Compare', ar: 'المقارنات' },
  '/blog': { en: 'Knowledge Center', ar: 'مركز المعرفة' },
};

const SECTION_OF: Partial<Record<ContentPage['kind'], string>> = {
  feature: '/features',
  solution: '/solutions',
  integration: '/integrations',
  comparison: '/compare',
  article: '/blog',
};

const RELATED_HEADING: Record<Locale, string> = { en: 'Related', ar: 'ذات صلة' };
const FAQ_HEADING: Record<Locale, string> = {
  en: 'Frequently asked questions',
  ar: 'الأسئلة الشائعة',
};

function trailFor(page: ContentPage, locale: Locale) {
  const name = t(page.name, locale);
  if (page.kind === 'country') return [{ name }];
  if (page.kind === 'city') {
    const parent = page.parent ? findBySlug('country', page.parent) : undefined;
    const segs = [];
    if (parent) segs.push({ name: t(parent.name, locale), path: `/${parent.slug}` });
    segs.push({ name });
    return segs;
  }
  const section = SECTION_OF[page.kind];
  const segs = [];
  if (section) segs.push({ name: HUB_LABEL[section]![locale], path: section });
  segs.push({ name });
  return segs;
}

function pageJsonLd(page: ContentPage, locale: Locale, url: string): JsonLdData[] {
  const nodes: JsonLdData[] = [];
  const description = t(page.metaDescription, locale);
  const name = t(page.seoTitle, locale);

  if (page.kind === 'article') {
    nodes.push(
      schema.article({
        type: 'BlogPosting',
        headline: t(page.headline, locale),
        description,
        url,
        locale,
        ...(page.datePublished ? { datePublished: page.datePublished } : {}),
        ...(page.dateModified ? { dateModified: page.dateModified } : {}),
      }),
    );
  } else if (page.kind === 'country' || page.kind === 'city') {
    const iso = COUNTRY_ISO[page.kind === 'city' ? (page.parent ?? '') : page.slug] ?? 'JO';
    nodes.push(
      schema.localBusiness({
        description,
        url,
        addressCountry: iso,
        ...(page.kind === 'city' ? { addressLocality: t(page.name, locale) } : {}),
      }),
      schema.softwareApplication({ description }),
    );
  } else {
    nodes.push(schema.softwareApplication({ name, description }));
  }

  if (page.faqs?.length) {
    nodes.push(
      schema.faqPage(
        page.faqs.map((f) => ({ question: t(f.question, locale), answer: t(f.answer, locale) })),
      ),
    );
  }
  return nodes;
}

export function ContentPageView({
  page,
  locale,
  theme,
  dict,
}: {
  page: ContentPage;
  locale: Locale;
  theme: Theme;
  dict: Dictionary;
}) {
  const path = pathFor(page);
  const url = absoluteUrl(path);
  const crumbs = buildBreadcrumbs(trailFor(page, locale));
  const related = resolveRelated(page.related, locale);
  const ctaLabel = page.ctaLabel ? t(page.ctaLabel, locale) : dict.nav.requestDemo;

  const jsonLd: JsonLdData[] = [schema.breadcrumbList(crumbs), ...pageJsonLd(page, locale, url)];

  return (
    <>
      <Header locale={locale} theme={theme} dict={dict} />
      <main>
        {/* Hero */}
        <section className="py-16 sm:py-20">
          <div className="section-shell">
            <Breadcrumbs crumbs={crumbs} />
            <div className="max-w-3xl">
              <p className="font-display text-sm font-semibold uppercase tracking-wide text-primary">
                {t(page.eyebrow, locale)}
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {t(page.headline, locale)}
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">{t(page.intro, locale)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={DEMO_URL} className={buttonVariants('default', 'md')}>
                  {ctaLabel}
                </a>
                <Link href="/#contact" className={buttonVariants('outline', 'md')}>
                  {dict.contact.heading}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Highlights */}
        {page.highlights.length > 0 && (
          <section className="pb-16 sm:pb-20">
            <div className="section-shell">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {page.highlights.map((h) => {
                  const Icon = getIcon(h.icon);
                  return (
                    <Card key={t(h.title, locale)} className="h-full">
                      <CardHeader>
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
                          <Icon className="h-5 w-5" aria-hidden />
                        </div>
                        <CardTitle>{t(h.title, locale)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{t(h.body, locale)}</CardDescription>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Prose sections */}
        {page.sections?.length ? (
          <section className="pb-16 sm:pb-20">
            <div className="section-shell">
              <div className="mx-auto max-w-3xl space-y-12">
                {page.sections.map((s) => (
                  <div key={t(s.heading, locale)}>
                    <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                      {t(s.heading, locale)}
                    </h2>
                    <div className="mt-4 space-y-4 text-muted-foreground">
                      {t(s.paragraphs, locale).map((p, i) => (
                        <p key={i} className="leading-relaxed">
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* FAQ */}
        {page.faqs?.length ? (
          <section className="pb-16 sm:pb-20">
            <div className="section-shell">
              <div className="mx-auto max-w-3xl">
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {FAQ_HEADING[locale]}
                </h2>
                <dl className="mt-8 divide-y divide-border/60">
                  {page.faqs.map((f) => (
                    <div key={t(f.question, locale)} className="py-5">
                      <dt className="font-display text-lg font-semibold">
                        {t(f.question, locale)}
                      </dt>
                      <dd className="mt-2 text-muted-foreground">{t(f.answer, locale)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        ) : null}

        {/* Internal linking — related entities */}
        {related.length > 0 && (
          <section className="border-t border-border/60 py-16 sm:py-20">
            <div className="section-shell">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {RELATED_HEADING[locale]}
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((link) => (
                  <a
                    key={link.path}
                    href={link.path}
                    className="group flex flex-col rounded-xl border border-border/60 p-5 transition hover:border-primary/60 hover:bg-secondary/40"
                  >
                    <span className="flex items-center justify-between font-display font-semibold">
                      {link.name}
                      <ArrowRight
                        className="h-4 w-4 text-muted-foreground transition group-hover:text-primary rtl:rotate-180"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {link.description}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer dict={dict} />
      <JsonLd data={jsonLd} />
    </>
  );
}
