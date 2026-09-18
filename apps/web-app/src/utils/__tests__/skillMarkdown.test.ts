import { describe, expect, it } from 'vitest';
import { catalogVersion, releaseFileUrl, skillBundleUrl } from '../catalogRelease';
import { skillMarkdownUrl } from '../skillMarkdown';

const release = `https://github.com/sickn33/agentic-awesome-skills/blob/v${catalogVersion}/`;

describe('release-pinned documentation URLs', () => {
  it('resolves nested skill support files and repository-relative documentation', () => {
    expect(skillBundleUrl('skills/game-development/2d-games')).toBe(release.replace('/blob/', '/tree/') + 'skills/game-development/2d-games');
    expect(skillBundleUrl('skills/android_ui_verification')).toBe(release.replace('/blob/', '/tree/') + 'skills/android_ui_verification');
    expect(releaseFileUrl('../../docs/guide.md', 'skills/example/SKILL.md')).toBe(release + 'docs/guide.md');
    expect(releaseFileUrl('guide.md?raw=true#example', 'skills/example/SKILL.md')).toBe(release + 'skills/example/guide.md#example');
    expect(skillMarkdownUrl('images/demo.png', 'src', 'skills/example', 'https://catalog.test/skill/example/')).toBe(`https://raw.githubusercontent.com/sickn33/agentic-awesome-skills/v${catalogVersion}/skills/example/images/demo.png`);
  });

  it.each(['../../../../other', '//evil.test/file', 'javascript:alert(1)', 'data:text/html,hello', 'bad%2Fpath', 'bad%5cpath', 'bad%00path', 'bad%252fpath', 'bad%zz', 'bad\\path'])('rejects unsafe relative file targets: %s', (path) => {
    expect(releaseFileUrl(path, 'skills/example/SKILL.md')).toBe('');
  });

  it('keeps ordinary external links and rejects unsafe skill paths', () => {
    expect(skillMarkdownUrl('https://example.com/docs', 'href', 'skills/example', 'https://catalog.test/')).toBe('https://example.com/docs');
    expect(skillMarkdownUrl('guide.md', 'href', 'skills/../../other', 'https://catalog.test/')).toBe('');
    expect(skillMarkdownUrl('javascript:alert(1)', 'href', 'skills/example', 'https://catalog.test/')).toBe('');
  });
});
