#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const DEFAULT_THRESHOLD = '80';
const DEFAULT_WORKSPACE = 'antigravity-awesome-skills';

function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function splitLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getChangedSkillFiles(baseSha, headSha, options = {}) {
  if (!baseSha || !headSha) {
    throw new Error('BASE_SHA and HEAD_SHA are required');
  }

  const git = options.git || runGit;
  const output = git(['diff', '--name-only', '--diff-filter=ACMR', baseSha, headSha, '--']);
  return splitLines(output).filter((filePath) => filePath === 'SKILL.md' || filePath.endsWith('/SKILL.md'));
}

function ensureRepoRelative(filePath, repoRoot = process.cwd()) {
  const resolved = path.resolve(repoRoot, filePath);
  const relative = path.relative(repoRoot, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  if (path.basename(filePath) !== 'SKILL.md') {
    throw new Error(`Unexpected skill file path: ${filePath}`);
  }

  return resolved;
}

function getChangedSkillDirs(files, repoRoot = process.cwd()) {
  const dirs = new Set();

  for (const filePath of files) {
    const resolved = ensureRepoRelative(filePath, repoRoot);
    if (!fs.existsSync(resolved)) {
      continue;
    }
    dirs.add(path.dirname(filePath));
  }

  return [...dirs].sort();
}

function buildReviewArgs(skillDir, options = {}) {
  const workspace = options.workspace || DEFAULT_WORKSPACE;
  const threshold = options.threshold || DEFAULT_THRESHOLD;
  const args = ['review', 'run', skillDir, '--workspace', workspace, '--json', '--threshold', threshold];

  if (options.reviewPlugin) {
    args.push('--review-plugin', options.reviewPlugin);
  }

  if (options.label) {
    args.push('--label', options.label);
  }

  return args;
}

function reviewLabel(prNumber, skillDir) {
  if (!prNumber) {
    return undefined;
  }

  const safeSkill = skillDir.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `pr-${prNumber}-${safeSkill}`;
}

function runTessl(args, options = {}) {
  const result = spawnSync('tessl', args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    throw new Error(`tessl ${args.join(' ')} terminated by signal ${result.signal}`);
  }

  if (result.status !== 0) {
    throw new Error(`tessl ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA || 'HEAD';
  const workspace = process.env.TESSL_WORKSPACE || DEFAULT_WORKSPACE;
  const threshold = process.env.TESSL_REVIEW_THRESHOLD || DEFAULT_THRESHOLD;
  const reviewPlugin = process.env.TESSL_REVIEW_PLUGIN;
  const prNumber = process.env.PR_NUMBER;

  const files = getChangedSkillFiles(baseSha, headSha);
  const skillDirs = getChangedSkillDirs(files);

  if (skillDirs.length === 0) {
    console.log('No changed SKILL.md files to review.');
    return;
  }

  for (const skillDir of skillDirs) {
    const label = reviewLabel(prNumber, skillDir);
    const args = buildReviewArgs(skillDir, {
      label,
      reviewPlugin,
      threshold,
      workspace,
    });
    console.log(`Running Tessl Review for ${skillDir}`);
    runTessl(args);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildReviewArgs,
  ensureRepoRelative,
  getChangedSkillDirs,
  getChangedSkillFiles,
  reviewLabel,
};
