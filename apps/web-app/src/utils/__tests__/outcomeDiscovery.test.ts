import { describe, expect, it } from 'vitest';
import { createMockSkill } from '../../factories/skill';
import { evidenceSignals, isDiscoveryCatalog, outcomeTerms, rankForOutcome } from '../outcomeDiscovery';

describe('goal discovery relevance and evidence boundaries', () => {
  const specific = createMockSkill({ id: 'react-auth', name: 'React authentication', description: 'Handle authentication in React', tags: [], category: 'frontend', risk: 'unknown' });
  const general = createMockSkill({ id: 'generic', name: 'General review', description: 'Review code', tags: [], category: 'general', source: 'official' });
  it('ranks matching task and technology above unrelated popularity or provenance without mutating the catalog', () => {
    const catalog = [general, specific];
    const before = JSON.stringify(catalog);
    const result = rankForOutcome(catalog, 'React authentication review');
    expect(result[0].skill.id).toBe('react-auth');
    expect(result[0].matched).toEqual(['react', 'auth']);
    expect(JSON.stringify(catalog)).toBe(before);
    expect(rankForOutcome(catalog, 'nonexistent-task')).toEqual([]);
  });
  it('does not let risk, source, missing license or packaging determine rank or eligibility', () => {
    const first = createMockSkill({ ...specific, id: 'a', source: 'self', risk: 'unknown', license: undefined });
    const second = createMockSkill({ ...specific, id: 'b', source: 'official', risk: 'safe', license: 'MIT' });
    const result = rankForOutcome([second, first], 'react auth');
    expect(result.map((item) => item.skill.id)).toEqual(['a', 'b']);
    expect(result[0].score).toBe(result[1].score);
  });
  it('handles blank, punctuation-only, multilingual and bounded goals without fabricating matches', () => {
    expect(rankForOutcome([specific], 'the and')).toEqual([]);
    expect(rankForOutcome([specific], '!!!')).toEqual([]);
    expect(outcomeTerms('autenticazione React')).toEqual(['auth', 'react']);
    expect(outcomeTerms('x '.repeat(1000))).toEqual([]);
    expect(outcomeTerms('constructor __proto__')).toEqual(['constructor', 'proto']);
  });
  it('labels missing evidence without awarding a reliability badge', () => {
    const signals = evidenceSignals(createMockSkill({ source: undefined, license: undefined, risk: 'unknown', plugin: undefined }));
    expect(signals.map((entry) => entry.value)).toEqual(['Source not recorded', 'Not recorded in catalog', 'Not assessed in catalog', 'Not recorded in catalog']);
  });
  it('rejects duplicate IDs and malformed data before it reaches comparison', () => {
    expect(isDiscoveryCatalog([specific])).toBe(true);
    expect(isDiscoveryCatalog([specific, specific])).toBe(false);
    expect(isDiscoveryCatalog([{ ...specific, tags: [{}] }])).toBe(false);
    expect(isDiscoveryCatalog([{ ...specific, plugin: { targets: {}, setup: {}, reasons: [] } }])).toBe(false);
    expect(isDiscoveryCatalog([{ ...specific, source: {} }])).toBe(false);
    expect(isDiscoveryCatalog([{ ...specific, id: '../escape' }])).toBe(false);
    expect(isDiscoveryCatalog([])).toBe(false);
  });
});
