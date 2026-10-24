'use strict';

const { execFileSync } = require('node:child_process');

const REPOSITORY = 'sickn33/agentic-awesome-skills';
const SHA = /^[0-9a-f]{40}$/;

function readEntry(repo, ref, file) {
  const raw = execFileSync('git', ['ls-tree', '-z', ref, '--', file], {
    cwd: repo, timeout: 10_000, encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
  const rows = raw.split('\0').filter(Boolean);
  if (rows.length !== 1) return null;
  const match = /^(\d{6}) blob ([0-9a-f]{40})\t(.+)$/.exec(rows[0]);
  return match && match[3] === file ? { mode: match[1], oid: match[2] } : null;
}

function sourcePath(file) {
  const match = /^plugins\/(?:agentic-awesome-skills|agentic-awesome-skills-claude)\/(skills\/(?:[a-z0-9][a-z0-9._-]*\/)+package-lock\.json)$/.exec(file || '');
  if (!match || match[1].split('/').some(part => part === '.' || part === '..')) return null;
  return match[1];
}

// This is not fork execution or merge approval. It recognizes an inert exact
// replica only; owner review, full validation and strict main protection remain.
function resolveMirrorLockfileRepairs(repo, base, head, records, pr, dependencies = {}) {
  if (!SHA.test(base) || !SHA.test(head)) throw new Error('Immutable Git endpoints required');
  if (pr?.base?.repo?.full_name !== REPOSITORY || pr?.head?.repo?.full_name !== REPOSITORY
      || pr?.user?.login !== REPOSITORY.split('/')[0]
      || pr?.base?.sha !== base || pr?.head?.sha !== head) return [];
  const entry = dependencies.readEntry || ((ref, file) => readEntry(repo, ref, file));
  const regular = value => value?.mode === '100644' && SHA.test(value.oid);
  const accepted = [];
  for (const record of records) {
    const file = record.new_path;
    const canonical = sourcePath(file);
    if (!canonical || record.status !== 'M' || record.old_path !== file
        || record.old_mode !== '100644' || record.new_mode !== '100644') continue;
    const oldMirror = entry(base, file), newMirror = entry(head, file);
    const oldSource = entry(base, canonical), newSource = entry(head, canonical);
    const manifest = canonical.replace(/package-lock\.json$/, 'package.json');
    const mirrorManifest = file.replace(/package-lock\.json$/, 'package.json');
    const oldManifest = entry(base, manifest), newManifest = entry(head, manifest);
    const mirrorPackage = entry(head, mirrorManifest);
    const root = canonical.split('/').slice(0, 2).join('/') + '/SKILL.md';
    if (![oldMirror, newMirror, oldSource, newSource, oldManifest, newManifest,
      mirrorPackage, entry(base, root), entry(head, root)].every(regular)) continue;
    if (oldMirror.oid !== record.old_oid || newMirror.oid !== record.new_oid
        || newMirror.oid !== newSource.oid || oldManifest.oid !== newManifest.oid
        || mirrorPackage.oid !== newManifest.oid) continue;
    accepted.push({ path: file, canonical, lockfileOid: newSource.oid,
      manifestOid: newManifest.oid, baseOid: base, headOid: head });
  }
  return accepted;
}

module.exports = { resolveMirrorLockfileRepairs, sourcePath };
