import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exec } from './exec.js';
import { git, parseRemoteUrl, remoteUrl, type RemoteInfo } from './git.js';
import { log, UiDiffError } from './log.js';

/**
 * Publishes images to an orphan branch of the same repository using git plumbing only: a temporary
 * index file and a private ref, so the user's working tree, index and branches are never touched.
 * By default the branch is a single commit replaced on each publish (force-with-lease), which keeps
 * clones small; files of other PRs are carried over so their links keep working.
 */

const TIP_REF = 'refs/ui-diff/assets-tip';
const BRANCH_README = `# ui-diff assets

This orphan branch is written by ui-diff. It holds before/after screenshots referenced by
pull-request comments, under \`pr-<number>/\`. It has no shared history with the main code.

- Visibility follows the repository: only people who can read this repo can load the images.
- Safe to delete at any time (old PR comments will show broken images).
- \`ui-diff prune --closed\` removes images of closed PRs.
`;

export interface AssetFile {
  local: string;
  dest: string;
}

export interface PublishOptions {
  repoRoot: string;
  remote: string;
  branch: string;
  /** Directory for this run, e.g. `pr-12/default/20261118T1200-1a2b3c4`. */
  runDir: string;
  /** Parent of run directories for this PR/comment, e.g. `pr-12/default`. Older runs beyond keepRuns are removed. */
  groupDir: string;
  keepRuns: number;
  files: AssetFile[];
  message: string;
  history?: 'squash' | 'append';
}

export interface PublishResult {
  commit?: string;
  pushed: boolean;
  added: string[];
  removed: string[];
}

function identityEnv(): NodeJS.ProcessEnv {
  return {
    GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'ui-diff',
    GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'ui-diff@users.noreply.github.com',
    GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'ui-diff',
    GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || 'ui-diff@users.noreply.github.com',
  };
}

/** Whether `refs/heads/<branch>` exists on the remote; throws when the remote cannot be read at all. */
async function remoteHasBranch(repo: string, remote: string, branch: string): Promise<boolean> {
  const ref = `refs/heads/${branch}`;
  // --exit-code: 2 means the remote answered and has no such ref; anything else non-zero is an access or network error.
  const result = await exec('git', ['ls-remote', '--exit-code', remote, ref], { cwd: repo, allowFailure: true });
  if (result.code === 2) return false;
  if (result.code !== 0) throw remoteReadError(remote, branch, result.stderr);
  return result.stdout.split('\n').some((line) => line.split('\t')[1] === ref);
}

function redactUrlCredentials(text: string): string {
  return text.replace(/(\w+:\/\/)[^/@\s]+@/g, '$1***@');
}

function remoteReadError(remote: string, branch: string, stderr: string): UiDiffError {
  const detail = stderr
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^please make sure|^and the repository exists/i.test(l))
    .slice(-2)
    .join(' ');
  const access = /not found|permission denied|authentication failed|could not read (username|password)|\b40[13]\b|access denied|terminal prompts disabled/i.test(stderr);
  return new UiDiffError(`Could not read ${branch} from ${remote}: ${redactUrlCredentials(detail) || 'git exited with an error'}`, {
    hint: access
      ? `git could not access ${remote} with your credentials. Check that \`git ls-remote ${remote}\` works (HTTPS: \`gh auth setup-git\` or a credential helper; SSH: your key). Publishing needs push access.`
      : `Check your network and that \`git ls-remote ${remote}\` works.`,
    exitCode: access ? 3 : 1,
  });
}

async function fetchTip(repo: string, remote: string, branch: string): Promise<string | undefined> {
  if (!(await remoteHasBranch(repo, remote, branch))) return undefined;
  const result = await exec('git', ['fetch', '--no-tags', '--quiet', remote, `+refs/heads/${branch}:${TIP_REF}`], { cwd: repo, allowFailure: true });
  if (result.code !== 0) {
    // Deleted between ls-remote and fetch: publish as if it never existed (the push lease still guards).
    if (!(await remoteHasBranch(repo, remote, branch))) return undefined;
    throw remoteReadError(remote, branch, result.stderr);
  }
  return (await git(['rev-parse', TIP_REF], { cwd: repo })).trim();
}

