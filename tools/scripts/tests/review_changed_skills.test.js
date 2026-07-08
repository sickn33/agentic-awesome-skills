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
  reviewLabel,
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
    workspace: 'agentic-awesome-skills',
  }),
  [
    'review',
    'run',
    'skills/alpha',
    '--workspace',
    'agentic-awesome-skills',
    '--json',
    '--threshold',
    '85',
    '--review-plugin',
    'aas-reviewer',
    '--label',
    'pr-123-skills-alpha',
  ],
);

assert.strictEqual(reviewLabel('123', 'skills/alpha'), 'pr-123-skills-alpha');
