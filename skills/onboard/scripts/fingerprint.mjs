#!/usr/bin/env node
// Print a read-only material fingerprint.
// Hashes file metadata plus, for files up to a size cap, their content —
// so equal-size equal-mtime rewrites are still detected. Never reads or
// reports the contents of secret-named files; material never leaves the machine.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const rootArg = process.argv[2] || '.';
const expected = process.argv[3];
const GIT_COMMON = ['-c', 'core.fsmonitor=false']; // never run repo-configured fsmonitor helpers
const GIT_STATUS_ARGS = ['status', '--porcelain=v1', '-z', '--untracked-files=all'];
const CONTENT_CAP = 512 * 1024;          // files up to this size are content-hashed
const MAX_GIT_OUTPUT = 64 * 1024 * 1024; // guard against ENOBUFS on huge repos
const GIT_TIMEOUT = 30_000;
const MAX_NESTED_DEPTH = 5;
const OMITTED_DIRS = new Set(['.git', '项目拆解包', 'node_modules', '.venv', 'venv', 'dist', 'build', 'coverage', '__pycache__']);
const SECRET_NAME = /^(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|keystore)$|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$|\.npmrc$|\.netrc$|\.git-credentials$|.*credentials?\.json$|service-account.*\.json$|.*\.secret\.[^/]*$|secrets?\.[^/]*$)/i;

const notes = [];

function normalizeRoot(p) {
  try { p = realpathSync(p); } catch { /* keep the resolved path */ }
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

function sortedEntries(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return entries;
}

function include(path) {
  const parts = path.replaceAll('\\', '/').split('/');
  return !parts.some(part => {
    if (/^\.env\.(?:example|sample|template)$/i.test(part)) return false;
    return OMITTED_DIRS.has(part) || SECRET_NAME.test(part);
  });
}

// Recursively fingerprint one directory (git-aware). Used for the root and,
// with increasing depth, for nested repositories the outer repo cannot see into.
function fingerprint(dir, depth) {
  const hash = createHash('sha256');
  let files = 0;
  let bytes = 0;

  const mix = line => { hash.update(`${line}\n`); };
  const add = path => {
    if (!include(path)) return;
    const full = join(dir, path);
    let info;
    try { info = lstatSync(full); } catch { notes.push(`unreadable: ${path}`); return; }
    if (!info.isFile()) return;
    files++;
    bytes += info.size;
    if (info.size <= CONTENT_CAP) {
      try {
        mix(`${path.replaceAll('\\', '/')}\0${info.size}\0c:${createHash('sha256').update(readFileSync(full)).digest('hex')}`);
        return;
      } catch { notes.push(`unreadable: ${path}`); }
    }
    mix(`${path.replaceAll('\\', '/')}\0${info.size}\0m:${info.mtimeMs}`);
  };
  const walk = current => {
    for (const item of sortedEntries(current)) {
      const full = join(current, item.name);
      const path = relative(dir, full);
      if (!include(path) || item.isSymbolicLink()) continue;
      if (item.isDirectory()) walk(full);
      else if (item.isFile()) add(path);
    }
  };
  const gitRun = (args, { fatal = false } = {}) => {
    try {
      return execFileSync('git', ['-C', dir, ...GIT_COMMON, ...args],
        { encoding: 'utf8', maxBuffer: MAX_GIT_OUTPUT, timeout: GIT_TIMEOUT, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (e) {
      if (fatal) {
        console.error(`git ${args[0]} failed: ${String(e.message).slice(0, 160)}`);
        console.error('材料指纹无法可靠计算（Git 调用失败）。不要把这次的输出当作「材料未变」的依据。');
        process.exit(2);
      }
      return null;
    }
  };

  let mode = 'files';
  let head = '';
  const topLevel = gitRun(['rev-parse', '--show-toplevel']);
  const isRepo = topLevel !== null &&
    normalizeRoot(resolve(topLevel.trim())) === (process.platform === 'win32' ? dir.toLowerCase() : dir);

  if (isRepo && depth <= MAX_NESTED_DEPTH) {
    mode = 'git';
    const headOut = gitRun(['rev-parse', 'HEAD']);
    if (headOut === null) notes.push('仓库还没有提交（unborn HEAD），指纹基于工作区状态');
    else { head = headOut.trim(); mix(`HEAD\0${head}`); }

    const status = gitRun(GIT_STATUS_ARGS, { fatal: true });
    const entries = status.split('\0').filter(Boolean);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const path = entry.slice(3);
      const renamed = entry[0] === 'R' || entry[1] === 'R' || entry[0] === 'C' || entry[1] === 'C';
      const original = renamed ? entries[++i] : '';
      const pathOk = include(path);
      const originalOk = original ? include(original) : false;
      if (!pathOk && !originalOk) continue; // both sides secret/omitted: excluded by design
      // A rename across the filter boundary must still change the fingerprint.
      mix(`${entry.slice(0, 2)}\0${pathOk ? path : '[filtered]'}\0${originalOk ? original : original ? '[filtered]' : ''}`);
      if (pathOk) add(path);
    }

    // Ignored material is real material (handover notes, local data …) and is
    // invisible to both HEAD and status, so it gets hashed explicitly.
    const ignored = gitRun(['ls-files', '--others', '--ignored', '--exclude-standard', '-z'], { fatal: true });
    for (const path of ignored.split('\0').filter(Boolean)) add(path);

    // Nested repositories: the parent's status only shows a coarse entry for
    // them, so hash each one's own fingerprint recursively.
    const nested = [];
    const findNested = current => {
      for (const item of sortedEntries(current)) {
        const full = join(current, item.name);
        const path = relative(dir, full);
        if (!include(path) || !item.isDirectory() || item.isSymbolicLink()) continue;
        const dotGit = join(full, '.git');
        let isNestedRepo = false;
        if (existsSync(dotGit)) {
          if (statSync(dotGit).isDirectory()) isNestedRepo = true;
          else {
            try { isNestedRepo = readFileSync(dotGit, 'utf8').slice(0, 8) === 'gitdir: '; } catch { isNestedRepo = false; }
          }
        }
        if (isNestedRepo && depth < MAX_NESTED_DEPTH) nested.push({ path, dir: full });
        else if (!isNestedRepo) findNested(full);
      }
    };
    findNested(dir);
    for (const { path, dir: sub } of nested) {
      const subFp = fingerprint(sub, depth + 1);
      mix(`nested\0${path.replaceAll('\\', '/')}\0${subFp.hash}\0${subFp.head ? `HEAD:${subFp.head}` : 'no-commit'}`);
    }
  } else {
    walk(dir);
  }

  return { hash: hash.digest('hex'), mode, head, files, bytes };
}

const root = normalizeRoot(resolve(rootArg));
if (!root || !existsSync(root) || !lstatSync(root).isDirectory()) {
  console.error(`Directory not found: ${rootArg}`);
  process.exit(2);
}

const result = fingerprint(root, 0);
console.log(`fingerprint: ${result.hash}`);
console.log(`mode: ${result.mode}${result.head ? `; HEAD: ${result.head}` : ''}`);
console.log(`changed files: ${result.files}; changed bytes: ${result.bytes}`);
if (notes.length) console.error(`notes:\n- ${notes.slice(0, 10).join('\n- ')}`);
if (expected) {
  const match = expected === result.hash;
  console.log(`comparison: ${match ? 'same' : 'changed'}`);
  if (!match) process.exitCode = 1;
}