/** Run directories under `groupDir` to delete so that, after adding one more, `keepRuns` remain. */
export function runsToRemove(paths: string[], groupDir: string, keepRuns: number): string[] {
  const prefix = `${groupDir.replace(/\/$/, '')}/`;
  const runs = new Set<string>();
  for (const p of paths) {
    if (!p.startsWith(prefix)) continue;
    const run = p.slice(prefix.length).split('/')[0];
    if (run && p.slice(prefix.length).includes('/')) runs.add(run);
  }
  const sorted = [...runs].sort();
  const keep = Math.max(0, keepRuns - 1);
  return sorted.slice(0, Math.max(0, sorted.length - keep)).map((r) => `${prefix}${r}`);
}

async function withTempIndex<T>(fn: (env: NodeJS.ProcessEnv) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ui-diff-index-'));
  try {
    return await fn({ ...process.env, ...identityEnv(), GIT_INDEX_FILE: path.join(dir, 'index') });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

interface TreeEdit {
  add: AssetFile[];
  removeDirs: (paths: string[]) => string[];
}

async function buildCommit(repo: string, parent: string | undefined, edit: TreeEdit, message: string, history: 'squash' | 'append'): Promise<{ commit?: string; added: string[]; removed: string[] }> {
  return withTempIndex(async (env) => {
    if (parent) await git(['read-tree', parent], { cwd: repo, env });
    else await git(['read-tree', '--empty'], { cwd: repo, env });
    const existing = (await git(['ls-files', '-z', '--cached'], { cwd: repo, env })).split('\0').filter(Boolean);
    const removeDirs = edit.removeDirs(existing);
    const removed = existing.filter((p) => removeDirs.some((d) => p === d || p.startsWith(`${d}/`)));
    const lines: string[] = removed.map((p) => `0 ${'0'.repeat(40)}\t${p}`);
    const files = [...edit.add];
    if (!existing.includes('README.md')) files.push({ local: '', dest: 'README.md' });
    const realFiles = files.filter((f) => f.local);
    const shas = realFiles.length
      ? (await git(['hash-object', '-w', '--stdin-paths'], { cwd: repo, input: realFiles.map((f) => f.local).join('\n') + '\n' })).split('\n').filter(Boolean)
      : [];
    realFiles.forEach((f, i) => lines.push(`100644 blob ${shas[i]}\t${f.dest}`));
    if (files.some((f) => f.dest === 'README.md' && !f.local)) {
      const readme = (await git(['hash-object', '-w', '--stdin'], { cwd: repo, input: BRANCH_README })).trim();
      lines.push(`100644 blob ${readme}\tREADME.md`);
    }
    if (lines.length) await git(['update-index', '--index-info'], { cwd: repo, env, input: lines.join('\n') + '\n' });
    const tree = (await git(['write-tree'], { cwd: repo, env })).trim();
    if (parent) {
      const parentTree = (await git(['rev-parse', `${parent}^{tree}`], { cwd: repo })).trim();
      if (parentTree === tree) return { added: [], removed: [] };
    }
    const args = ['commit-tree', tree, '-m', message];
    if (parent && history === 'append') args.push('-p', parent);
    const commit = (await git(args, { cwd: repo, env })).trim();
    return { commit, added: realFiles.map((f) => f.dest), removed };
  });
}

async function pushCommit(repo: string, remote: string, branch: string, commit: string, parent: string | undefined, history: 'squash' | 'append'): Promise<'ok' | 'stale'> {
  const args = ['push', '--quiet', remote, `${commit}:refs/heads/${branch}`];
  if (history === 'squash') args.splice(1, 0, `--force-with-lease=refs/heads/${branch}:${parent ?? ''}`);
  const result = await exec('git', args, { cwd: repo, allowFailure: true });
  if (result.code === 0) return 'ok';
  if (/stale info|rejected|non-fast-forward|fetch first/i.test(result.stderr)) return 'stale';
  throw new UiDiffError(`git push to ${branch} failed: ${redactUrlCredentials(result.stderr.trim().split('\n').slice(-3).join(' '))}`, {
    hint: 'Publishing needs push access to this repository. Without it, use --no-upload (text-only comment) or attach images manually.',
    exitCode: 3,
  });
}

async function commitAndPush(repo: string, opts: { remote: string; branch: string; message: string; history: 'squash' | 'append'; edit: TreeEdit }): Promise<PublishResult> {
  try {
    for (let attempt = 1; attempt <= 4; attempt++) {
      const parent = await fetchTip(repo, opts.remote, opts.branch);
      const built = await buildCommit(repo, parent, opts.edit, opts.message, opts.history);
      if (!built.commit) return { pushed: false, added: [], removed: [] };
      const status = await pushCommit(repo, opts.remote, opts.branch, built.commit, parent, opts.history);
      if (status === 'ok') return { commit: built.commit, pushed: true, added: built.added, removed: built.removed };
      log.warn(`${opts.branch} moved while publishing; retrying (${attempt}/4)`);
    }
    throw new UiDiffError(`Could not update ${opts.branch}: it kept changing during publish`);
  } finally {
    await exec('git', ['update-ref', '-d', TIP_REF], { cwd: repo, allowFailure: true });
  }
}

export async function publishToBranch(opts: PublishOptions): Promise<PublishResult> {
  return commitAndPush(opts.repoRoot, {
    remote: opts.remote,
    branch: opts.branch,
    message: opts.message,
    history: opts.history ?? 'squash',
    edit: { add: opts.files.map((f) => ({ local: f.local, dest: `${opts.runDir}/${f.dest}` })), removeDirs: (paths) => runsToRemove(paths, opts.groupDir, opts.keepRuns) },
  });
}

/** Removes the `pr-<n>/` directories of the given PRs from the assets branch. */
export async function pruneBranch(opts: { repoRoot: string; remote: string; branch: string; prs: number[]; history?: 'squash' | 'append' }): Promise<PublishResult> {
  const chosen = new Set(opts.prs);
  return commitAndPush(opts.repoRoot, {
    remote: opts.remote,
    branch: opts.branch,
    message: `ui-diff: prune ${opts.prs.map((n) => `#${n}`).join(', ')}`,
    history: opts.history ?? 'squash',
    edit: {
      add: [],
      removeDirs: (paths) =>
        [...new Set(paths.map((p) => /^pr-(\d+)\//.exec(p)?.[1]).filter((n): n is string => Boolean(n)))].filter((n) => chosen.has(Number(n))).map((n) => `pr-${n}`),
    },
  });
}

export async function listAssetPrs(repo: string, remote: string, branch: string): Promise<number[]> {
  const tip = await fetchTip(repo, remote, branch);
  try {
    if (!tip) return [];
    const out = await git(['ls-tree', '--name-only', tip], { cwd: repo });
    return out
      .split('\n')
      .map((n) => /^pr-(\d+)$/.exec(n.trim())?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);
  } finally {
    await exec('git', ['update-ref', '-d', TIP_REF], { cwd: repo, allowFailure: true });
  }
}

export function encodePath(p: string): string {
  return p.split('/').map(encodeURIComponent).join('/');
}

/** Link prefix for files on the branch. github.com/<o>/<r>/raw/<branch>/… renders for signed-in readers of private repos. */
export function linkBaseFor(remote: RemoteInfo, branch: string, override?: string): string {
  if (override) return override.replace(/\/$/, '');
  return `https://${remote.host}/${remote.owner}/${remote.repo}/raw/${encodePath(branch)}`;
}

export async function resolveRemote(repoRoot: string, remote: string): Promise<{ url?: string; info?: RemoteInfo }> {
  const url = await remoteUrl(remote, repoRoot);
  return { url, info: url ? parseRemoteUrl(url) : undefined };
}
