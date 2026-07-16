import rawLandingPages from './seoLandingPages.json';
import type { Skill } from '../types';
import type { SeoLandingPage } from '../utils/seo';

export const seoLandingPages = rawLandingPages as SeoLandingPage[];

export function getSeoLandingPage(slug: string | undefined): SeoLandingPage | undefined {
  if (!slug) {
    return undefined;
  }

  return seoLandingPages.find((page) => page.slug === slug);
}

function normalize(value: string | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getPageMatchTerms(page: SeoLandingPage): string[] {
  return [
    page.slug,
    page.eyebrow,
    page.h1,
    page.summary,
    page.primaryIntent,
    ...page.keywords,
    ...(page.relatedTerms || []),
  ];
}

function scoreTopicForSkill(page: SeoLandingPage, skill: Skill): number {
  const haystack = normalize([
    skill.id,
    skill.name,
    skill.description,
    skill.category,
    skill.source,
    skill.path,
  ].filter(Boolean).join(' '));
  const category = normalize(skill.category);
  const relatedCategories = (page.relatedCategories || []).map(normalize);
  let score = relatedCategories.includes(category) ? 12 : 0;

  for (const term of getPageMatchTerms(page)) {
    const normalizedTerm = normalize(term);

    if (!normalizedTerm || normalizedTerm.length < 3) {
      continue;
    }

    if (haystack.includes(normalizedTerm)) {
      score += Math.min(12, 3 + normalizedTerm.split(' ').length * 2);
      continue;
    }

    const matchedTokens = normalizedTerm
      .split(' ')
      .filter((token) => token.length >= 4 && haystack.includes(token));

    score += Math.min(6, matchedTokens.length);
  }

  return score;
}

export function getRelatedSeoLandingPagesForSkill(skill: Skill, limit = 3): SeoLandingPage[] {
  const maxItems = Math.max(0, limit);

  if (maxItems === 0) {
    return [];
  }

  const scoredPages = seoLandingPages
    .map((page, index) => ({
      page,
      index,
      score: scoreTopicForSkill(page, skill),
    }))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return a.index - b.index;
    });

  const selected = scoredPages.filter(({ score }) => score > 0).map(({ page }) => page);

  for (const { page } of scoredPages) {
    if (selected.length >= maxItems) {
      break;
    }

    if (!selected.includes(page)) {
      selected.push(page);
    }
  }

  return selected.slice(0, maxItems);
}
