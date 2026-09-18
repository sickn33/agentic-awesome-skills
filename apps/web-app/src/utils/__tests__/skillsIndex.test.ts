import { describe, expect, it } from 'vitest';
import currentCatalog from '../../../../../skills_index.json';
import { createMockSkill } from '../../factories/skill';
import { isSkillsIndex } from '../skillsIndex';

describe('skills index validation', () => {
  const valid = createMockSkill({
    id: 'react-patterns',
    source_type: 'official',
    tags: ['react'],
    plugin: {
      targets: { codex: 'supported', claude: 'blocked' },
      setup: { type: 'manual', summary: 'Configure React.', docs: null },
      reasons: ['Requires project setup'],
    },
  });

  it('accepts the complete generated catalog shipped by the repository', () => {
    expect(isSkillsIndex(currentCatalog)).toBe(true);
  });

  it('accepts valid records without copying or stripping unknown fields', () => {
    const record = { ...valid, future_field: { retained: true } };
    const catalog = [record];
    expect(isSkillsIndex(catalog)).toBe(true);
    expect(catalog[0]).toBe(record);
    expect(record.future_field).toEqual({ retained: true });
  });

  it('rejects empty, non-array, malformed, duplicate, and unsafe records', () => {
    expect(isSkillsIndex([])).toBe(false);
    expect(isSkillsIndex({})).toBe(false);
    expect(isSkillsIndex([null])).toBe(false);
    expect(isSkillsIndex([{}])).toBe(false);
    expect(isSkillsIndex([valid, valid])).toBe(false);
    expect(isSkillsIndex([{ ...valid, id: '../escape' }])).toBe(false);
  });

  it('rejects malformed optional metadata instead of accepting a partial catalog', () => {
    expect(isSkillsIndex([{ ...valid, source: {} }])).toBe(false);
    expect(isSkillsIndex([{ ...valid, source_type: 'untrusted' }])).toBe(false);
    expect(isSkillsIndex([{ ...valid, risk: 'high' }])).toBe(false);
    expect(isSkillsIndex([{ ...valid, tags: [{}] }])).toBe(false);
    expect(isSkillsIndex([{ ...valid, plugin: { targets: {}, setup: {}, reasons: [] } }])).toBe(false);
  });
});
