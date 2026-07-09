const assert = require('assert');
const path = require('path');

const scriptPath = path.resolve(__dirname, '..', 'restore_vibeship_skills.js');
const { validateSkillFilePath } = require(scriptPath);

const valid = validateSkillFilePath('skills/example-skill/SKILL.md');
assert.ok(valid);
assert.strictEqual(valid.skillId, 'example-skill');
assert.match(valid.absolutePath, /skills[\\/]example-skill[\\/]SKILL\.md$/);

for (const invalid of [
  '../package.json',
  'skills/example-skill/../../package.json',
  'skills/nested/example/SKILL.md',
  'skills/example-skill/README.md',
  '/tmp/vibeship_files.txt',
]) {
  assert.strictEqual(validateSkillFilePath(invalid), null, invalid);
}
