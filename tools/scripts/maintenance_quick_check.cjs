#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { execFileSync, spawnSync } = require('node:child_process');
const { resolveCommandInvocation } = require('./release_workflow');
function plan(paths) {
  const selected = new Map();
  const add = (command, args) => selected.set(JSON.stringify([command, args]), [command, args]);
  if (paths.some(p => p === 'README.md' || /sync_repo_metadata|update_readme/.test(p)))
    add('node', ['tools/scripts/run-python.js', 'tools/scripts/tests/test_sync_repo_metadata.py']);
  if (paths.some(p => /^apps\/web-app\/(src\/(components\/CatalogNavigation|pages\/Landing|App)|package|vite|src\/pages\/__tests__\/Landing)/.test(p)))
    add('npm', ['--prefix', 'apps/web-app', 'run', 'test', '--', '--run', 'src/pages/__tests__/Landing.test.tsx', 'src/__tests__/App.core-routing.test.tsx']);
  if (paths.some(p => p.startsWith('.github/workflows/') || /maintenance_|web_ci|run-test-suite/.test(p))) {
    add('node', ['tools/scripts/tests/automation_workflows.test.js']);
    add('node', ['tools/scripts/tests/workflow_contracts.test.js']);
  }
  return [...selected.values()];
}
function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (['--base', '--head'].includes(args[i]) && args[i + 1]) options[args[i++].slice(2)] = args[i];
    else throw new Error('Usage: maintenance_quick_check.cjs --base REF --head REF');
  }
  if (!options.base || !options.head) throw new Error('Explicit base and head required');
  const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const resolve = ref => git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]);
  const base = resolve(options.base), head = resolve(options.head);
  if (head !== resolve('HEAD')) throw new Error('Quick checks must run on the selected head');
  if (git(['status', '--porcelain', '--untracked-files=normal'])) throw new Error('Commit source changes before quick checks');
  const paths = git(['diff', '--name-only', '-z', `${base}...${head}`]).split('\0').filter(Boolean);
  const commands = plan(paths);
  console.log(`[quick-check] ${commands.length} targeted checks; full protected validation remains mandatory.`);
  for (const [command, argv] of commands) {
    const invocation = resolveCommandInvocation(command, argv);
    const r = spawnSync(invocation.command, invocation.args, { stdio: 'inherit', shell: false });
    if (r.error || r.status !== 0) throw new Error(`First failing quick check: ${command} ${argv.join(' ')}; fix before pushing, do not blindly retry.`);
  }
}
module.exports = { plan };
if (require.main === module) try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 1; }
