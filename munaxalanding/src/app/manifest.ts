import type { MetadataRoute } from 'next';
import { SITE_NAME } from '@/lib/constants';
import { THEME_COLOR_LIGHT } from '@/lib/seo/config';
import { ORG } from '@/lib/seo/config';

/** Web app manifest — improves installability and provides applicationName/theme metadata. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — School Operating System`,
    short_name: SITE_NAME,
    description: ORG.description,
    start_url: '/',
    display: 'standalone',
    // Raw hex consumed by the manifest JSON (not a Tailwind class), so the token rule
    // does not apply here.
    // eslint-disable-next-line no-restricted-syntax
    background_color: '#ffffff',
    theme_color: THEME_COLOR_LIGHT,
    icons: [{ src: '/icon.png', type: 'image/png', sizes: 'any' }],
  };
}
