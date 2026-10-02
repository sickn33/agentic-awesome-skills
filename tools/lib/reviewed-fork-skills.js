const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const LEDGER_PATH = path.join(__dirname, '../config/reviewed-fork-skills.json');
const SHA = /^[0-9a-f]{40}$/;
const ROOT = /^skills\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUPPORT_FILE_NAME = /^(?:README\.md|\.gitignore|LICENSE)$/;
const SUPPORT_SCRIPT_NAME = /^scripts\/[A-Za-z0-9._-]+\.py$/;
const MAX_REVIEWED_SUPPORT_PATHS = 16;

// A reviewed entry may opt in to a short, closed list of extra exact paths
// inside its own skill root. Only root manifest files and Python scripts are
// representable, so this can never become a general extension allowlist.
function isValidReviewedSupportPath(skillRoot, filePath) {
  if (typeof filePath !== 'string' || !filePath.startsWith(`${skillRoot}/`)) return false;
  const relative = filePath.slice(skillRoot.length + 1);
  if (!relative || relative.split('/').some((segment) => !segment || segment === '.' || segment === '..')) return false;
  if (path.posix.normalize(relative) !== relative) return false;
  return SUPPORT_FILE_NAME.test(relative) || SUPPORT_SCRIPT_NAME.test(relative);
}

function readSupportPaths(entry) {
  const candidates = entry.reviewed_support_paths;
  if (candidates === undefined) return [];
  if (!Array.isArray(candidates) || candidates.length > MAX_REVIEWED_SUPPORT_PATHS) return null;
  const seen = new Set();
  for (const candidate of candidates) {
    if (!isValidReviewedSupportPath(entry.skill_root, candidate) || seen.has(candidate)) return null;
    seen.add(candidate);
  }
  return [...seen];
}

function readLedger(options = {}) {
  const ledger = options.ledger ?? JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  if (ledger.schema_version !== 1 || !Array.isArray(ledger.entries)) {
    throw new Error('Invalid reviewed-fork skill ledger');
  }
  const keys = new Set();
  const validated = [];
  for (const entry of ledger.entries) {
    const key = `${entry.base_repository}:${entry.pr}:${entry.skill_root}`;
    const supportPaths = readSupportPaths(entry);
    if (!Number.isSafeInteger(entry.pr) || entry.pr <= 0 || !ROOT.test(entry.skill_root)
        || !SHA.test(entry.reviewed_head) || !SHA.test(entry.tree_oid)
        || !/^[\w.-]+\/[\w.-]+$/.test(entry.base_repository)
        || !/^[\w.-]+\/[\w.-]+$/.test(entry.head_repository) || keys.has(key)
        || supportPaths === null) {
      throw new Error('Invalid or duplicate reviewed-fork skill entry');
    }
    keys.add(key);
    validated.push({ entry, supportPaths });
  }
  return validated;
}

function matchingEntries(projectRoot, identity, options = {}) {
  const validated = readLedger(options);
  if (!SHA.test(identity?.head || '') || !Number.isSafeInteger(identity?.pr)) return [];
  const resolveTree = options.resolveTree || ((root) => {
    const result = spawnSync('git', ['rev-parse', '--verify', `${identity.head}:${root}`], {
      cwd: projectRoot, encoding: 'utf8', maxBuffer: 4096, timeout: 10_000,
    });
    if (result.error || result.status !== 0) return null;
    return result.stdout.trim();
  });
  return validated.filter(({ entry }) =>
    entry.pr === identity.pr && entry.base_repository === identity.baseRepository
    && entry.head_repository === identity.headRepository
    && resolveTree(entry.skill_root) === entry.tree_oid
  );
}

// This module and ledger must be loaded from the protected evaluator checkout,
// never from the PR's --repo directory. Git objects are read as data only.
function resolveReviewedSkillRoots(projectRoot, identity, options = {}) {
  return matchingEntries(projectRoot, identity, options).map(({ entry }) => entry.skill_root);
}

// Extra exact paths opted in by a reviewed entry, only for roots that already
// passed the full-tree review check above.
function resolveReviewedSupportPaths(projectRoot, identity, options = {}) {
  return matchingEntries(projectRoot, identity, options)
    .flatMap(({ supportPaths }) => supportPaths);
}

function isReviewedSupportPath(filePath, roots, supportPaths = []) {
  const allowedExtra = new Set(Array.isArray(supportPaths) ? supportPaths : []);
  if (allowedExtra.has(filePath)) return true;
  return (roots || []).some((root) => ROOT.test(root) && (
    filePath === `${root}/LICENSE`
    || (filePath.startsWith(`${root}/scripts/`) && filePath.endsWith('.py'))
  ));
}

module.exports = { resolveReviewedSkillRoots, resolveReviewedSupportPaths, isReviewedSupportPath };
