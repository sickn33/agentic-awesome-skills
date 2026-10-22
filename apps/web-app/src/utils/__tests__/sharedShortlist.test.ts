import { describe, expect, it } from 'vitest';
import { buildSharedShortlistUrl, parseSharedShortlist } from '../sharedShortlist';

describe('shared shortlist links', () => {
  it('round trips ordered IDs and version under a hosted base without query data', () => {
    const url = new URL(buildSharedShortlistUrl(['security-audit', 'review'], '19.3.0', 'https://aaskills.tech', '/catalog/'));
    expect(url.pathname).toBe('/catalog/share/');
    expect(url.search).toBe('');
    expect(parseSharedShortlist(url.hash)).toEqual({ format: 1, version: '19.3.0', ids: ['security-audit', 'review'] });
  });

  it('accepts canonical catalog skill IDs containing dots and up to 200 characters', () => {
    const ids = ['review.v2', `a${'x'.repeat(199)}`];
    const url = new URL(buildSharedShortlistUrl(ids, '19.3.0', 'https://aaskills.tech', '/'));
    expect(parseSharedShortlist(url.hash)?.ids).toEqual(ids);
    expect(() => buildSharedShortlistUrl([`a${'x'.repeat(200)}`], '19.3.0', 'https://aaskills.tech', '/')).toThrow();
  });

  it('rejects malformed, oversized, duplicate or extra private fields', () => {
    const encode = (value: unknown) => `#selection=${encodeURIComponent(JSON.stringify(value))}`;
    const valid = { format: 1, version: '19.3.0', ids: ['review'] };
    for (const hash of ['', '#selection=%ZZ', '#selection=null', `#selection=${'x'.repeat(12001)}`,
      encode({ ...valid, format: 2 }), encode({ ...valid, ids: [] }), encode({ ...valid, ids: ['review', 'review'] }),
      encode({ ...valid, ids: ['../secret'] }), encode({ ...valid, version: 'latest' }),
      encode({ ...valid, goal: 'private project' }), encode({ ...valid, ids: Array.from({ length: 51 }, (_, n) => `skill-${n}`) })]) {
      expect(parseSharedShortlist(hash)).toBeNull();
    }
    expect(() => buildSharedShortlistUrl([], '19.3.0', 'https://aaskills.tech', '/')).toThrow();
  });
});
