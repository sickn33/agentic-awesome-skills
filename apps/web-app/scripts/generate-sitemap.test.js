import { describe, it, expect } from 'vitest';
import { buildSitemap, getSeoLandingPaths, selectTopSkillEntries } from './generate-sitemap.js';

describe('sitemap generation script helpers', () => {
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

  it('returns homepage and topic routes when top skill limit is zero', () => {
    const catalog = [
      { id: 'gamma', stars: 2 },
      { id: 'delta', stars: 1 },
    ];

    const xml = buildSitemap(catalog, 0, 'https://example.com');

    expect(xml).toContain('https://example.com/</loc>');
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
});
