import { describe, expect, it } from 'vitest';
import { createMockSkill } from '../factories/skill';
import { getCuratedSkillsForSeoLandingPage, getSeoLandingPage } from './seoLandingPages';

describe('SEO landing page skill curation', () => {
  it('keeps real editorial picks first and deterministically fills with scored matches', () => {
    const page = getSeoLandingPage('antigravity-cli-skills');
    expect(page).toBeDefined();

    const skills = [
      createMockSkill({ id: 'z-workflow', name: 'Antigravity Z', category: 'workflow' }),
      createMockSkill({ id: 'antigravity-agent-manager', name: 'Editorial pick', category: 'general' }),
      createMockSkill({ id: 'a-workflow', name: 'Antigravity A', category: 'workflow' }),
      createMockSkill({ id: 'unrelated', name: 'Unrelated', description: 'No topic match', category: 'finance' }),
    ];

    const selected = getCuratedSkillsForSeoLandingPage(page!, skills, 3);

    expect(selected.map((skill) => skill.id)).toEqual([
      'antigravity-agent-manager',
      'a-workflow',
      'z-workflow',
    ]);
  });

  it('does not invent missing editorial entries', () => {
    const page = getSeoLandingPage('github-ai-skills-repository');
    const selected = getCuratedSkillsForSeoLandingPage(page!, [
      createMockSkill({ id: 'github-actions-templates', name: 'GitHub Actions Templates' }),
    ]);

    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe('github-actions-templates');
  });
});
