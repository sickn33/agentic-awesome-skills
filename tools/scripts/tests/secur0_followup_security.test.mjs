import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { verifyClaim } = await import(
  pathToFileURL(path.join(root, 'skills/vercel-optimize/lib/verify-claim.mjs')).href
);

const temporary = await mkdtemp(path.join(os.tmpdir(), 'aas-vercel-claim-'));
const repoRoot = path.join(temporary, 'repo');
const outside = path.join(temporary, 'outside.txt');

try {
  await mkdir(repoRoot);
  await writeFile(path.join(repoRoot, 'inside.txt'), 'safe', 'utf8');
  await writeFile(outside, 'secret', 'utf8');
  await symlink(outside, path.join(repoRoot, 'escape-link'));

  assert.equal((await verifyClaim({ type: 'file_exists', repoRoot, file: 'inside.txt' })).disposition, 'verified');
  assert.equal((await verifyClaim({ type: 'file_exists', repoRoot, file: outside })).disposition, 'failed');
  assert.equal((await verifyClaim({ type: 'file_exists', repoRoot, file: '../outside.txt' })).disposition, 'failed');
  assert.equal((await verifyClaim({ type: 'file_exists', repoRoot, file: 'escape-link' })).disposition, 'failed');
} finally {
  await rm(temporary, { recursive: true, force: true });
}

console.log('Secur0 follow-up path-boundary contracts passed.');
