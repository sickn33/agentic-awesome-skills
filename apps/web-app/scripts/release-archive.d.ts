import archive from '../src/data/releases.json';

export function releaseArchiveEntries(
  changelog: string,
  currentVersion: string,
  archivedReleases: typeof archive.releases,
): typeof archive.releases;
