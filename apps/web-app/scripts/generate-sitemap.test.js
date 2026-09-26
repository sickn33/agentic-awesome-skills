import { describe, it, expect } from 'vitest';
import { buildSitemap, DEFAULT_TOP_SKILL_COUNT, generateSitemapXml, getSeoLandingPaths, selectTopSkillEntries } from './generate-sitemap.js';
import { getDocsMetadata } from './docs-metadata.js';

describe('sitemap generation script helpers', () => {
  it('uses each guide Git date rather than the build date', () => {
    const metadata = getDocsMetadata();
    expect(metadata['getting-started'].commit).toMatch(/^[a-f0-9]{40}$/);
    const xml = buildSitemap([], 0);
    expect(xml).toContain(`/docs/getting-started/</loc>\n    <lastmod>${metadata['getting-started'].modified.slice(0, 10)}</lastmod>`);
    const fixture = generateSitemapXml({ baseUrl: 'https://example.com', paths: ['/docs/guide/'], lastmod: '2099-01-01', modifiedByPath: { '/docs/guide/': '2020-02-03' } });
    expect(fixture).toContain('<lastmod>2020-02-03</lastmod>');
    expect(fixture).not.toContain('2099-01-01');
  });
  it('uses the custom AAS domain as the default sitemap origin', () => {
    expect(buildSitemap([], 0)).toContain('https://aaskills.tech/</loc>');
  });

  it('builds top skill entries sorted by stars/date/name without duplicates', () => {
    const catalog = [
      { id: 'alpha', stars: 5, date_added: '2026-01-01' },
      { id: 'beta', stars: 4, date_added: '2026-01-02' },
      { id: 'alpha', stars: 3, date_added: '2026-01-03' },
    ];

    const topEntries = selectTopSkillEntries(catalog, 5);

    expect(topEntries).toEqual(['/skill/alpha', '/skill/beta']);
  });

  it('builds sitemap XML with homepage and selected skill paths', () => {
    const catalog = [
      { id: 'gamma', stars: 2 },
      { id: 'delta', stars: 1 },
    ];

    const xml = buildSitemap(catalog, 1, 'https://example.com');

    expect(xml).toContain('https://example.com/</loc>');
    expect(xml).toContain('https://example.com/core/</loc>');
    expect(xml).toContain('https://example.com/docs/</loc>');
    expect(xml).toContain('https://example.com/docs/getting-started/</loc>');
    expect(xml).toContain('https://example.com/docs/aas-core/</loc>');
    expect(xml).toContain('https://example.com/workbench/</loc>');
    expect(xml).toContain('https://example.com/topics/antigravity-cli-skills/</loc>');
    expect(xml).toContain('https://example.com/skill/gamma/</loc>');
    expect(xml).not.toContain('/skill/delta');
  });

  it('escapes XML reserved characters in generated sitemap URLs', () => {
    const catalog = [{ id: 'safe&id', stars: 10 }];

    const xml = buildSitemap(catalog, 1, 'https://example.com/search?q=ai&lang=en');

    expect(xml).toContain('https://example.com/search?q=ai&amp;lang=en/</loc>');
    expect(xml).toContain('/safe%26id/</loc>');
  });

  it('returns homepage, workbench, and topic routes when top skill limit is zero', () => {
    const catalog = [
      { id: 'gamma', stars: 2 },
      { id: 'delta', stars: 1 },
    ];

    const xml = buildSitemap(catalog, 0, 'https://example.com');

    expect(xml).toContain('https://example.com/</loc>');
    expect(xml).toContain('https://example.com/core/</loc>');
    expect(xml).toContain('https://example.com/workbench/</loc>');
    expect(xml).toContain('https://example.com/topics/github-ai-skills-repository/</loc>');
    expect(xml).not.toContain('https://example.com/skill');
  });

  it('loads stable SEO landing paths from shared catalog data', () => {
    expect(getSeoLandingPaths()).toEqual(
      expect.arrayContaining([
        '/topics/antigravity-cli-skills/',
        '/topics/github-ai-skills-repository/',
        '/topics/antigravity-plugins/',
        '/topics/skills-para-antigravity/',
      ]),
    );
  });

  it('keeps the default public sitemap skill count reproducible', () => {
    const catalog = Array.from({ length: DEFAULT_TOP_SKILL_COUNT + 1 }, (_, index) => ({
      id: `skill-${String(index).padStart(2, '0')}`,
      stars: DEFAULT_TOP_SKILL_COUNT + 1 - index,
    }));

    const xml = buildSitemap(catalog, undefined, 'https://example.com');
    const skillRoutes = xml.match(/https:\/\/example\.com\/skill\//g) || [];

    expect(skillRoutes).toHaveLength(180);
    expect(xml).toContain('https://example.com/skill/skill-179/</loc>');
    expect(xml).not.toContain('https://example.com/skill/skill-180/</loc>');
  });
});
