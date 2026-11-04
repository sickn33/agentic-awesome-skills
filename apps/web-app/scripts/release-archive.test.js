import { expect, it } from 'vitest';
import { releaseArchiveEntries } from './release-archive.js';

const entry = (version) => `## [${version}] - 2026-11-05 - "Catalog update"

Explore the latest catalog changes.

### New skills

- Add a catalog skill.

### Improvements

- Improve an existing skill.`;
const current = entry('99.1.0');
const previous = entry('99.0.0-rc.1');
const legacy = '## [20.5.0] - 2026-11-04 - "Legacy notes"\n\n### Added\n\n- Keep the old format.';
const changelog = [entry('99.2.0'), current, previous, legacy].join('\n\n');

it('uses the exact publication section and excludes planned and legacy entries', () => {
  const entries = releaseArchiveEntries(changelog, '99.1.0', []);
  expect(entries.map(({ tag }) => tag)).toEqual(['v99.1.0', 'v99.0.0-rc.1']);
  expect(entries[0].body).toBe(`${current}\n`);
  expect(entries[1].prerelease).toBe(true);
});

it('retains the archived copy of any existing GitHub release', () => {
  expect(releaseArchiveEntries(changelog, '99.1.0', [{ tag: 'v99.0.0-rc.1' }]).map(({ tag }) => tag))
    .toEqual(['v99.1.0']);
  expect(releaseArchiveEntries(changelog, '20.5.0', [])).toEqual([]);
});
