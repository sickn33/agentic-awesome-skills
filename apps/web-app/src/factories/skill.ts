import type { Skill } from '../types';

/**
 * Factory function for creating mock skill data
 */
export function createMockSkill(overrides?: Partial<Skill>): Skill {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill for testing purposes',
    category: 'testing',
    risk: 'safe',
    source: 'test',
    date_added: '2024-01-01',
    path: 'skills/test/SKILL.md',
    ...overrides,
  };
}

/**
 * Factory function for creating an array of mock skills
 */
export function createMockSkills(count: number): Skill[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSkill({
      id: `skill-${i}`,
      name: `Test Skill ${i}`,
    })
  );
}

/**
 * Factory for creating skills with different categories
 */
export function createMockSkillsByCategory(categories: string[]): Skill[] {
  return categories.flatMap((category) =>
    Array.from({ length: 3 }, (_, i) =>
      createMockSkill({
        id: `${category}-skill-${i}`,
        name: `${category} Skill ${i}`,
        category,
      })
    )
  );
}
