import releaseChangelog from '../../../tools/scripts/release_changelog.cjs';
import workflowContract from '../../../tools/lib/workflow-contract.js';

const { validateReleaseChangelog } = releaseChangelog;
const { extractChangelogSection } = workflowContract;

export function releaseArchiveEntries(changelog, currentVersion, archive) {
  const headings = [...changelog.matchAll(/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2}) - "([^"]+)"\r?$/gm)];
  const current = headings.findIndex(([, version]) => version === currentVersion);
  if (current < 0) return [];

  const archivedTags = new Set(archive.map(({ tag }) => tag));
  // The immutable site candidate is built before the GitHub Release exists.
  // Use the same source section as publication and keep the historical archive.
  return headings.slice(current).flatMap(([, version, date, name], index) => {
    const tag = `v${version}`;
    if (archivedTags.has(tag)) return [];
    const body = extractChangelogSection(changelog, version);
    try {
      validateReleaseChangelog(body, version);
    } catch {
      return [];
    }
    return [{
      id: -(index + 1),
      tag,
      name,
      publishedAt: `${date}T00:00:00Z`,
      url: `https://github.com/sickn33/agentic-awesome-skills/releases/tag/${tag}`,
      prerelease: version.split('+')[0].includes('-'),
      body,
    }];
  });
}
