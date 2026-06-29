import rawLandingPages from './seoLandingPages.json';
import type { SeoLandingPage } from '../utils/seo';

export const seoLandingPages = rawLandingPages as SeoLandingPage[];

export function getSeoLandingPage(slug: string | undefined): SeoLandingPage | undefined {
  if (!slug) {
    return undefined;
  }

  return seoLandingPages.find((page) => page.slug === slug);
}
