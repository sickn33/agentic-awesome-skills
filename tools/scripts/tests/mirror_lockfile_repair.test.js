const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { resolveMirrorLockfileRepairs, sourcePath } = require('../../lib/mirror-lockfile-repair');
const { parseRawDiff } = require('../../lib/git-raw-diff');
const base = 'a'.repeat(40), head = 'b'.repeat(40);
const old = 'c'.repeat(40), next = 'd'.repeat(40), manifest = 'e'.repeat(40);
const canonical = 'skills/example/assets/package-lock.json';
const mirror = 'plugins/agentic-awesome-skills/skills/example/assets/package-lock.json';
const record = { status: 'M', old_path: mirror, new_path: mirror, old_mode: '100644', new_mode: '100644', old_oid: old, new_oid: next };
const pr = { user: { login: 'sickn33' }, body: '## Quality Bar Checklist ✅\n',
  base: { sha: base, repo: { full_name: 'sickn33/agentic-awesome-skills' } },
  head: { sha: head, repo: { full_name: 'sickn33/agentic-awesome-skills' } } };
const entry = (ref, file) => ({ mode: '100644', oid: file.endsWith('package-lock.json') ? (ref === base ? old : next) : manifest });
const resolve = (r = record, event = pr, readEntry = entry) => resolveMirrorLockfileRepairs('/fixture', base, head, [r], event, { readEntry });
assert.equal(resolve().length, 1);
assert.equal(require('../../lib/maintenance-impact').classifyImpact([record]).profile, 'full');
assert.equal(resolve()[0].canonical, canonical);
assert.equal(resolve({ ...record, old_path: mirror.replace('agentic-awesome-skills/', 'agentic-awesome-skills-claude/'), new_path: mirror.replace('agentic-awesome-skills/', 'agentic-awesome-skills-claude/') }).length, 1);
for (const event of [null, { ...pr, user: { login: 'contributor' } }, { ...pr, head: { ...pr.head, sha: base } },
  { ...pr, base: { ...pr.base, sha: head } }, { ...pr, head: { ...pr.head, repo: { full_name: 'fork/repo' } } }]) assert.deepEqual(resolve(record, event), []);
for (const status of ['A', 'D', 'R', 'C', 'T']) assert.deepEqual(resolve({ ...record, status }), []);
for (const patch of [{ new_mode: '120000' }, { old_mode: '100755' }, { new_mode: '100755' }, { old_oid: head }, { new_oid: base },
  { old_path: 'skills/example/assets/package-lock.json' }, { new_path: 'plugins/other/skills/example/assets/package-lock.json' }]) assert.deepEqual(resolve({ ...record, ...patch }), []);
for (const bad of ['plugins/agentic-awesome-skills/skills/../package-lock.json', 'plugins/agentic-awesome-skills/skills/example/assets/package.json', 'plugins/agentic-awesome-skills/skills/example/SKILL.md']) assert.equal(sourcePath(bad), null);
for (const target of [canonical, mirror, canonical.replace('package-lock.json', 'package.json'), mirror.replace('package-lock.json', 'package.json'), 'skills/example/SKILL.md']) {
  assert.deepEqual(resolve(record, pr, (ref, file) => file === target ? null : entry(ref, file)), []);
  assert.deepEqual(resolve(record, pr, (ref, file) => file === target ? { ...entry(ref, file), mode: '120000' } : entry(ref, file)), []);
}
assert.deepEqual(resolve(record, pr, (ref, file) => file === canonical && ref === head ? { mode: '100644', oid: old } : entry(ref, file)), []);
assert.deepEqual(resolve(record, pr, (ref, file) => file === canonical.replace('package-lock.json', 'package.json') && ref === head ? { mode: '100644', oid: head } : entry(ref, file)), []);
assert.throws(() => resolveMirrorLockfileRepairs('/fixture', 'main', head, [], pr), /Immutable/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-mirror-lock-repair-'));
try {
  const git = (...args) => execFileSync('git', args, { cwd: temp, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (file, text) => { const destination = path.join(temp, file); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, text); };
  git('init'); git('config', 'user.email', 'test@example.invalid'); git('config', 'user.name', 'Fixture');
  for (const prefix of ['skills/example', 'plugins/agentic-awesome-skills/skills/example']) {
    write(prefix + '/SKILL.md', '# Inert fixture\n');
    write(prefix + '/assets/package.json', '{"name":"fixture","version":"1.0.0"}\n');
    write(prefix + '/assets/package-lock.json', '{"lockfileVersion":3,"packages":{"":{"name":"fixture","version":"1.0.0"}}}\n');
  }
  git('add', '.'); git('commit', '-m', 'base'); const b = git('rev-parse', 'HEAD');
  const lock = '{"lockfileVersion":3,"packages":{"":{"name":"fixture","version":"1.0.0"},"node_modules/body-parser":{"version":"1.20.9"}}}\n';
  write(canonical, lock); write(mirror, lock); git('add', '.'); git('commit', '-m', 'patch'); const h = git('rev-parse', 'HEAD');
  const raw = parseRawDiff(execFileSync('git', ['diff', '--raw', '--no-abbrev', '-z', b, h], { cwd: temp }));
  const event = { ...pr, base: { ...pr.base, sha: b }, head: { ...pr.head, sha: h } };
  assert.equal(resolveMirrorLockfileRepairs(temp, b, h, raw, event).length, 1);
  const eventFile = path.join(temp, 'event.json'); fs.writeFileSync(eventFile, JSON.stringify({ pull_request: event }));
  const args = [path.resolve(__dirname, '../pr_preflight.cjs'), '--repo', temp, '--base', b, '--head', h, '--event-path', eventFile, '--check-policy', '--no-run', '--json'];
  const success = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(success.status, 0, success.stderr); assert.deepEqual(JSON.parse(success.stdout).directDerivedChanges, []);
  fs.writeFileSync(eventFile, JSON.stringify({ pull_request: { ...event, user: { login: 'contributor' } } }));
  const blocked = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(blocked.status, 1); assert.match(blocked.stderr, /source-only/);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log('Mirror lockfile repair identity, byte binding, boundary and policy regressions passed.');
