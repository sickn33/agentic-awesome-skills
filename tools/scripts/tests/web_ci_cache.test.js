'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { outputInventory, verifyOutput, turboEnvironment, validateSummary } = require('../web_ci.cjs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aas-web-cache-test-'));
try {
  const output = path.join(dir, 'output');
  fs.mkdirSync(output);
  const manifest = path.join(dir, 'manifest.json');
  assert.throws(() => outputInventory(output), /Empty/);
  fs.writeFileSync(path.join(output, '__proto__'), 'ordinary file');
  assert(Object.hasOwn(outputInventory(output), '__proto__'));
  fs.unlinkSync(path.join(output, '__proto__'));
  fs.writeFileSync(path.join(output, 'index.html'), 'original');
  fs.writeFileSync(manifest, JSON.stringify({ schema: 1, files: outputInventory(output) }));
  verifyOutput(output, manifest);
  fs.symlinkSync(output, path.join(dir, 'linked-root'));
  assert.throws(() => outputInventory(path.join(dir, 'linked-root')), /Symlink/);
  fs.symlinkSync(manifest, path.join(dir, 'linked-manifest'));
  assert.throws(() => verifyOutput(output, path.join(dir, 'linked-manifest')), /Symlink/);
  fs.writeFileSync(path.join(output, 'index.html'), 'tampered');
  assert.throws(() => verifyOutput(output, manifest), /mismatch/);
  fs.writeFileSync(path.join(output, 'index.html'), 'original');
  fs.writeFileSync(path.join(output, 'unexpected.js'), 'extra');
  assert.throws(() => verifyOutput(output, manifest), /mismatch/);
  fs.unlinkSync(path.join(output, 'unexpected.js'));
  fs.unlinkSync(path.join(output, 'index.html'));
  assert.throws(() => verifyOutput(output, manifest), /Empty/);
  fs.symlinkSync(manifest, path.join(output, 'linked.json'));
  assert.throws(() => outputInventory(output), /Symlink/);
  const env = turboEnvironment({ PATH: process.env.PATH, TURBO_TOKEN: 'must-not-propagate', turbo_team: 'must-not-propagate', TURBO_API: 'https://invalid.example', TURBO_FORCE: '1', VITE_BASE_PATH: '/' });
  assert.equal(env.TURBO_TOKEN, undefined);
  assert.equal(env.turbo_team, undefined);
  assert.equal(env.TURBO_API, undefined);
  assert.equal(env.TURBO_FORCE, undefined);
  assert.equal(env.TURBO_TELEMETRY_DISABLED, '1');
  assert.equal(env.VITE_BASE_PATH, '/');
  const identity = JSON.parse(env.AAS_WEB_TOOLCHAIN);
  assert.equal(identity.node, process.version);
  assert.equal(identity.release, undefined);
  assert.equal(identity.icu, process.versions.icu);
  assert(Object.hasOwn(identity, 'libc'));
  const osModule = require('node:os'), originalRelease = osModule.release;
  try {
    osModule.release = () => 'different-cloud-kernel';
    assert.equal(turboEnvironment({ PATH: process.env.PATH }).AAS_WEB_TOOLCHAIN, env.AAS_WEB_TOOLCHAIN);
  } finally { osModule.release = originalRelease; }
  const originalReport = process.report.getReport;
  try {
    process.report.getReport = () => ({ header: { glibcVersionRuntime: 'different-userland-abi' } });
    assert.notEqual(turboEnvironment({ PATH: process.env.PATH }).AAS_WEB_TOOLCHAIN, env.AAS_WEB_TOOLCHAIN);
  } finally { process.report.getReport = originalReport; }
  const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../turbo.json'), 'utf8'));
  for (const task of Object.values(config.tasks)) {
    assert(task.inputs.includes('apps/web-app/**'), 'ignored generated public bytes must be inputs');
    assert(task.inputs.includes('tools/lib/**'));
    assert(task.env.includes('VITE_*'));
    assert(task.env.includes('CI'));
    assert(task.env.includes('NODE_OPTIONS'));
    assert(task.env.includes('AAS_WEB_TOOLCHAIN'));
  }
  const workflow = require('yaml').parse(fs.readFileSync(path.resolve(__dirname, '../../../.github/workflows/ci.yml'), 'utf8'));
  const pinned = [];
  for (const name of ['source-validation', 'main-validation-and-sync']) {
    const steps = workflow.jobs[name].steps;
    const version = steps.find(step => step.uses?.startsWith('actions/setup-node@')).with['node-version'];
    assert.match(version, /^\d+\.\d+\.\d+$/);
    pinned.push(version);
    const cache = steps.find(step => step.uses?.startsWith('actions/cache@'));
    assert.match(cache.with.key, /web_cache_plan.outputs.context/);
    assert.match(cache.with['restore-keys'], /web_cache_plan.outputs.context/);
  }
  assert.equal(new Set(pinned).size, 1, 'cached jobs must use the same exact Node patch');
  const compile = config.tasks['app:ci:compile'];
  assert(compile.inputs.includes('!apps/web-app/**/*.test.*'));
  assert(!config.tasks['app:ci:test'].inputs.includes('!apps/web-app/**/*.test.*'));
  const valid = { tasks: ['test', 'compile'].map(phase => ({ taskId: `app:ci:${phase}`, hash: 'a'.repeat(16), cache: { status: 'HIT' }, execution: { exitCode: 0 } })) };
  validateSummary(valid);
  for (const invalid of [{}, { tasks: [] }, { tasks: [valid.tasks[0]] },
    { tasks: [valid.tasks[0], valid.tasks[0]] },
    { tasks: valid.tasks.map(task => ({ ...task, execution: { exitCode: 1 } })) },
    { tasks: valid.tasks.map(task => ({ ...task, cache: { status: 'UNKNOWN' } })) }]) {
    assert.throws(() => validateSummary(invalid), /evidence/);
  }
  console.log('web cache: output integrity, omissions, symlinks, inherited credentials and input boundaries passed');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
