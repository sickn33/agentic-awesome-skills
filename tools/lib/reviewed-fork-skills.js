const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const LEDGER_PATH = path.join(__dirname, '../config/reviewed-fork-skills.json');
const SHA = /^[0-9a-f]{40}$/;
const ROOT = /^skills\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

// This module and ledger must be loaded from the protected evaluator checkout,
// never from the PR's --repo directory. Git objects are read as data only.
function resolveReviewedSkillRoots(projectRoot, identity, options = {}) {
  const ledger = options.ledger ?? JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  if (ledger.schema_version !== 1 || !Array.isArray(ledger.entries)) {
    throw new Error('Invalid reviewed-fork skill ledger');
  }
  const keys = new Set();
  for (const entry of ledger.entries) {
    const key = `${entry.base_repository}:${entry.pr}:${entry.skill_root}`;
    if (!Number.isSafeInteger(entry.pr) || entry.pr <= 0 || !ROOT.test(entry.skill_root)
        || !SHA.test(entry.reviewed_head) || !SHA.test(entry.tree_oid)
        || !/^[\w.-]+\/[\w.-]+$/.test(entry.base_repository)
        || !/^[\w.-]+\/[\w.-]+$/.test(entry.head_repository) || keys.has(key)) {
      throw new Error('Invalid or duplicate reviewed-fork skill entry');
    }
    keys.add(key);
  }
  if (!SHA.test(identity?.head || '') || !Number.isSafeInteger(identity?.pr)) return [];
  const resolveTree = options.resolveTree || ((root) => {
    const result = spawnSync('git', ['rev-parse', '--verify', `${identity.head}:${root}`], {
      cwd: projectRoot, encoding: 'utf8', maxBuffer: 4096, timeout: 10_000,
    });
    if (result.error || result.status !== 0) return null;
    return result.stdout.trim();
  });
  return ledger.entries.filter((entry) =>
    entry.pr === identity.pr && entry.base_repository === identity.baseRepository
    && entry.head_repository === identity.headRepository
    && resolveTree(entry.skill_root) === entry.tree_oid
  ).map((entry) => entry.skill_root);
}

function isReviewedSupportPath(filePath, roots) {
  return roots.some((root) => ROOT.test(root) && (
    filePath === `${root}/LICENSE`
    || (filePath.startsWith(`${root}/scripts/`) && filePath.endsWith('.py'))
  ));
}

module.exports = { resolveReviewedSkillRoots, isReviewedSupportPath };
