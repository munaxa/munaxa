/** Site-wide settings for the corporate site. Page copy lives with each page. */
export const site = {
  name: 'Munaxa',
  legalName: 'Munaxa Corporate',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://munaxa.com',
  /** Inbox that receives every demo and waitlist request. */
  contactEmail: 'info@munaxa.com',
  description:
    'Munaxa builds enterprise software for education and business: school management, human capital management and document management. Each product is sold separately and secured by one platform.',
  /**
   * When true, Munaxa Work is presented as "Launching soon" with waitlist wording (hub chapter,
   * hub stage caption, Work page CTAs, FAQ and form).
   */
  workLaunchingSoon: false,
} as const;
