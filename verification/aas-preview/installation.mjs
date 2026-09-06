import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Exercise the installed candidate's real CLI and copier before publication.
// Only external npm/Git resolution is a fixture, never the installer itself.
export function verifyInstallation(options) {
  const primary = verifyInstallationWithShell(options);
  if (process.platform === 'win32') {
    primary.windowsPowerShell51 = verifyInstallationWithShell({ ...options, windowsShell: 'powershell.exe' });
  }
  return primary;
}

function verifyInstallationWithShell({ packageRoot, workRoot, manifest, snapshotTree, windowsShell = 'pwsh' }) {
  const windows = process.platform === 'win32';
  const root = path.join(workRoot, windows && windowsShell === 'powershell.exe' ? 'installation-powershell51' : 'installation-roundtrip');
  let shellVersion;
  if (windows) {
    const version = spawnSync(windowsShell, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8', timeout: 60000 });
    assert.equal(version.status, 0, version.stderr);
    shellVersion = version.stdout.trim();
    assert.match(shellVersion, windowsShell === 'powershell.exe' ? /^5\.1\./ : /^7\./);
  }
  const bin = path.join(root, 'bin');
  const target = path.join(root, "Nicco's skills");
  const manifestPath = path.join(root, 'manifest.json');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const ids = manifest.skills.map(({ id }) => id);
  let head = '1234567890123456789012345678901234567890';
  // Windows uses real Git against a disposable local release. This avoids
  // pretending a POSIX executable shim proves Windows process behavior.
  const source = path.join(root, 'release-source');
  if (windows) {
    fs.mkdirSync(source);
    const git = (args) => {
      const result = spawnSync('git', ['-C', source, ...args], { encoding: 'utf8', timeout: 60000 });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    git(['init', '--initial-branch=main']);
    git(['config', 'core.autocrlf', 'false']);
    git(['config', 'user.name', 'AAS test fixture']);
    git(['config', 'user.email', 'fixture@example.invalid']);
    for (const id of ids) fs.cpSync(path.join(packageRoot, 'skills', id), path.join(source, 'skills', id), { recursive: true });
    git(['add', 'skills']);
    git(['commit', '-m', 'Local candidate release fixture']);
    git(['tag', 'v' + manifest.catalog.version]);
    head = git(['rev-parse', 'HEAD']);
  }
  const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH || ''}`,
    AAS_FIXTURE_PACKAGE: packageRoot, AAS_FIXTURE_IDS: JSON.stringify(ids),
    AAS_FIXTURE_VERSION: manifest.catalog.version, AAS_FIXTURE_HEAD: head };
  if (windows) {
    for (const key of Object.keys(env)) if (key !== 'PATH' && key.toUpperCase() === 'PATH') delete env[key];
    env.GIT_CONFIG_COUNT = '2';
    env.GIT_CONFIG_KEY_0 = `url.${pathToFileURL(source).href}.insteadOf`;
    env.GIT_CONFIG_VALUE_0 = 'https://github.com/sickn33/agentic-awesome-skills.git';
    env.GIT_CONFIG_KEY_1 = 'core.autocrlf';
    env.GIT_CONFIG_VALUE_1 = 'false';
    env.npm_execpath = path.join(bin, 'npm-cli.js');
  }
  const writeBin = (name, body) => {
    const file = path.join(bin, windows ? 'npm-cli.js' : name);
    fs.writeFileSync(file, `#!${process.execPath}\n${body}`, { mode: 0o700 });
    if (windows) fs.writeFileSync(path.join(bin, 'npm.cmd'), `@"${process.execPath}" "${file}" %*\r\n`);
  };
  writeBin('npm', `
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === 'view') {
  assert.equal(args[1], 'agentic-awesome-skills@' + process.env.AAS_FIXTURE_VERSION);
  assert.equal(args[2], 'gitHead');
  process.stdout.write(JSON.stringify(process.platform === 'win32' && process.env.AAS_FIXTURE_CLONED_HEAD ? process.env.AAS_FIXTURE_CLONED_HEAD : process.env.AAS_FIXTURE_HEAD));
} else {
  assert.deepEqual(args.slice(0, 6), ['exec', '--yes', '--ignore-scripts', '--package=agentic-awesome-skills@' + process.env.AAS_FIXTURE_VERSION, '--', 'agentic-awesome-skills']);
  const result = spawnSync(process.execPath, [path.join(process.env.AAS_FIXTURE_PACKAGE, 'tools/bin/install.js'), ...args.slice(6)], { stdio: 'inherit', env: process.env });
  process.exit(result.status === null ? 1 : result.status);
}
`);
  if (!windows) writeBin('git', `
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
if (args[0] === 'clone') {
  const target = args.at(-1);
  for (const id of JSON.parse(process.env.AAS_FIXTURE_IDS)) {
    fs.cpSync(path.join(process.env.AAS_FIXTURE_PACKAGE, 'skills', id), path.join(target, 'skills', id), { recursive: true });
  }
} else if (args[2] === 'rev-parse' && args[3] === 'HEAD') {
  process.stdout.write(process.env.AAS_FIXTURE_CLONED_HEAD || process.env.AAS_FIXTURE_HEAD);
} else if (!(args[2] === 'sparse-checkout' && args[3] === 'set')) process.exit(1);
`);
  const cli = (args) => spawnSync(process.execPath, [path.join(packageRoot, 'tools/bin/aas.js'), ...args], { cwd: root, env, encoding: 'utf8', timeout: 60000 });
  const preview = () => {
    const result = cli(['stack', 'install-preview', '--manifest', manifestPath, '--destination', target, '--shell', windows ? 'powershell' : 'posix']);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const execute = (command, extraEnv = {}) => spawnSync(windows ? windowsShell : '/bin/sh', windows ? ['-NoProfile', '-NonInteractive', '-Command', command + '; exit $LASTEXITCODE'] : ['-c', command], { cwd: root, env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 60000 });
  const handoff = preview();
  assert.deepEqual(handoff.selectedSkillIds, ids);
  const dryRun = execute(handoff.preview.command);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.equal(fs.existsSync(target), false);
  assert.match(dryRun.stdout, new RegExp(`Exact skill set \\(${ids.length}\\)`));
  assert.ok(handoff.preview.command.endsWith(' --dry-run'));
  const installCommand = handoff.preview.command.slice(0, -' --dry-run'.length);
  const installed = execute(installCommand);
  assert.equal(installed.status, 0, installed.stderr);
  assert.deepEqual(fs.readdirSync(target).sort(), [...ids, '.antigravity-install-manifest.json'].sort());
  for (const id of ids) assert.equal(snapshotTree(path.join(target, id)), snapshotTree(path.join(packageRoot, 'skills', id)));
  const owned = JSON.parse(fs.readFileSync(path.join(target, '.antigravity-install-manifest.json')));
  assert.deepEqual(owned.entries, [...ids].sort());
  fs.writeFileSync(path.join(target, 'user-note.txt'), 'preserve this file');
  const repeated = execute(installCommand);
  assert.equal(repeated.status, 0, repeated.stderr);
  for (const id of ids) assert.equal(snapshotTree(path.join(target, id)), snapshotTree(path.join(packageRoot, 'skills', id)));
  assert.equal(fs.readFileSync(path.join(target, 'user-note.txt'), 'utf8'), 'preserve this file');
  const beforeFailure = snapshotTree(target);
  const movedRelease = execute(installCommand, { AAS_FIXTURE_CLONED_HEAD: 'f'.repeat(40) });
  assert.notEqual(movedRelease.status, 0);
  assert.match(movedRelease.stderr, /release identity mismatch/i);
  assert.equal(snapshotTree(target), beforeFailure);
  const remaining = ids.slice(0, 1);
  fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, skills: remaining.map((id) => ({ id })) }));
  const reduced = preview();
  const reducedDryRun = execute(reduced.preview.command);
  assert.equal(reducedDryRun.status, 0, reducedDryRun.stderr);
  assert.equal(snapshotTree(target), beforeFailure);
  const reducedInstall = execute(reduced.preview.command.slice(0, -' --dry-run'.length));
  assert.equal(reducedInstall.status, 0, reducedInstall.stderr);
  assert.deepEqual(fs.readdirSync(target).sort(), [...remaining, '.antigravity-install-manifest.json', 'user-note.txt'].sort());
  assert.equal(fs.readFileSync(path.join(target, 'user-note.txt'), 'utf8'), 'preserve this file');
  const saved = path.join(root, 'saved');
  fs.renameSync(target, saved);
  fs.symlinkSync(saved, target, windows ? 'junction' : 'dir');
  const beforeLink = snapshotTree(saved);
  const linked = execute(reduced.preview.command);
  assert.notEqual(linked.status, 0);
  assert.match(linked.stderr, /symlink/i);
  assert.equal(snapshotTree(saved), beforeLink);
  fs.unlinkSync(target);
  fs.renameSync(saved, target);
  return { ...(windows ? { shellExecutable: windowsShell, shellVersion } : {}), shell: windows ? 'powershell' : 'posix', status: 'passed', publicationResolution: 'fixture', installer: 'actual-packed-candidate',
    dryRunUnchanged: true, installedBytesMatch: true, repeatPreservesBytes: true,
    staleManagedSkillsRemoved: true, unmanagedFilePreserved: true,
    movedReleaseRejected: true, symlinkTargetRejected: true, selectedSkillIds: ids };
}
