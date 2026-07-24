import * as Icons from '@munaxa/icons';
import type { LucideIcon } from '@munaxa/icons';
import { ArrowRight } from '@munaxa/icons';
import { Header } from '@/components/sections/header';
import { Footer } from '@/components/sections/footer';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { JsonLd } from '@/components/seo/json-ld';
import { buildBreadcrumbs } from '@/lib/seo/breadcrumbs';
import * as schema from '@/lib/seo/jsonld';
import { absoluteUrl } from '@/lib/seo/config';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Theme } from '@/lib/theme/config';
import type { ContentPage } from '@/content/types';
import { t } from '@/content/types';
import { pathFor } from '@/content';
import type { Hub } from '@/content/hubs';

function getIcon(name?: string): LucideIcon {
  const map = Icons as unknown as Record<string, LucideIcon>;
  return (name && map[name]) || (map.Circle as LucideIcon);
}

/** Renders a section hub (index) page: heading + a grid of entry cards + structured data. */
export function CollectionView({
  hub,
  entries,
  locale,
  theme,
  dict,
}: {
  hub: Hub;
  entries: ContentPage[];
  locale: Locale;
  theme: Theme;
  dict: Dictionary;
}) {
  const crumbs = buildBreadcrumbs([{ name: t(hub.name, locale) }]);
  const items = entries.map((e) => ({ name: t(e.name, locale), url: absoluteUrl(pathFor(e)) }));

  const jsonLd = [
    schema.breadcrumbList(crumbs),
    schema.collectionPage({
      name: t(hub.seoTitle, locale),
      description: t(hub.metaDescription, locale),
      url: absoluteUrl(hub.path),
      items,
    }),
  ];

  return (
    <>
      <Header locale={locale} theme={theme} dict={dict} />
      <main>
        <section className="py-16 sm:py-20">
          <div className="section-shell">
            <Breadcrumbs crumbs={crumbs} />
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {t(hub.headline, locale)}
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">{t(hub.intro, locale)}</p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => {
                const Icon = getIcon(entry.icon);
                return (
                  <a
                    key={entry.slug}
                    href={pathFor(entry)}
                    className="group flex h-full flex-col rounded-xl border border-border/60 p-6 transition hover:border-primary/60 hover:bg-secondary/40"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h2 className="flex items-center justify-between font-display text-lg font-semibold">
                      {t(entry.name, locale)}
                      <ArrowRight
                        className="h-4 w-4 text-muted-foreground transition group-hover:text-primary rtl:rotate-180"
                        aria-hidden
                      />
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {t(entry.metaDescription, locale)}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer dict={dict} />
      <JsonLd data={jsonLd} />
    </>
  );
}
