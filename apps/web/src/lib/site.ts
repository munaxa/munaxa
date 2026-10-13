/** Site-wide settings for the corporate site. Page copy lives with each page. */
export const site = {
  name: 'Munaxa',
  legalName: 'Munaxa Corporate',
  /**
   * The canonical origin. Cloudflare redirects the apex (munaxa.com) to www, so every canonical,
   * sitemap entry and emailed link must name www or it points at a redirect.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.munaxa.com',
  /** Inbox that receives every demo and waitlist request. */
  contactEmail: 'info@munaxa.com',
  description:
    'Munaxa builds enterprise software for education and business: school management, human capital management and document management. Each product is sold separately and secured by one platform.',
  /**
   * When true, Munaxa Work is presented as "Launching soon" with waitlist wording (hub chapter,
   * hub stage caption, Work page CTAs, FAQ and form).
   */
  workLaunchingSoon: false,
  /**
   * The company's official profiles (LinkedIn, X, YouTube, …). Search engines use them, through the
   * Organization structured data, to tie the brand's knowledge panel to this site. Add each one
   * once it exists; an empty list is omitted.
   */
  sameAs: [] as string[],
  /** Image shown when the hub is shared and in search previews. 1200×630. */
  ogImage: '/og/munaxa.png',
} as const;

/**
 * Search-console ownership tokens. They are inlined at build time (`NEXT_PUBLIC_*`, because every
 * page is prerendered), so set them in the build environment, not as Worker vars.
 */
export const siteVerification = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
};
