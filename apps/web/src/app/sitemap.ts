import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

const abs = (path: string) => new URL(path, site.url).toString();

/** Each page with the image that shows it, so the screenshots can surface in image search. */
const pages: { path: string; image?: string }[] = [
  { path: '/', image: site.ogImage },
  { path: '/school', image: '/shots/school-dashboard.png' },
  { path: '/work', image: '/shots/work-dashboard.png' },
  { path: '/docs', image: '/shots/docs-dashboard.png' },
  { path: '/about', image: site.ogImage },
  { path: '/contact', image: site.ogImage },
  { path: '/privacy' },
  { path: '/terms' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(({ path, image }) => ({
    url: abs(path),
    changeFrequency: image ? 'monthly' : 'yearly',
    priority: path === '/' ? 1 : image ? 0.9 : 0.3,
    ...(image && { images: [abs(image)] }),
  }));
}
