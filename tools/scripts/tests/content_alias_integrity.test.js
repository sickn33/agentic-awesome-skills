const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const mapping = JSON.parse(fs.readFileSync(path.join(root, 'docs/contributors/content-aliases.json'), 'utf8'));
const seen = new Set();
function inventory(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).filter(entry => !['__pycache__'].includes(entry.name)).flatMap(entry => {
    const key = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink());
    return entry.isDirectory() ? inventory(path.join(dir, entry.name), key + '/') : [key];
  }).filter(name => name !== 'SKILL.md').sort();
}
function procedure(id) {
  const text = fs.readFileSync(path.join(root, 'skills', id, 'SKILL.md'), 'utf8');
  assert.match(text, /^---\n/);
  const body = text.split(/^---$/m).slice(2).join('---').trim();
  assert.match(body, /^## Compatibility and maintenance\n/);
  const marker = 'Modified in AAS on 2026-09-05; original metadata and license notices are retained.\n\n';
  assert.ok(body.includes(marker));
  return body.slice(body.indexOf(marker) + marker.length);
}
for (const group of mapping.groups) {
  assert.ok(group.ids.includes(group.primary));
  const base = path.join(root, 'skills', group.primary);
  const files = inventory(base);
  for (const id of group.ids) {
    assert.ok(!seen.has(id), `duplicate mapped ID ${id}`); seen.add(id);
    assert.equal(procedure(id), procedure(group.primary), `${id}: shared procedure drift`);
    const target = path.join(root, 'skills', id);
    assert.deepEqual(inventory(target), files, `${id}: missing support files`);
    for (const file of files) assert.ok(fs.readFileSync(path.join(target, file)).equals(fs.readFileSync(path.join(base, file))), `${id}/${file}: support drift`);
  }
}
assert.equal(mapping.groups.length, 8, 'eight baseline duplicate groups require explicit disposition');
assert.equal(seen.size, 17, 'preserve all baseline callable IDs');
console.log('All eight compatibility groups preserve 17 callable IDs with complete equal offline procedures and bundles.');
