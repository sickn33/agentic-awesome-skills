import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { buildPluginsFallback, buildWorkbenchFallback, buildSkillMeta } from './prerender-routes.js';
import { buildSkillDescription } from '../src/utils/skillDescription.js';
import seoContent from '../../../tools/scripts/seo-content.js';

const base = 'https://example.com/catalog/';
const bundles = [{ id: 'games', name: 'Games & tools', description: 'Design <safe> games.', skills: [{ id: 'game-development/game-design' }] }];

describe('initial discovery content', () => {
  it('renders every pack and links nested sources to actual catalog IDs', () => {
    const html = `<body>${buildPluginsFallback({ bundles, siteBaseUrl: base })}</body>`;
    const document = new JSDOM(html).window.document;
    expect(document.querySelector('h2').textContent).toBe('Games & tools');
    expect(document.querySelector('safe')).toBeNull();
    expect(document.querySelector('a[href$="/skill/game-design/"]').textContent).toBe('game-development/game-design');
    expect(document.querySelector('a[href$="/docs/plugins/"]').href).toBe(`${base}docs/plugins/`);
    expect(() => seoContent.assertPluginsContent(html, { pluginCount: 1, baseUrl: base })).not.toThrow();
  });

  it('explains the interactive review and its actual boundaries without JavaScript', () => {
    const html = `<body>${buildWorkbenchFallback({ siteBaseUrl: base })}</body>`;
    expect(() => seoContent.assertWorkbenchContent(html, { baseUrl: base })).not.toThrow();
    expect(new JSDOM(html).window.document.querySelector('h1').textContent).toBe('Review what your agent selected.');
    expect(() => seoContent.assertWorkbenchContent(html.replace('cannot install, apply, share, or persist', ''), { baseUrl: base })).toThrow();
  });
});

describe('skill snippets', () => {
  it('uses the actual description consistently in server metadata', () => {
    const skill = { name: 'seo-audit', description: 'Diagnose and audit SEO issues.', date_added: '2026-02-27', category: 'content' };
    const meta = buildSkillMeta({ skill, isPriority: true, canonicalUrl: `${base}skill/seo-audit/`, imageUrl: `${base}social-card.png` });
    expect(meta.description).toBe(skill.description);
    expect(meta.ogDescription).toBe(meta.description);
    expect(meta.jsonLd.description).toBe(meta.description);
    expect(meta.description).not.toContain('Added');
  });
  it('normalizes whitespace, provides a fallback and clips long descriptions at words', () => {
    expect(buildSkillDescription({ description: '  Practical\nReact\tpatterns. ' })).toBe('Practical React patterns.');
    expect(buildSkillDescription({ name: 'react', description: ' ' })).toBe('Explore react: reusable instructions for AI coding agents.');
    const value = buildSkillDescription({ description: 'Explain accessibility patterns. '.repeat(20) });
    expect(Array.from(value).length).toBeLessThanOrEqual(160);
    expect(value).toMatch(/patterns\. …$|patterns\.\u2026$|accessibility…$|Explain…$/);
    const unicode = buildSkillDescription({ description: '💡'.repeat(170) });
    expect(Array.from(unicode)).toHaveLength(160);
    expect(unicode).not.toContain('\uFFFD');
  });
});
