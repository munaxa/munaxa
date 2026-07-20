/**
 * Automated SEO validation for the programmatic content registry.
 *
 * `validateContent()` runs a battery of structural checks that catch the SEO regressions
 * that hurt rankings and crawling: duplicate slugs, duplicate canonical paths, duplicate
 * titles/descriptions (metadata duplication), missing required fields, broken internal
 * links (related refs pointing at non-existent entries), and out-of-range title/description
 * lengths. It is pure and dependency-light; it runs at build time from sitemap.ts and can
 * be reused in tests or CI.
 */
import { collections, pathFor, findBySlug } from '@/content';
import type { ContentPage, RelatedRefs } from '@/content/types';

export interface SeoIssue {
  level: 'error' | 'warning';
  page: string;
  message: string;
}

const TITLE_MAX = 65;
const DESC_MIN = 50;
const DESC_MAX = 165;

function allPages(): ContentPage[] {
  return Object.values(collections).flat();
}

export function validateContent(): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const pages = allPages();

  const paths = new Map<string, string>();
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();

  for (const page of pages) {
    const id = `${page.kind}:${page.slug}`;
    const path = pathFor(page);

    // Duplicate canonical paths → duplicate content.
    const existingPath = paths.get(path);
    if (existingPath) {
      issues.push({
        level: 'error',
        page: id,
        message: `Duplicate path "${path}" (also ${existingPath})`,
      });
    } else {
      paths.set(path, id);
    }

    // Required, non-empty English fields.
    for (const field of ['name', 'seoTitle', 'metaDescription', 'headline', 'intro'] as const) {
      const value = page[field]?.en;
      if (!value || !value.trim()) {
        issues.push({ level: 'error', page: id, message: `Missing required field "${field}"` });
      }
    }
    if (!page.keywords?.en?.length) {
      issues.push({ level: 'warning', page: id, message: 'No keywords defined' });
    }

    const title = page.seoTitle.en ?? '';
    const desc = page.metaDescription.en ?? '';

    // Metadata duplication across pages.
    const dupTitle = titles.get(title);
    if (dupTitle) {
      issues.push({ level: 'error', page: id, message: `Duplicate title (also ${dupTitle})` });
    } else if (title) {
      titles.set(title, id);
    }
    const dupDesc = descriptions.get(desc);
    if (dupDesc) {
      issues.push({
        level: 'error',
        page: id,
        message: `Duplicate meta description (also ${dupDesc})`,
      });
    } else if (desc) {
      descriptions.set(desc, id);
    }

    // Length guidance.
    if (title.length > TITLE_MAX) {
      issues.push({
        level: 'warning',
        page: id,
        message: `Title is ${title.length} chars (>${TITLE_MAX})`,
      });
    }
    if (desc.length > DESC_MAX || desc.length < DESC_MIN) {
      issues.push({
        level: 'warning',
        page: id,
        message: `Meta description is ${desc.length} chars (aim ${DESC_MIN}-${DESC_MAX})`,
      });
    }

    // Broken internal links: every related ref must resolve to an existing entry.
    issues.push(...validateRelated(id, page.related));

    // FAQ completeness.
    for (const faq of page.faqs ?? []) {
      if (!faq.question.en?.trim() || !faq.answer.en?.trim()) {
        issues.push({ level: 'error', page: id, message: 'FAQ entry missing question or answer' });
      }
    }
  }

  return issues;
}

function validateRelated(id: string, refs: RelatedRefs | undefined): SeoIssue[] {
  if (!refs) return [];
  const out: SeoIssue[] = [];
  const checks: [keyof RelatedRefs, Parameters<typeof findBySlug>[0]][] = [
    ['features', 'feature'],
    ['solutions', 'solution'],
    ['countries', 'country'],
    ['integrations', 'integration'],
    ['comparisons', 'comparison'],
    ['articles', 'article'],
  ];
  for (const [key, kind] of checks) {
    for (const slug of refs[key] ?? []) {
      if (!findBySlug(kind, slug)) {
        out.push({
          level: 'warning',
          page: id,
          message: `Related ${kind} "${slug}" does not exist`,
        });
      }
    }
  }
  return out;
}

/** Log validation issues (used at build time). Returns the issue list for programmatic use. */
export function reportContentValidation(): SeoIssue[] {
  const issues = validateContent();
  if (issues.length === 0) return issues;
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  console.warn(
    `[seo:validate] ${errors.length} error(s), ${warnings.length} warning(s):\n` +
      issues.map((i) => `  ${i.level === 'error' ? '✗' : '⚠'} ${i.page}: ${i.message}`).join('\n'),
  );
  return issues;
}
