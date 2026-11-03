import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const repository = 'sickn33/agentic-awesome-skills';
export async function fetchReleases(request = fetch) {
  const releases = [];
  const ids = new Set();
  for (let page = 1; page <= 100; page++) {
    const response = await request(`https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`GitHub releases: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Invalid release response');
    for (const r of batch) {
      if (r.draft) continue;
      if (!Number.isInteger(r.id) || !r.tag_name || !r.published_at || !Number.isFinite(Date.parse(r.published_at)) || !r.html_url?.startsWith(`https://github.com/${repository}/releases/tag/`)) throw new Error('Invalid release record');
      if (ids.has(r.id)) throw new Error('Duplicate release across pages; retry sync');
      ids.add(r.id);
      releases.push({ id: r.id, tag: r.tag_name, name: r.name || r.tag_name, publishedAt: r.published_at, url: r.html_url, prerelease: Boolean(r.prerelease), body: r.body || '' });
    }
    if (batch.length < 100) {
      if (!releases.length) throw new Error('Refusing to replace archive with an empty response');
      return releases.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    }
  }
  throw new Error('Pagination limit reached; archive was not replaced');
}
async function main() {
  const output = fileURLToPath(new URL('../src/data/releases.json', import.meta.url));
  try {
    const releases = await fetchReleases();
    const snapshot = { repository, fetchedAt: new Date().toISOString(), releases };
    await fs.writeFile(`${output}.tmp`, `${JSON.stringify(snapshot, null, 2)}\n`);
    await fs.rename(`${output}.tmp`, output);
    console.log(`Synced ${releases.length} published GitHub releases (${releases[0].tag} to ${releases.at(-1).tag}).`);
  } catch (error) {
    const cache = await fs.readFile(output, 'utf8').then(JSON.parse).catch(() => null);
    if (process.argv.includes('--optional') && cache?.releases?.length) {
      console.warn(`Release refresh failed: ${error.message}. Keeping ${cache.releases.length} cached releases from ${cache.fetchedAt}.`);
    } else { console.error(error.message); process.exitCode = 1; }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
