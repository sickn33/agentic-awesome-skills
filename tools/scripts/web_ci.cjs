#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { resolveCommandInvocation } = require('./release_workflow');
const root = path.resolve(__dirname, '../..');
const app = path.join(root, 'apps/web-app');
const phases = { test: 'coverage', compile: 'dist' };
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function run(command, args, options = {}) {
  const invocation = resolveCommandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, { cwd: root, stdio: 'inherit', shell: false, ...options });
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status ?? 'missing status'}): ${result.error?.message || ''}`);
  return result;
}
function outputInventory(directory) {
  if (!fs.lstatSync(directory).isDirectory()) throw new Error('Symlink or non-directory cached web output root');
  const files = Object.create(null);
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const filename = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symlink in cached web output');
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile()) files[path.relative(directory, filename).split(path.sep).join('/')] = digest(fs.readFileSync(filename));
      else throw new Error('Unsupported cached output type');
    }
  }
  visit(directory);
  if (!Object.keys(files).length) throw new Error('Empty cached web output');
  return files;
}
function verifyOutput(directory, manifest) {
  if (!fs.lstatSync(manifest).isFile()) throw new Error('Symlink or non-file cached web manifest');
  const recorded = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  if (recorded.schema !== 1 || JSON.stringify(recorded.files) !== JSON.stringify(outputInventory(directory))) {
    throw new Error('Cached web output inventory or bytes mismatch');
  }
}
function turboEnvironment(environment = process.env) {
  const selected = Object.fromEntries(Object.entries(environment).filter(([key]) => !/^TURBO_/i.test(key)));
  selected.TURBO_TELEMETRY_DISABLED = '1';
  selected.DO_NOT_TRACK = '1';
  selected.AAS_WEB_TOOLCHAIN = JSON.stringify({ node: process.version, npm: run('npm', ['--version'], { stdio: 'pipe' }).stdout.toString().trim(),
    platform: process.platform, arch: process.arch, release: os.release(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  return selected;
}
function cacheable(phase) {
  if (!Object.hasOwn(phases, phase)) throw new Error('Unknown web cache phase');
  run('npm', ['--prefix', app, 'run', phase === 'test' ? 'test:coverage' : 'ci:compile']);
  fs.mkdirSync(path.join(app, '.ci-cache'), { recursive: true });
  fs.writeFileSync(path.join(app, '.ci-cache', `${phase}.json`), JSON.stringify({ schema: 1, files: outputInventory(path.join(app, phases[phase])) }));
}
function validateSummary(summary) {
  const expected = Object.keys(phases).map(phase => `app:ci:${phase}`).sort();
  const actual = summary.tasks?.map(task => task.taskId).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)
      || summary.tasks.some(task => !['HIT', 'MISS'].includes(task.cache?.status)
        || task.execution?.exitCode !== 0 || !/^[a-f0-9]{16}$/.test(task.hash))) {
    throw new Error('Incomplete or unsuccessful Turbo task evidence');
  }
}
function main() {
  if (process.env.AAS_WEB_CI_RECEIPT) {
    const filename = path.resolve(process.env.AAS_WEB_CI_RECEIPT);
    if (filename.startsWith(root + path.sep) && !filename.startsWith(path.join(root, '.tmp') + path.sep)) {
      throw new Error('Web CI receipt must be external or under .tmp');
    }
    fs.rmSync(filename, { force: true });
  }
  const started = Date.now();
  run('npm', ['run', 'app:setup']);
  run('npm', ['--prefix', app, 'run', 'generate:sitemap']);
  // Remove prior outputs first: a hit must restore a complete artifact, never mix trees.
  for (const directory of [...Object.values(phases), '.ci-cache']) fs.rmSync(path.join(app, directory), { recursive: true, force: true });
  const summaries = path.join(root, '.turbo/runs');
  const before = new Set(fs.existsSync(summaries) ? fs.readdirSync(summaries) : []);
  const cacheDir = path.resolve(process.env.AAS_WEB_CACHE_DIR || path.join(root, '.turbo/cache'));
  if (cacheDir === root || cacheDir === app || cacheDir === path.parse(cacheDir).root) throw new Error('Unsafe web cache directory');
  const turbo = path.join(root, 'node_modules/turbo/bin/turbo');
  const taskStarted = Date.now();
  run(process.execPath, [turbo, 'run', 'app:ci:test', 'app:ci:compile', '--cache=local:rw', '--cache-dir', cacheDir,
    '--env-mode=strict', '--framework-inference=false', '--concurrency=1', '--summarize', '--output-logs=errors-only'], { env: turboEnvironment() });
  const taskMs = Date.now() - taskStarted;
  const added = fs.readdirSync(summaries).filter(file => file.endsWith('.json') && !before.has(file));
  if (added.length !== 1) throw new Error('Missing or ambiguous Turbo run summary');
  const summary = JSON.parse(fs.readFileSync(path.join(summaries, added[0]), 'utf8'));
  validateSummary(summary);
  for (const [phase, directory] of Object.entries(phases)) verifyOutput(path.join(app, directory), path.join(app, '.ci-cache', `${phase}.json`));
  // Provenance, prerender and final verification always execute against the current head.
  const finalizeStarted = Date.now();
  run('npm', ['--prefix', app, 'run', 'build:finalize']);
  const head = run('git', ['rev-parse', 'HEAD'], { stdio: 'pipe' }).stdout.toString().trim();
  const receipt = { schema: 1, passed: true, head, elapsedMs: Date.now() - started, taskMs, finalizeMs: Date.now() - finalizeStarted,
    tasks: summary.tasks.map(task => ({ task: task.taskId, hash: task.hash, cache: task.cache.status })) };
  if (process.env.AAS_WEB_CI_RECEIPT) {
    const filename = path.resolve(process.env.AAS_WEB_CI_RECEIPT);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(receipt, null, 2) + '\n');
  }
  console.log('Web CI receipt:', JSON.stringify(receipt));
  return receipt;
}
if (require.main === module) {
  try {
    if (process.argv.length === 2) main();
    else if (process.argv.length === 4 && process.argv[2] === 'cacheable') cacheable(process.argv[3]);
    else throw new Error('Usage: web_ci.cjs [cacheable test|compile]');
  } catch (error) { console.error(`Web CI failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { outputInventory, verifyOutput, turboEnvironment, validateSummary };
