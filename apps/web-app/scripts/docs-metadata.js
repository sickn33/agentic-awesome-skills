import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export function getDocsMetadata() {
  const docs = JSON.parse(fs.readFileSync(path.join(root, 'apps/web-app/src/data/docs.json'), 'utf8'));
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  return Object.fromEntries(docs.map((doc) => {
    const sourcePath = `docs/users/${doc.slug}.md`;
    const modified = execFileSync('git', ['log', '-1', '--format=%cI', '--', sourcePath], { cwd: root, encoding: 'utf8' }).trim();
    if (!modified || Number.isNaN(Date.parse(modified))) throw new Error(`Missing Git history for ${sourcePath}`);
    return [doc.slug, { commit, modified, sourcePath }];
  }));
}
