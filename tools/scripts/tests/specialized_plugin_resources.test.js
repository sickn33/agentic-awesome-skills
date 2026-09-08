const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { findProjectRoot } = require('../../lib/project-root');
const root = findProjectRoot(__dirname);

// Prose paths are bundled-resource promises. Fenced examples may instead name
// files in the user's application, so they are deliberately outside this scan.
function declaredResources(markdown) {
  const prose = markdown.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
  return [...new Set(prose.match(/(?<![\w/])(?:references|resources|assets|scripts)\/[\w./-]+/g) || [])];
}
function missingResources(directory, markdown, exists = fs.existsSync) {
  return declaredResources(markdown).filter((relative) => {
    const resolved = path.resolve(directory, relative);
    return !resolved.startsWith(path.resolve(directory) + path.sep) || !exists(resolved);
  });
}
assert.deepEqual(declaredResources('See `references/a.md`, **assets/b.json**, [guide](resources/c.md).'), ['references/a.md', 'assets/b.json', 'resources/c.md']);
assert.deepEqual(declaredResources('```sh\npython scripts/application-owned.py\n```\nSee `scripts/helper.py args`.'), ['scripts/helper.py']);
assert.deepEqual(missingResources('/fixture', '`resources/missing.md`', () => false), ['resources/missing.md']);
assert.deepEqual(missingResources('/fixture', '`resources/../../escape.md`', () => true), ['resources/../../escape.md']);
assert.deepEqual(missingResources('/fixture', '`resources/exists.md`', () => true), []);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/specialized-plugin-candidates.json'), 'utf8'));
const ids = new Set(manifest.candidates.flatMap((candidate) => candidate.skills));
// Also retain the repaired, formerly selected hardening skill's local contract.
ids.add('security-and-hardening');
for (const id of ids) {
  const canonical = path.join(root, 'skills', id);
  const markdown = fs.readFileSync(path.join(canonical, 'SKILL.md'), 'utf8');
  assert.deepEqual(missingResources(canonical, markdown), [], `${id}: missing declared bundled resource`);
  for (const relative of declaredResources(markdown)) {
    assert.ok(fs.statSync(path.join(canonical, relative)).isFile(), `${id}: expected resource file ${relative}`);
  }
}
console.log(`Declared local resources resolve for ${ids.size} selected/repaired skill entrypoints.`);
for (const candidate of manifest.candidates) {
  for (const id of candidate.skills) {
    const canonical = path.join(root, 'skills', id);
    const markdown = fs.readFileSync(path.join(canonical, 'SKILL.md'), 'utf8');
    const plugin = path.join(root, 'plugins', `agentic-bundle-${candidate.id}`, 'skills', id);
    for (const relative of declaredResources(markdown)) {
      assert.deepEqual(fs.readFileSync(path.join(plugin, relative)), fs.readFileSync(path.join(canonical, relative)), `${candidate.id}/${id}: bundled resource bytes differ for ${relative}`);
    }
  }
}
