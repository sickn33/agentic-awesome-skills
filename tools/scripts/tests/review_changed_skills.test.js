const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const {
  buildReviewArgs,
  ensureRepoRelative,
  getChangedSkillDirs,
  getChangedSkillFiles,
  isQuotaFailure,
  reviewFingerprint,
  reviewLabel,
  writePlan,
} = require(path.join(repoRoot, 'tools', 'scripts', 'review_changed_skills.cjs'));

const changed = getChangedSkillFiles('base', 'head', {
  git(args) {
    assert.deepStrictEqual(args, [
      'diff',
      '--name-only',
      '--diff-filter=ACMR',
      'base',
      'head',
      '--',
    ]);
    return [
      'skills/alpha/SKILL.md',
      'README.md',
      'plugins/example/SKILL.md',
      'skills/beta/notes.md',
      '',
    ].join('\n');
  },
});

assert.deepStrictEqual(changed, ['skills/alpha/SKILL.md', 'plugins/example/SKILL.md']);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-review-skills-'));
fs.mkdirSync(path.join(tempDir, 'skills', 'alpha'), { recursive: true });
fs.mkdirSync(path.join(tempDir, 'plugins', 'example'), { recursive: true });
fs.writeFileSync(path.join(tempDir, 'skills', 'alpha', 'SKILL.md'), 'alpha');
fs.writeFileSync(path.join(tempDir, 'plugins', 'example', 'SKILL.md'), 'example');

assert.deepStrictEqual(getChangedSkillDirs(changed, tempDir), [
  'plugins/example',
  'skills/alpha',
]);

assert.throws(
  () => ensureRepoRelative('../outside/SKILL.md', tempDir),
  /Path traversal detected/,
);

assert.deepStrictEqual(
  buildReviewArgs('skills/alpha', {
    label: 'pr-123-skills-alpha',
    reviewPlugin: 'aas-reviewer',
    threshold: '85',
    workspace: 'antigravity-awesome-skills',
  }),
  [
    'review',
    'run',
    'skills/alpha',
    '--workspace',
    'antigravity-awesome-skills',
    '--json',
    '--threshold',
    '85',
    '--review-plugin',
    'aas-reviewer',
    '--label',
    'pr-123-skills-alpha',
  ],
);

assert.deepStrictEqual(
  buildReviewArgs('skills/alpha'),
  [
    'review',
    'run',
    'skills/alpha',
    '--workspace',
    'antigravity-awesome-skills',
    '--json',
    '--threshold',
    '80',
  ],
);

assert.strictEqual(reviewLabel('123', 'skills/alpha'), 'pr-123-skills-alpha');

const alphaFingerprint = reviewFingerprint(['skills/alpha'], {
  cacheVersion: '1',
  repoRoot: tempDir,
  threshold: '80',
  workspace: 'antigravity-awesome-skills',
});
assert.match(alphaFingerprint, /^[0-9a-f]{64}$/);
assert.strictEqual(
  reviewFingerprint(['skills/alpha'], {
    cacheVersion: '1',
    repoRoot: tempDir,
    threshold: '80',
    workspace: 'antigravity-awesome-skills',
  }),
  alphaFingerprint,
);
assert.notStrictEqual(
  reviewFingerprint(['skills/alpha'], {
    cacheVersion: '2',
    repoRoot: tempDir,
    threshold: '80',
    workspace: 'antigravity-awesome-skills',
  }),
  alphaFingerprint,
);

fs.writeFileSync(path.join(tempDir, 'skills', 'alpha', 'SKILL.md'), 'alpha changed');
assert.notStrictEqual(
  reviewFingerprint(['skills/alpha'], {
    cacheVersion: '1',
    repoRoot: tempDir,
    threshold: '80',
    workspace: 'antigravity-awesome-skills',
  }),
  alphaFingerprint,
);

const githubOutput = path.join(tempDir, 'github-output.txt');
const plan = writePlan(['skills/alpha'], {
  cacheVersion: '1',
  githubOutput,
  repoRoot: tempDir,
  threshold: '80',
  workspace: 'antigravity-awesome-skills',
});
assert.strictEqual(plan.hasSkills, true);
assert.strictEqual(plan.skillCount, 1);
assert.match(fs.readFileSync(githubOutput, 'utf8'), /has-skills=true/);
assert.match(fs.readFileSync(githubOutput, 'utf8'), /skill-count=1/);
assert.match(fs.readFileSync(githubOutput, 'utf8'), /fingerprint=[0-9a-f]{64}/);

assert.strictEqual(isQuotaFailure('Credit quota exceeded for this workspace'), true);
assert.strictEqual(isQuotaFailure('Insufficient credits remaining'), true);
assert.strictEqual(isQuotaFailure('Monthly credit allowance has been reached'), true);
assert.strictEqual(isQuotaFailure('Network request failed'), false);
