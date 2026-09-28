import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// The canonical-sync lane rewrites the user guides when generated counts change,
// so its own commit becomes the newest commit for those files and for the repo.
// Deriving sitemap dates from that commit makes every canonical-sync PR
// unreproducible: the committed sitemap is dated by the pre-sync history, while a
// regenerated one is dated by the sync commit itself. Ignore sync-lane subjects
// so these dates describe the last substantive change and stay byte-stable on
// both sides of the sync commit.
export const CANONICAL_SYNC_SUBJECT_PATTERNS = [
  'synchronize canonical repository state',
  'sync repo state',
];

export function isCanonicalSyncSubject(subject) {
  const value = String(subject || '');
  return CANONICAL_SYNC_SUBJECT_PATTERNS.some((pattern) => value.includes(pattern));
}

function syncExclusionArgs() {
  return CANONICAL_SYNC_SUBJECT_PATTERNS.flatMap((pattern) => ['--invert-grep', `--grep=${pattern}`]);
}

function readLog(args, options) {
  return execFileSync('git', args, { ...options, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function readPublishedDocDates() {
  const sitemap = path.join(root, 'apps/web-app/public/sitemap.xml');
  if (!fs.existsSync(sitemap)) return new Map();
  const xml = fs.readFileSync(sitemap, 'utf8');
  return new Map([...xml.matchAll(/<loc>https:\/\/aaskills\.tech\/docs\/([^<]+)\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)]
    .map(([, slug, date]) => [slug, date]));
}

export function readLastModifiedDate(sourcePath, options = {}) {
  const cwd = options.cwd || root;
  const gitOptions = { cwd, encoding: 'utf8' };
  const filtered = readLog(
    ['log', '-1', ...syncExclusionArgs(), '--format=%cI', '--', sourcePath],
    gitOptions,
  );
  if (filtered) {
    return filtered;
  }
  return readLog(['log', '-1', '--format=%cI', '--', sourcePath], gitOptions);
}

export function readReproducibleLastmod(options = {}) {
  const cwd = options.cwd || root;
  const fallback = options.fallback || new Date().toISOString().slice(0, 10);
  const gitOptions = { cwd, encoding: 'utf8' };
  try {
    const filtered = readLog(['log', '-1', ...syncExclusionArgs(), '--format=%cs'], gitOptions);
    if (filtered) {
      return filtered;
    }
    const unfiltered = readLog(['log', '-1', '--format=%cs'], gitOptions);
    if (unfiltered) {
      return unfiltered;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function getDocsMetadata() {
  const docs = JSON.parse(fs.readFileSync(path.join(root, 'apps/web-app/src/data/docs.json'), 'utf8'));
  let commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.AAS_SOURCE_COMMIT;
  try {
    commit = readLog(['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  } catch {
    if (!commit) throw new Error('Missing Git commit identity for Docs metadata');
  }
  const publishedDates = readPublishedDocDates();
  return Object.fromEntries(docs.map((doc) => {
    const sourcePath = `docs/users/${doc.slug}.md`;
    let modified;
    try {
      modified = readLastModifiedDate(sourcePath, { cwd: root });
    } catch {
      modified = publishedDates.get(doc.slug);
    }
    if (!modified || Number.isNaN(Date.parse(modified))) {
      throw new Error(`Missing Git history for ${sourcePath}`);
    }
    return [doc.slug, { commit, modified, sourcePath }];
  }));
}
