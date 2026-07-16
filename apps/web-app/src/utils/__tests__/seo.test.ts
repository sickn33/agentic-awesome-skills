import { describe, it, expect } from 'vitest';
import type { Skill } from '../../types';
import {
  DEFAULT_TOP_SKILL_COUNT,
  DEFAULT_SOCIAL_IMAGE,
  buildHomeMeta,
  buildSkillFallbackMeta,
  buildSkillMeta,
  buildTopicLandingMeta,
  getCanonicalUrl,
  isTopSkill,
  selectTopSkills,
  setPageMeta,
  toCanonicalPath,
  toIndexableRoutePath,
} from '../seo';
import { seoLandingPages } from '../../data/seoLandingPages';

function createSkill(overrides: Record<string, unknown> = {}) {
  return {
    id: 'skill-alpha',
    path: 'skills/skill-alpha',
    name: 'skill-alpha',
    category: 'ai',
    description: 'Base AI skill',
    source: 'community',
    ...overrides,
  };
}

describe('SEO helpers', () => {
  it('keeps hydrated priority metadata aligned with the curated sitemap scope', () => {
    expect(DEFAULT_TOP_SKILL_COUNT).toBe(180);
  });

  it('builds homepage metadata with the canonical catalog message', () => {
    const meta = buildHomeMeta(10);

    expect(meta.title).toContain('Agentic Awesome Skills GitHub');
    expect(meta.title).toContain('10+ AI coding skills');
    expect(meta.description).toContain('GitHub library of 10+ installable agentic skills');
    expect(meta.canonicalPath).toBe('/');
    expect(meta.ogTitle).toBe(meta.title);
    expect(meta.ogImage).toBe(DEFAULT_SOCIAL_IMAGE);
    expect(typeof meta.jsonLd).toBe('function');
  });

  it('selects top skills using stars then date then name ordering', () => {
    const catalog = [
      createSkill({ id: 'skill-oldest', name: 'Alpha', stars: 4, date_added: '2026-01-01' }),
      createSkill({ id: 'skill-newest', name: 'Beta', stars: 4, date_added: '2026-03-01' }),
      createSkill({ id: 'skill-popular', name: 'Gamma', stars: 5, date_added: '2026-02-01' }),
      createSkill({ id: 'skill-missing', name: 'Delta', date_added: null as unknown as string }),
      createSkill({ id: 'skill-fallback', name: 'Epsilon' }),
    ];

    const top = selectTopSkills(catalog, 3);

    expect(top.map(skill => skill.id)).toEqual(['skill-popular', 'skill-newest', 'skill-oldest']);
  });

  it('returns valid priority markers for top and non-top skills', () => {
    const catalog = [
      createSkill({ id: 'priority', stars: 10, date_added: '2026-03-01' }),
      createSkill({ id: 'secondary', stars: 5, date_added: '2026-02-01' }),
    ];

    expect(isTopSkill('priority', catalog, 1)).toBe(true);
    expect(isTopSkill('secondary', catalog, 1)).toBe(false);
  });

  it('builds skill metadata with a rich description', () => {
    const skill = createSkill({
      id: 'react',
      name: 'react-patterns',
      description: 'Learn practical React patterns.',
      category: 'frontend',
      source: 'community',
      date_added: '2026-03-01',
    });

    const meta = buildSkillMeta(skill, true, '/skill/react-patterns');

    expect(meta.title).toContain('react-patterns');
    expect(meta.description).toContain('Added 2026-03-01.');
    expect(meta.canonicalPath).toBe('/skill/react-patterns');
    expect(meta.ogTitle).toContain('@react-patterns');
    expect(meta.ogImage).toBe(DEFAULT_SOCIAL_IMAGE);
    expect(typeof meta.jsonLd).toBe('function');
  });

  it('builds topic landing metadata for high-intent search pages', () => {
    const topic = seoLandingPages.find((page) => page.slug === 'github-ai-skills-repository');
    expect(topic).toBeDefined();

    const meta = buildTopicLandingMeta(topic!);

    expect(meta.title).toContain('GitHub AI Skills Repository');
    expect(meta.description).toContain('GitHub repository');
    expect(meta.canonicalPath).toBe('/topics/github-ai-skills-repository');
    expect(meta.ogImage).toBe(DEFAULT_SOCIAL_IMAGE);
    expect(typeof meta.jsonLd).toBe('function');
  });

  it('returns coherent fallback metadata for unresolved skill ids', () => {
    const meta = buildSkillFallbackMeta('sample-skill');

    expect(meta.title).toContain('sample-skill');
    expect(meta.description).toContain('loading');
    expect(meta.canonicalPath).toBe('/skill/sample-skill');
    expect(meta.ogDescription).toContain('loading');
    expect(meta.ogImage).toBe(DEFAULT_SOCIAL_IMAGE);
    expect(typeof meta.jsonLd).toBe('function');
  });

  it('builds safe fallback values for skill metadata with partial data', () => {
    const partialSkill = {
      id: 'partial',
      path: 'skills/partial',
      name: '',
      category: '',
      description: '',
      source: '',
    } as Skill;

    const meta = buildSkillMeta(partialSkill, false, '/skill/partial');

    expect(meta.title).toContain('Unnamed skill');
    expect(meta.description).toContain('Installable AI skill');
    expect(meta.ogTitle).toContain('Unnamed skill');
  });

  it('escapes fallback skill ids in canonical path', () => {
    const meta = buildSkillFallbackMeta('skill with spaces');

    expect(meta.canonicalPath).toBe('/skill/skill%20with%20spaces');
  });

  it('normalizes canonical paths consistently for seo utilities', () => {
    expect(toCanonicalPath('/')).toBe('/');
    expect(toCanonicalPath('skill/react/')).toBe('/skill/react');
    expect(toCanonicalPath('/skill//react/')).toBe('/skill/react');
    expect(toIndexableRoutePath('/skill/react')).toBe('/skill/react/');
  });

  it('builds canonical urls with optional overrides', () => {
    expect(getCanonicalUrl('/skill/react', 'https://example.com/site')).toBe('https://example.com/site/skill/react/');
  });

  it('setPageMeta updates the same meta tags on repeated invocations', () => {
    document.head.innerHTML = '';

    setPageMeta(buildHomeMeta(10));
    setPageMeta(buildSkillMeta({
      id: 'react-patterns',
      name: 'react-patterns',
      description: 'Description',
      category: 'frontend',
      path: 'skills/react-patterns',
      source: 'community',
      date_added: '2026-03-01',
    }, false, '/skill/react-patterns'));

    expect(document.title).toContain('react-patterns');
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[name="twitter:image"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[name="twitter:image:alt"]')).toHaveLength(1);
    expect(document.querySelectorAll('script[data-seo-jsonld="true"]')).toHaveLength(4);
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/skill/react-patterns/');
  });

  it('honors a noindex route directive', () => {
    document.head.innerHTML = '';
    setPageMeta({
      title: 'Not found',
      description: 'Missing page',
      canonicalPath: '/missing',
      robots: 'noindex, follow',
    });

    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  });

});
