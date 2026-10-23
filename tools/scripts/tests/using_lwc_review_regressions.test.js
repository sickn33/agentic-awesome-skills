const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const bootstrap = path.join(root, 'skills/using-lwc/scripts/bootstrap.sh');
const installer = path.join(root, 'skills/using-lwc/scripts/install-lwc.sh');
// Preflight clones the repo beneath a temporary root that bootstrap rejects.
// Use an owned private disposable fixture outside temp, and always remove it below.
const fixture = fs.mkdtempSync(path.join(os.homedir(), '.aas-lwc-review-'));
try {
  const home = path.join(fixture, 'home');
  const bin = path.join(fixture, 'bin');
  const project = path.join(fixture, 'project-"-\u0001');
  for (const dir of [home, bin, project]) fs.mkdirSync(dir);
  fs.writeFileSync(path.join(project, 'package.json'), '{}');
  fs.writeFileSync(path.join(bin, 'lwc'), '#!/bin/sh\nif [ "$1" = --version ]; then printf \'%s\\n\' \'lwc 0.14.7\'; exit 0; fi\nprintf \'%s\\n\' "$*" >> "$LWC_TEST_CALLS"\nprintf \'%s\\n\' \'--scope --changeset --provenance LWC_PROJECT_ROOT\'\n');
  fs.chmodSync(path.join(bin, 'lwc'), 0o755);
  const calls = path.join(fixture, 'calls');
  const env = { ...process.env, HOME: home, PATH: bin + path.delimiter + process.env.PATH, LWC_AUTO_INSTALL: '0', LWC_GLOBAL_INIT: '0', LWC_PROJECT_ROOT: '', LWC_TEST_CALLS: calls };
  let run = spawnSync('sh', [bootstrap], { cwd: project, env, encoding: 'utf8', timeout: 10000 });
  assert.equal(run.status, 0, run.stderr);
  let result = JSON.parse(run.stdout);
  assert.equal(result.project_root, fs.realpathSync(project));
  assert.equal(result.project_boundary, fs.realpathSync(project));
  assert.equal(result.global_initialized, false);
  assert.equal(fs.existsSync(path.join(home, '.lwc')), false);
  assert(fs.readFileSync(calls, 'utf8').trim().split('\n').every(line => line.includes('--help')));
  // An initialized ancestor must not escape default cwd authority.
  fs.mkdirSync(path.join(fixture, '.lwc'));
  fs.writeFileSync(path.join(fixture, '.lwc/wiki.db'), 'synthetic-not-opened');
  run = spawnSync('sh', [bootstrap], { cwd: project, env, encoding: 'utf8', timeout: 10000 });
  assert.equal(run.status, 0, run.stderr);
  result = JSON.parse(run.stdout);
  assert.equal(result.project_wiki, '');
  assert.equal(result.project_root, fs.realpathSync(project));
  // Multiple in-bound Wikis are an explicit scope conflict, never an implicit choice.
  fs.mkdirSync(path.join(project, '.lwc'));
  fs.writeFileSync(path.join(project, '.lwc/wiki.db'), 'synthetic-not-opened');
  run = spawnSync('sh', [bootstrap], { cwd: project, env: { ...env, LWC_PROJECT_ROOT: fixture }, encoding: 'utf8', timeout: 10000 });
  assert.equal(run.status, 0, run.stderr);
  result = JSON.parse(run.stdout);
  assert.equal(result.scope_conflict, true);
  assert.equal(result.project_wiki, '');
  // Direct installer fails before download or executable probes without opt-in.
  run = spawnSync('sh', [installer], { cwd: project, env: { ...env, LWC_ALLOW_INSTALL: '0' }, encoding: 'utf8', timeout: 10000 });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /LWC_ALLOW_INSTALL=1/);
  assert.equal(fs.existsSync(path.join(home, '.local')), false);
  console.log('LWC reviewed bootstrap: JSON controls, cwd boundary, ancestor isolation, conflict and install opt-in passed');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
