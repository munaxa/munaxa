import type { Metadata } from 'next';
import { ArrowRight, Compass, Home } from '@munaxa/icons';
import { Header } from '@/components/sections/header';
import { Footer } from '@/components/sections/footer';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getLocale } from '@/lib/i18n/get-locale';
import { getDictionary } from '@/lib/i18n';
import { getTheme } from '@/lib/theme/get-theme';
import { DEMO_URL } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return {
    title: dict.notFound.badge,
    robots: { index: false, follow: true },
  };
}

export default async function NotFound() {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  const dict = getDictionary(locale);
  const t = dict.notFound;

  return (
    <>
      <Header locale={locale} theme={theme} dict={dict} />
      <main className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden bg-grad-hero">
        <div className="section-shell flex flex-col items-center py-20 text-center sm:py-28">
          <Badge>
            <Compass className="h-3.5 w-3.5 text-accent" aria-hidden />
            {t.badge}
          </Badge>

          {/* Oversized brand numeral — the Munaxa visual anchor for the 404. */}
          <div className="relative mt-8 select-none" role="img" aria-label={t.illustrationAlt}>
            <div
              className="absolute left-1/2 top-1/2 -z-10 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-20 blur-3xl sm:h-72 sm:w-72"
              aria-hidden
            />
            <span className="mono block bg-gradient-to-b from-primary to-aqua bg-clip-text font-display text-[7rem] font-bold leading-none tracking-tighter text-transparent sm:text-[11rem] lg:text-[13rem]">
              {t.code}
            </span>
          </div>

          <h1 className="mt-6 text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t.title}
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">{t.description}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="/" className={buttonVariants('default', 'lg', 'group')}>
              <Home className="h-4 w-4" aria-hidden />
              {t.ctaHome}
            </a>
            <a href={DEMO_URL} className={buttonVariants('outline', 'lg', 'group')}>
              {t.ctaDemo}
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:rotate-180"
                aria-hidden
              />
            </a>
          </div>

          <div className="mt-12 w-full max-w-md">
            <p
              id="not-found-quick-links"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t.quickLinksLabel}
            </p>
            <nav
              className="mt-4 flex flex-wrap items-center justify-center gap-2.5"
              aria-labelledby="not-found-quick-links"
            >
              {t.quickLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-border bg-background/60 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur transition-colors outline-none hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </>
  );
}
