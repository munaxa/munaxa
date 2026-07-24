/**
 * Breadcrumb generation.
 *
 * `buildBreadcrumbs()` turns an ordered list of trail segments into both the data the
 * visual <Breadcrumbs> component renders and the BreadcrumbList JSON-LD nodes. The site
 * root ("Munaxa") is always prepended automatically.
 */
import { SITE_NAME } from '@/lib/constants';
import { absoluteUrl } from './config';
import type { Crumb } from './jsonld';

export interface TrailSegment {
  name: string;
  /** App-relative path for this crumb, e.g. "/features". The last crumb may omit it. */
  path?: string;
}

export function buildBreadcrumbs(segments: TrailSegment[], homeLabel = SITE_NAME): Crumb[] {
  const crumbs: Crumb[] = [{ name: homeLabel, url: absoluteUrl('/') }];
  for (const seg of segments) {
    crumbs.push({ name: seg.name, url: absoluteUrl(seg.path ?? '/') });
  }
  return crumbs;
}
