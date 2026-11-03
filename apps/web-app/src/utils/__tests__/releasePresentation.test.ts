import { describe, expect, it } from 'vitest';
import { releasePresentation } from '../releasePresentation';
describe('releasePresentation', () => {
  it('removes repeated metadata but retains notices and changes', () => {
    const result = releasePresentation({tag:'v20.4.0',name:'v20.4.0 — Design Tools',body:'> npm unavailable\n\n## [20.4.0] - 2026-11-02 - "Design Tools"\n\n### Added\n- A new skill'});
    expect(result.title).toBe('Design Tools');
    expect(result.body).toContain('npm unavailable');
    expect(result.body).toContain('### Added\n- A new skill');
    expect(result.body).not.toContain('## [20.4.0]');
  });
  it('keeps headings that carry different information and does not edit the archive', () => {
    const release={tag:'v1.0.0',name:'v1.0.0 — First release',body:'## v1.0.0 migration requirements\nKeep this content'};
    expect(releasePresentation(release).body).toBe(release.body);
    expect(releasePresentation({tag:'v0.1.0',name:'v0.1.0',body:'## v0.1.0\nOriginal'}).body).toContain('## v0.1.0');
  });
});
