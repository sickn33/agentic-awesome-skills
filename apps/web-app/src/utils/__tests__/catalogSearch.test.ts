import { describe, expect, it } from 'vitest';
import { createMockSkill } from '../../factories/skill';
import { categoryFacet, matchCatalogSkill } from '../catalogSearch';

describe('explicit catalog search', () => {
  const skills = [
    createMockSkill({ id: 'migration', name: 'Migration', description: 'Database migration', category: 'databases', tags: [] }),
    createMockSkill({ id: 'postgres', name: 'Postgres', description: 'Postgres migration', category: 'database', tags: [] }),
    createMockSkill({ id: 'unknown', name: 'Unknown', description: '', category: 'uncategorized', risk: 'unknown', tags: [] }),
  ];
  it('narrows ambiguous queries, explains matches, and leaves the catalog order and all IDs available', () => {
    expect(skills.filter((s) => matchCatalogSkill(s, 'postgres migration', 'any').matches).map((s) => s.id)).toEqual(['migration', 'postgres']);
    expect(skills.filter((s) => matchCatalogSkill(s, 'postgres migration', 'all').matches).map((s) => s.id)).toEqual(['postgres']);
    expect(matchCatalogSkill(skills[1], 'postgres migration', 'all').explanation).toBe('Matched terms: postgres, migration');
    expect(skills.filter((s) => matchCatalogSkill(s, '', 'all').matches)).toEqual(skills);
    expect(matchCatalogSkill(skills[1], '!!!', 'all').matches).toBe(false);
    expect(matchCatalogSkill(skills[1], '', 'all', '!!!').matches).toBe(false);
  });
  it('keeps required words literal even with approximate matching and uses shared aliases', () => {
    expect(matchCatalogSkill(skills[1], 'pstgrs', 'fuzzy', 'migration').matches).toBe(true);
    expect(matchCatalogSkill(skills[1], 'pstgrs', 'fuzzy', 'mgrtn').matches).toBe(false);
    expect(matchCatalogSkill(createMockSkill({ tags: ['a11y'] }), 'accessibility', 'all').matches).toBe(true);
    expect(categoryFacet('front-end')).toBe('frontend');
    expect(categoryFacet('databases')).toBe('database');
    expect(categoryFacet('constructor')).toBe('constructor');
  });
});
