#!/usr/bin/env node
// Entry point for agents and humans. Installs dependencies and builds on first use (or after the
// sources change), then runs the CLI. Playwright's Chromium is installed lazily by `ui-diff run`.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const cli = path.join(root, 'dist', 'cli.js');

function newestMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs);
  }
  return newest;
}

function npmRun(args, what) {
  process.stderr.write(`[ui-diff] ${what}…\n`);
  const result = spawnSync(npm, args, { cwd: root, stdio: ['ignore', process.stderr, process.stderr] });
  if (result.status !== 0) {
    process.stderr.write(`[ui-diff] error: \`npm ${args.join(' ')}\` failed in ${root}\n`);
    process.exit(result.status ?? 1);
  }
}

// Resolved the way Node will at runtime: installed through npx or as a dependency, the packages sit
// in a node_modules folder above this one, not inside it.
function resolves(name) {
  try {
    createRequire(path.join(root, 'package.json')).resolve(`${name}/package.json`);
    return true;
  } catch {
    return false;
  }
}

// An installed package ships a built dist, and npm does not keep file times when it unpacks one, so
// only a checkout (or a copy of it) rebuilds when the sources are newer.
const installed = root.split(path.sep).includes('node_modules');
const needsBuild = !existsSync(cli) || (!installed && newestMtime(path.join(root, 'src')) > statSync(cli).mtimeMs);
if (!resolves('playwright') || (needsBuild && !resolves('typescript'))) {
  npmRun(['install', '--no-audit', '--no-fund', '--include=dev'], 'installing ui-diff dependencies (first run only)');
}
if (needsBuild) npmRun(['run', '--silent', 'build'], 'building ui-diff');

const { main } = await import(pathToFileURL(cli).href);
process.exit(await main(process.argv.slice(2)));
