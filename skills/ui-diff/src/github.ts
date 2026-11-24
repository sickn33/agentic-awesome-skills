import { exec } from './exec.js';
import type { RemoteInfo } from './git.js';
import { log, UiDiffError } from './log.js';
import { noUiChangeComment, stickyMarker } from './markdown.js';
import { noUiChange, type Report } from './report.js';

export interface Comment {
  id: number;
  login: string;
  body: string;
  url?: string;
}

export interface PullRequest {
  number: number;
  url: string;
  state: string;
  baseRefName: string;
  headRefName: string;
  headRefOid: string;
  isCrossRepository: boolean;
}

/** Thin, mockable surface over the GitHub CLI. */
export interface GhClient {
  currentLogin(): Promise<string | undefined>;
  listComments(repo: string, pr: number): Promise<Comment[]>;
  createComment(repo: string, pr: number, body: string): Promise<Comment>;
  updateComment(repo: string, id: number, body: string): Promise<Comment>;
}

function hostArgs(host?: string): string[] {
  return host && host !== 'github.com' ? ['--hostname', host] : [];
}

async function gh(args: string[], opts: { input?: string; allowFailure?: boolean } = {}): Promise<{ code: number; stdout: string; stderr: string }> {
  const result = await exec('gh', args, { input: opts.input, allowFailure: true, env: { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' } });
  if (result.code !== 0 && !opts.allowFailure) {
    const detail = result.stderr.trim().split('\n').slice(-2).join(' ');
    throw new UiDiffError(`gh ${args.slice(0, 3).join(' ')} failed: ${detail}`, {
      hint: /auth|login|401|403/i.test(detail) ? 'Run `gh auth login` (or set GH_TOKEN) with access to this repository.' : undefined,
    });
  }
  return result;
}

export function createGhClient(host?: string): GhClient {
  const api = (args: string[], input?: string) => gh(['api', ...hostArgs(host), ...args], { input });
  const toComment = (raw: { id: number; user?: { login?: string }; body?: string; html_url?: string }): Comment => ({
    id: raw.id,
    login: raw.user?.login ?? '',
    body: raw.body ?? '',
    url: raw.html_url,
  });
  return {
    async currentLogin() {
      const result = await gh(['api', ...hostArgs(host), 'user', '--jq', '.login'], { allowFailure: true });
      return result.code === 0 ? result.stdout.trim() || undefined : undefined;
    },
    async listComments(repo, pr) {
      const result = await api(['--paginate', `repos/${repo}/issues/${pr}/comments?per_page=100`, '--jq', '.[] | {id, user: {login: .user.login}, body, html_url}']);
      return result.stdout
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => toComment(JSON.parse(l)));
    },
    async createComment(repo, pr, body) {
      const result = await api(['--method', 'POST', `repos/${repo}/issues/${pr}/comments`, '--input', '-'], JSON.stringify({ body }));
      return toComment(JSON.parse(result.stdout));
    },
    async updateComment(repo, id, body) {
      const result = await api(['--method', 'PATCH', `repos/${repo}/issues/comments/${id}`, '--input', '-'], JSON.stringify({ body }));
      return toComment(JSON.parse(result.stdout));
    },
  };
}

export async function findStickyComment(client: GhClient, repo: string, pr: number, id: string): Promise<Comment | undefined> {
  const marker = stickyMarker(id);
  const comments = (await client.listComments(repo, pr)).filter((c) => c.body.includes(marker));
  if (comments.length === 0) return undefined;
  if (comments.length > 1) log.warn(`found ${comments.length} ui-diff comments with id "${id}" on #${pr}; updating the newest one written by you`);
  const me = await client.currentLogin();
  const mine = comments.filter((c) => me && c.login === me);
  return (mine.length ? mine : comments)[(mine.length ? mine : comments).length - 1];
}

export type PublishDecision = { action: 'comment' } | { action: 'skip'; reason: string } | { action: 'note'; body: string };

/**
 * What publish does with a report. A PR whose changed files include no UI file gets no comment;
 * if an earlier push left one, its top line says so and its last result stays below, collapsed.
 */
export function publishDecision(report: Report, existing: Comment | undefined, opts: { id: string; title: string }): PublishDecision {
  if (!noUiChange(report)) return { action: 'comment' };
  if (!existing) return { action: 'skip', reason: 'no UI files changed and there is no ui-diff comment to update' };
  return { action: 'note', body: noUiChangeComment(report, opts, existing.body) };
}

export type UpsertAction = 'created' | 'updated' | 'unchanged';

/** Creates the sticky comment, or edits the existing one in place. Re-running with the same body is a no-op. */
export async function upsertStickyComment(client: GhClient, opts: { repo: string; pr: number; body: string; existing?: Comment }): Promise<{ action: UpsertAction; comment: Comment }> {
  if (opts.existing) {
    const strip = (s: string) => s.replace(/<!-- ui-diff:meta [^>]*-->/, '').replace(/generated [^·<]*UTC/, '').trim();
    if (strip(opts.existing.body) === strip(opts.body)) return { action: 'unchanged', comment: opts.existing };
    return { action: 'updated', comment: await client.updateComment(opts.repo, opts.existing.id, opts.body) };
  }
  return { action: 'created', comment: await client.createComment(opts.repo, opts.pr, opts.body) };
}

export async function getPullRequest(pr: number, repo?: string): Promise<PullRequest> {
  const args = ['pr', 'view', String(pr), '--json', 'number,url,state,baseRefName,headRefName,headRefOid,isCrossRepository'];
  if (repo) args.push('--repo', repo);
  const result = await gh(args);
  return JSON.parse(result.stdout) as PullRequest;
}

export type Visibility = 'PRIVATE' | 'INTERNAL' | 'PUBLIC';

export interface UploadGuard {
  allowed: boolean;
  visibility?: Visibility;
  reason?: string;
  hint?: string;
  warning?: string;
}

/** Whether screenshots may be pushed to the repository's assets branch. Shared by publish and its dry run. */
export function uploadGuard(visibility: Visibility | undefined, opts: { allowPublic: boolean; assumePrivate: boolean }): UploadGuard {
  if (visibility === 'PUBLIC' && !opts.allowPublic) {
    return {
      allowed: false,
      visibility,
      reason: 'This repository is public, so screenshots on its assets branch would be public too',
      hint: 'Use --no-upload for a text-only comment, or --allow-public-repo if the pages contain nothing sensitive.',
    };
  }
  if (!visibility && !opts.assumePrivate) {
    return {
      allowed: false,
      reason: 'Could not verify that the repository is private (gh could not read its visibility)',
      hint: 'Install the GitHub CLI and run `gh auth login` (or set GH_TOKEN), or pass --assume-private if you are sure only repository members can read it.',
    };
  }
  return { allowed: true, visibility, warning: visibility === 'INTERNAL' ? 'repository is internal: screenshots are visible to every member of the enterprise' : undefined };
}

export async function repoVisibility(remote: RemoteInfo): Promise<Visibility | undefined> {
  const slug = remote.host === 'github.com' ? `${remote.owner}/${remote.repo}` : `${remote.host}/${remote.owner}/${remote.repo}`;
  const result = await gh(['repo', 'view', slug, '--json', 'visibility'], { allowFailure: true });
  if (result.code !== 0) return undefined;
  try {
    return (JSON.parse(result.stdout) as { visibility?: 'PRIVATE' | 'INTERNAL' | 'PUBLIC' }).visibility;
  } catch {
    return undefined;
  }
}

export async function prState(pr: number, repo: string, host?: string): Promise<string | undefined> {
  const result = await gh(['api', ...hostArgs(host), `repos/${repo}/pulls/${pr}`, '--jq', '.state + (if .merged then "-merged" else "" end)'], { allowFailure: true });
  return result.code === 0 ? result.stdout.trim() : undefined;
}
