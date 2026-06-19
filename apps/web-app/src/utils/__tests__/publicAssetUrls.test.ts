import { describe, expect, it } from 'vitest';

import {
  getAbsolutePublicAssetUrl,
  getSkillMarkdownCandidateUrls,
  getSkillsIndexCandidateUrls,
  normalizeBasePath,
} from '../publicAssetUrls';

describe('public asset URL helpers', () => {
  it('normalizes dot-relative BASE_URL values', () => {
    expect(normalizeBasePath('./')).toBe('/');
    expect(normalizeBasePath('/antigravity-awesome-skills/')).toBe('/antigravity-awesome-skills/');
  });

  it('builds stable skills index candidates for gh-pages routes', () => {
    expect(
      getSkillsIndexCandidateUrls({
        baseUrl: '/antigravity-awesome-skills/',
        origin: 'https://sickn33.github.io',
        pathname: '/antigravity-awesome-skills/skill/some-id',
        documentBaseUrl: 'https://sickn33.github.io/antigravity-awesome-skills/',
      }),
    ).toEqual([
      'https://sickn33.github.io/antigravity-awesome-skills/skills.json',
      'https://sickn33.github.io/antigravity-awesome-skills/skills.json.backup',
      'https://sickn33.github.io/skills.json',
      'https://sickn33.github.io/skills.json.backup',
      'https://sickn33.github.io/antigravity-awesome-skills/skill/skills.json',
      'https://sickn33.github.io/antigravity-awesome-skills/skill/skills.json.backup',
      'https://sickn33.github.io/antigravity-awesome-skills/skill/some-id/skills.json',
      'https://sickn33.github.io/antigravity-awesome-skills/skill/some-id/skills.json.backup',
    ]);
  });

  it('builds stable markdown candidates for gh-pages routes', () => {
    expect(
      getSkillMarkdownCandidateUrls({
        baseUrl: '/antigravity-awesome-skills/',
        origin: 'https://sickn33.github.io',
        pathname: '/antigravity-awesome-skills/skill/react-patterns',
        documentBaseUrl: 'https://sickn33.github.io/antigravity-awesome-skills/',
        skillPath: 'skills/react-patterns',
      }),
    ).toEqual([
      'https://sickn33.github.io/antigravity-awesome-skills/skills/react-patterns/SKILL.md',
      'https://sickn33.github.io/skills/react-patterns/SKILL.md',
      'https://sickn33.github.io/antigravity-awesome-skills/skill/skills/react-patterns/SKILL.md',
      'https://sickn33.github.io/antigravity-awesome-skills/skill/react-patterns/skills/react-patterns/SKILL.md',
    ]);
  });

  it('rejects markdown asset paths that escape the skills tree', () => {
    const input = {
      baseUrl: '/antigravity-awesome-skills/',
      origin: 'https://sickn33.github.io',
      pathname: '/antigravity-awesome-skills/skill/react-patterns',
      documentBaseUrl: 'https://sickn33.github.io/antigravity-awesome-skills/',
    };

    expect(getSkillMarkdownCandidateUrls({ ...input, skillPath: 'skills/../../manifest.webmanifest' })).toEqual([]);
    expect(getSkillMarkdownCandidateUrls({ ...input, skillPath: 'skills/%2e%2e/%2e%2e/manifest.webmanifest' })).toEqual([]);
    expect(getSkillMarkdownCandidateUrls({ ...input, skillPath: 'https://evil.example/skills/demo' })).toEqual([]);
  });

  it('resolves absolute public asset URLs from the shared base path logic', () => {
    expect(
      getAbsolutePublicAssetUrl('/skill/react-patterns', {
        baseUrl: '/antigravity-awesome-skills/',
        origin: 'https://sickn33.github.io',
      }),
    ).toBe('https://sickn33.github.io/antigravity-awesome-skills/skill/react-patterns');
  });
});
