#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const DEFAULT_THRESHOLD = '80';
const DEFAULT_WORKSPACE = 'antigravity-awesome-skills';
const DEFAULT_CACHE_VERSION = '2';
const QUOTA_EXIT_CODE = 75;

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
  const output = git(['diff', '--name-only', '--no-renames', '--diff-filter=ACDMR', baseSha, headSha, '--']);
  return splitLines(output).filter((filePath) => filePath.startsWith('skills/') || filePath.startsWith('plugins/'));
}

function ensureRepoRelative(filePath, repoRoot = process.cwd()) {
  const resolved = path.resolve(repoRoot, filePath);
  const relative = path.relative(repoRoot, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }

  return resolved;
}

function getChangedSkillDirs(files, repoRoot = process.cwd()) {
  const dirs = new Set();

  for (const filePath of files) {
    let directory = path.dirname(ensureRepoRelative(filePath, repoRoot));
    while (directory !== repoRoot && directory.startsWith(`${repoRoot}${path.sep}`)) {
      if (fs.existsSync(path.join(directory, 'SKILL.md'))) {
        dirs.add(path.relative(repoRoot, directory).split(path.sep).join('/'));
        break;
      }
      directory = path.dirname(directory);
    }
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

function reviewFingerprint(skillDirs, options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const hash = crypto.createHash('sha256');
  const policy = {
    cacheVersion: options.cacheVersion || DEFAULT_CACHE_VERSION,
    reviewPlugin: options.reviewPlugin || '',
    threshold: options.threshold || DEFAULT_THRESHOLD,
    workspace: options.workspace || DEFAULT_WORKSPACE,
  };

  hash.update(`${JSON.stringify(policy)}\0`);
  for (const skillDir of [...skillDirs].sort()) {
    const skillPath = ensureRepoRelative(skillDir, repoRoot);
    hash.update(`${skillDir}\0`);
    const files = [];
    function visit(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const absolute = path.join(directory, entry.name);
        const stat = fs.lstatSync(absolute);
        if (stat.isSymbolicLink()) throw new Error(`Symlink is not reviewable: ${path.relative(repoRoot, absolute)}`);
        if (entry.isDirectory()) visit(absolute);
        else if (entry.isFile()) files.push({ absolute, stat });
        else throw new Error(`Non-regular skill content is not reviewable: ${path.relative(repoRoot, absolute)}`);
      }
    }
    visit(skillPath);
    for (const { absolute, stat } of files) {
      const relative = path.relative(repoRoot, absolute).split(path.sep).join('/');
      hash.update(`${relative}\0file\0${(stat.mode & 0o7777).toString(8)}\0`);
      hash.update(fs.readFileSync(absolute));
      hash.update('\0');
    }
  }

  return hash.digest('hex');
}

function isQuotaFailure(output) {
  const message = String(output || '');
  return (
    /\b(?:credit|credits|quota|allowance)\b[\s\S]{0,160}\b(?:depleted|exhausted|exceeded|insufficient|limit|reached|remaining|available)\b/iu.test(message) ||
    /\b(?:depleted|exhausted|exceeded|insufficient|limit|reached)\b[\s\S]{0,160}\b(?:credit|credits|quota|allowance)\b/iu.test(message)
  );
}

function appendGitHubOutput(name, value, outputPath = process.env.GITHUB_OUTPUT) {
  if (!outputPath) {
    return;
  }
  fs.appendFileSync(outputPath, `${name}=${value}\n`);
}

function writePlan(skillDirs, options = {}) {
  const hasSkills = skillDirs.length > 0;
  const fingerprint = hasSkills ? reviewFingerprint(skillDirs, options) : 'none';
  const plan = {
    fingerprint,
    hasSkills,
    skillCount: skillDirs.length,
  };

  appendGitHubOutput('fingerprint', fingerprint, options.githubOutput);
  appendGitHubOutput('has-skills', String(hasSkills), options.githubOutput);
  appendGitHubOutput('skill-count', String(skillDirs.length), options.githubOutput);
  console.log(JSON.stringify(plan));
  return plan;
}

function runTessl(args, options = {}) {
  const result = spawnSync('tessl', args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    throw new Error(`tessl ${args.join(' ')} terminated by signal ${result.signal}`);
  }

  if (result.status !== 0) {
    const error = new Error(`tessl ${args.join(' ')} failed with exit code ${result.status}`);
    error.exitCode = result.status;
    error.quotaFailure = isQuotaFailure(`${result.stdout || ''}\n${result.stderr || ''}`);
    throw error;
  }
}

function main() {
  const baseSha = process.env.BASE_SHA;
  const headSha = process.env.HEAD_SHA || 'HEAD';
  const workspace = process.env.TESSL_WORKSPACE || DEFAULT_WORKSPACE;
  const threshold = process.env.TESSL_REVIEW_THRESHOLD || DEFAULT_THRESHOLD;
  const reviewPlugin = process.env.TESSL_REVIEW_PLUGIN;
  const prNumber = process.env.PR_NUMBER;
  const planOnly = process.argv.includes('--plan');

  const files = getChangedSkillFiles(baseSha, headSha);
  const skillDirs = getChangedSkillDirs(files);

  if (planOnly) {
    writePlan(skillDirs, {
      cacheVersion: process.env.TESSL_REVIEW_CACHE_VERSION,
      reviewPlugin,
      threshold,
      workspace,
    });
    return;
  }

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
    process.exitCode = error && error.quotaFailure ? QUOTA_EXIT_CODE : 1;
  }
}

module.exports = {
  QUOTA_EXIT_CODE,
  appendGitHubOutput,
  buildReviewArgs,
  ensureRepoRelative,
  getChangedSkillDirs,
  getChangedSkillFiles,
  isQuotaFailure,
  reviewFingerprint,
  reviewLabel,
  writePlan,
};
