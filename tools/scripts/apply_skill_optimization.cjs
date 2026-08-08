#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REVIEW_HEADING = '## Tessl Skill Review';
const TRUSTED_AUTHOR_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const DEFAULT_ALLOWED_REVIEW_BOT_LOGINS = ['github-actions[bot]'];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function githubRequest(pathname, options = {}) {
  const token = getRequiredEnv('GITHUB_TOKEN');
  const response = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'agentic-awesome-skills/apply-skill-optimization',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${pathname} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

function extractKeyImprovements(body) {
  const section = body.match(/\*\*Key improvements:\*\*\n((?:- .+\n?)+)/);
  if (!section) {
    return [];
  }

  return [...section[1].matchAll(/^- (.+)$/gm)].map((match) => match[1]);
}

function extractOptimizedContent(body) {
  const sections = new Map();
  const normalized = body.replace(/\r\n/g, '\n');
  const regex =
    /### `([^`]+)`[\s\S]*?View full optimized SKILL\.md[\s\S]*?```markdown\n([\s\S]*?)\n```/g;

  let match;
  while ((match = regex.exec(normalized)) !== null) {
    const skillPath = match[1];
    const content = match[2].replace(/` ` `/g, '```');
    sections.set(skillPath, content);
  }

  return sections;
}

function ensureRepoRelative(filePath) {
  const cwd = process.cwd();
  const resolved = path.resolve(cwd, filePath);
  const relative = path.relative(cwd, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  if (!filePath.endsWith('SKILL.md')) {
    throw new Error(`Unexpected file path (expected SKILL.md): ${filePath}`);
  }

  return resolved;
}

function parseAllowedReviewBotLogins(envValue = process.env.APPLY_OPTIMIZE_ALLOWED_REVIEW_BOT_LOGINS) {
  if (!envValue) {
    return DEFAULT_ALLOWED_REVIEW_BOT_LOGINS;
  }

  const logins = envValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return logins.length > 0 ? logins : DEFAULT_ALLOWED_REVIEW_BOT_LOGINS;
}

function isTrustedReviewComment(comment, allowedBotLogins = DEFAULT_ALLOWED_REVIEW_BOT_LOGINS) {
  if (!comment?.body || !comment.body.includes(REVIEW_HEADING)) {
    return false;
  }

  if (TRUSTED_AUTHOR_ASSOCIATIONS.has(comment.author_association)) {
    return true;
  }

  const login = comment.user?.login;
  const userType = comment.user?.type;
  return Boolean(login && userType === 'Bot' && allowedBotLogins.includes(login));
}

function selectLatestTrustedReviewComment(comments, allowedBotLogins = DEFAULT_ALLOWED_REVIEW_BOT_LOGINS) {
  let latest = null;

  for (const comment of comments) {
    if (isTrustedReviewComment(comment, allowedBotLogins)) {
      latest = comment;
    }
  }

  return latest;
}

async function findLatestTrustedReviewComment(owner, repo, prNumber, allowedBotLogins) {
  let page = 1;
  let latest = null;

  while (true) {
    const comments = await githubRequest(
      `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`,
    );

    latest = selectLatestTrustedReviewComment(comments, allowedBotLogins) ?? latest;

    if (comments.length < 100) {
      return latest;
    }

    page += 1;
  }
}

async function postComment(owner, repo, prNumber, body) {
  await githubRequest(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
}

async function main() {
  const repoSlug = getRequiredEnv('GITHUB_REPOSITORY');
  const [owner, repo] = repoSlug.split('/');
  const prNumber = process.env.PR_NUMBER || JSON.parse(
    fs.readFileSync(getRequiredEnv('GITHUB_EVENT_PATH'), 'utf8'),
  ).inputs?.pr_number;

  if (!prNumber) {
    throw new Error('PR_NUMBER or workflow_dispatch input pr_number is required');
  }

  const pr = await githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  const allowedReviewBotLogins = parseAllowedReviewBotLogins();

  if (pr.head.repo.full_name !== repoSlug) {
    throw new Error(
      'Auto-apply is only supported for PR branches that live in the base repository.',
    );
  }

  const reviewComment = await findLatestTrustedReviewComment(
    owner,
    repo,
    prNumber,
    allowedReviewBotLogins,
  );
  if (!reviewComment || !reviewComment.body) {
    throw new Error(
      'No trusted Tessl skill review comment found on this PR. Run the review first.',
    );
  }

  const optimizedFiles = extractOptimizedContent(reviewComment.body);
  if (optimizedFiles.size === 0) {
    throw new Error('No optimized SKILL.md content found in the latest Tessl review comment.');
  }

  const branch = pr.head.ref;
  console.log(`Applying optimization to PR #${prNumber} on ${branch}`);

  runGit(['fetch', 'origin', branch]);
  runGit(['checkout', '-B', branch, `origin/${branch}`]);

  for (const [filePath, content] of optimizedFiles.entries()) {
    const resolved = ensureRepoRelative(filePath);
    fs.writeFileSync(resolved, content);
    console.log(`Updated ${filePath}`);
  }

  runGit(['config', 'user.name', 'tessl-skill-review[bot]']);
  runGit(['config', 'user.email', 'skill-review[bot]@users.noreply.github.com']);
  runGit(['add', ...optimizedFiles.keys()]);

  let committed = true;
  try {
    runGit(['commit', '-m', 'Apply optimized SKILL.md from Tessl review']);
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`;
    if (output.includes('nothing to commit')) {
      committed = false;
    } else {
      throw error;
    }
  }

  if (!committed) {
    await postComment(
      owner,
      repo,
      prNumber,
      '⚠️ No changes to apply. The PR branch already matches the latest Tessl optimization.',
    );
    return;
  }

  runGit(['push', 'origin', `HEAD:${branch}`]);

  const shortSha = runGit(['rev-parse', '--short', 'HEAD']).trim();
  const updatedFiles = [...optimizedFiles.keys()].map((item) => `\`${item}\``).join(', ');
  const improvements = extractKeyImprovements(reviewComment.body);

  let body = `✅ Applied optimized ${updatedFiles} (${shortSha}).`;
  if (improvements.length > 0) {
    body += '\n\n**What changed:**';
    for (const item of improvements.slice(0, 3)) {
      body += `\n- ${item}`;
    }
  }

  await postComment(owner, repo, prNumber, body);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_ALLOWED_REVIEW_BOT_LOGINS,
  REVIEW_HEADING,
  findLatestTrustedReviewComment,
  isTrustedReviewComment,
  parseAllowedReviewBotLogins,
  selectLatestTrustedReviewComment,
};
