import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { allContentPaths, HUBS } from '@/content';
import { reportContentValidation } from '@/lib/seo/validate';

/**
 * Dynamic sitemap generated from the content registry. Every feature, solution, country,
 * city, integration, comparison and article is included automatically — adding content is
 * a data change, never a sitemap edit. Priorities reflect commercial intent.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Build-time SEO validation: surfaces duplicate paths/titles, broken internal links and
  // missing metadata in the build logs without failing the build.
  reportContentValidation();

  const priorityFor = (kind: string): number => {
    switch (kind) {
      case 'country':
        return 0.9;
      case 'feature':
      case 'solution':
        return 0.8;
      case 'city':
      case 'comparison':
        return 0.7;
      case 'integration':
      case 'article':
        return 0.6;
      default:
        return 0.5;
    }
  };

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const hubEntries: MetadataRoute.Sitemap = HUBS.map((h) => ({
    url: `${SITE_URL}${h.path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const contentEntries: MetadataRoute.Sitemap = allContentPaths().map((c) => ({
    url: `${SITE_URL}${c.path}`,
    lastModified: c.lastModified ? new Date(c.lastModified) : now,
    changeFrequency: c.kind === 'article' ? 'monthly' : 'weekly',
    priority: priorityFor(c.kind),
  }));

  return [...staticEntries, ...hubEntries, ...contentEntries];
}
