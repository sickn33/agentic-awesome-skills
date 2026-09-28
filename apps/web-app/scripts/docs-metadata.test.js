import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CANONICAL_SYNC_SUBJECT_PATTERNS,
  isCanonicalSyncSubject,
  readLastModifiedDate,
  readReproducibleLastmod,
  getDocsMetadata,
} from './docs-metadata.js';

function git(cwd, args, env = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      ...env,
    },
  });
}

function initRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-docs-metadata-'));
  git(dir, ['init', '-q']);
  return dir;
}

function commitFile(dir, relativePath, contents, subject, date) {
  const absolute = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents);
  git(dir, ['add', relativePath]);
  return git(dir, ['commit', '-qm', subject], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
}

describe('canonical-sync version metadata', () => {
  it('uses versioned sitemap dates when Vercel has no Git checkout', () => {
    const previousGitDir = process.env.GIT_DIR;
    const previousCommit = process.env.VERCEL_GIT_COMMIT_SHA;
    try {
      process.env.GIT_DIR = '/nonexistent';
      process.env.VERCEL_GIT_COMMIT_SHA = '0123456789abcdef0123456789abcdef01234567';
      const metadata = getDocsMetadata();
      expect(metadata['getting-started'].commit).toBe(process.env.VERCEL_GIT_COMMIT_SHA);
      expect(metadata['getting-started'].modified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    } finally {
      if (previousGitDir === undefined) delete process.env.GIT_DIR;
      else process.env.GIT_DIR = previousGitDir;
      if (previousCommit === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
      else process.env.VERCEL_GIT_COMMIT_SHA = previousCommit;
    }
  });
  it('classifies canonical-sync commit subjects', () => {
    expect(isCanonicalSyncSubject('chore: synchronize canonical repository state')).toBe(true);
    expect(isCanonicalSyncSubject('[skip pages] chore: synchronize canonical repository state')).toBe(true);
    expect(isCanonicalSyncSubject('chore: sync repo state [ci skip]')).toBe(true);
    expect(isCanonicalSyncSubject('fix: align AAS Core public narrative')).toBe(false);
    expect(isCanonicalSyncSubject('')).toBe(false);
  });

  it('covers the sync subjects the canonical lane emits', () => {
    expect(CANONICAL_SYNC_SUBJECT_PATTERNS).toEqual(
      expect.arrayContaining(['synchronize canonical repository state', 'sync repo state']),
    );
  });

  it('ignores the canonical-sync commit when dating a rewritten guide', () => {
    const dir = initRepo();
    try {
      commitFile(dir, 'docs/users/usage.md', 'count 1\n', 'fix: align guide', '2026-01-01T00:00:00Z');
      const authored = readLastModifiedDate('docs/users/usage.md', { cwd: dir });
      expect(authored.slice(0, 10)).toBe('2026-01-01');

      commitFile(
        dir,
        'docs/users/usage.md',
        'count 2\n',
        'chore: synchronize canonical repository state',
        '2026-03-03T00:00:00Z',
      );
      const afterSync = readLastModifiedDate('docs/users/usage.md', { cwd: dir });
      expect(afterSync.slice(0, 10)).toBe('2026-01-01');
      expect(afterSync).toBe(authored);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('falls back to any commit when every commit is a sync commit', () => {
    const dir = initRepo();
    try {
      commitFile(
        dir,
        'docs/users/usage.md',
        'count 1\n',
        'chore: synchronize canonical repository state',
        '2026-02-02T00:00:00Z',
      );
      expect(readLastModifiedDate('docs/users/usage.md', { cwd: dir }).slice(0, 10)).toBe('2026-02-02');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('derives the default lastmod from history, not the wall clock', () => {
    const dir = initRepo();
    try {
      commitFile(dir, 'README.md', 'x\n', 'docs: initial', '2026-04-04T00:00:00Z');
      expect(readReproducibleLastmod({ cwd: dir })).toBe('2026-04-04');
      commitFile(
        dir,
        'README.md',
        'y\n',
        'chore: synchronize canonical repository state',
        '2026-05-05T00:00:00Z',
      );
      expect(readReproducibleLastmod({ cwd: dir })).toBe('2026-04-04');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
