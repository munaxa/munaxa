import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/school', '/work', '/docs'].map((path) => ({
    url: new URL(path, site.url).toString(),
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.9,
  }));
}
