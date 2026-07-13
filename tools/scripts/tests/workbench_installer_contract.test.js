const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { resolveExactSkillSelections } = require('../../bin/install');
const { listSkillIdsRecursive } = require('../../lib/skill-utils');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const repoSkills = path.join(repoRoot, 'skills');
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'skills_index.json'), 'utf8'));
const installerEntries = listSkillIdsRecursive(repoSkills);

assert.strictEqual(
  installerEntries.length,
  catalog.length,
  'the Workbench catalog and installer must see the same number of canonical skills',
);

const resolvedEntries = resolveExactSkillSelections(
  repoSkills,
  installerEntries,
  catalog.map((skill) => skill.id),
);

assert.strictEqual(
  resolvedEntries.size,
  catalog.length,
  'every Workbench id must resolve to exactly one installer entry',
);

for (const skill of catalog) {
  const expectedEntry = skill.path.replace(/^skills\//, '');
  assert.ok(
    resolvedEntries.has(expectedEntry),
    `Workbench id ${skill.id} must resolve to ${expectedEntry}`,
  );
}

console.log(`Workbench installer contract passed for ${catalog.length} canonical skills.`);
