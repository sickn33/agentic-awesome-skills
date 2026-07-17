"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertNoSymlinkAncestors(absolutePath) {
  const parsed = path.parse(absolutePath);
  let cursor = parsed.root;
  for (const part of absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    try {
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink()) throw new Error(`Result path contains a symlink component: ${cursor}`);
      const sharedWritable = (stat.mode & 0o022) !== 0;
      const trustedStickyRoot = stat.uid === 0 && (stat.mode & 0o1000) !== 0;
      if (typeof process.getuid === "function" && stat.uid !== 0 && stat.uid !== process.getuid()) throw new Error(`Result path has an untrusted owner: ${cursor}`);
      if (sharedWritable && !trustedStickyRoot) throw new Error(`Result path has a replaceable ancestor: ${cursor}`);
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
}

function ensureOutputRoot(resultDir, repoRoot) {
  let resolved = path.resolve(resultDir);
  for (const alias of ["/var", "/tmp"]) {
    try {
      if ((resolved === alias || resolved.startsWith(`${alias}/`)) && fs.lstatSync(alias).isSymbolicLink()) {
        resolved = `${fs.realpathSync(alias)}${resolved.slice(alias.length)}`;
      }
    } catch {}
  }
  const repo = fs.realpathSync(repoRoot);
  if (isWithin(repo, resolved)) throw new Error("Result directory must be outside the repository");
  assertNoSymlinkAncestors(resolved);
  fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  fs.chmodSync(resolved, 0o700);
  assertNoSymlinkAncestors(resolved);
  const stat = fs.lstatSync(resolved);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Result directory must be a real directory");
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) throw new Error("Result directory must be owned by the current user");
  if ((stat.mode & 0o777) !== 0o700) throw new Error("Result directory permissions must be exactly 0700");
  const real = fs.realpathSync(resolved);
  if (isWithin(repo, real)) throw new Error("Result directory resolves into protected repository content");
  const flags = fs.constants.O_RDONLY | (fs.constants.O_DIRECTORY || 0) | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(resolved, flags);
  const opened = fs.fstatSync(fd);
  if (!opened.isDirectory()) { fs.closeSync(fd); throw new Error("Result root descriptor is not a directory"); }
  const anchor = `/dev/fd/${fd}`;
  const named = fs.statSync(resolved);
  if (named.dev !== opened.dev || named.ino !== opened.ino) { fs.closeSync(fd); throw new Error("Result root changed while opening"); }
  fs.closeSync(fd);
  return { path: resolved, real };
}

function resolveOutputPath(outputRoot, relativePath) {
  if (typeof relativePath !== "string" || !relativePath || path.isAbsolute(relativePath) || relativePath.includes("\0")) {
    throw new Error("Output path must be a safe relative path");
  }
  const normalized = path.normalize(relativePath);
  if (normalized !== relativePath || normalized === ".." || normalized.startsWith(`..${path.sep}`)) throw new Error("Output path escapes result directory");
  const target = path.join(outputRoot.path, relativePath);
  if (!isWithin(outputRoot.path, target)) throw new Error("Output path escapes result directory");
  return target;
}

function ensureSafeParents(outputRoot, target) {
  const parent = path.dirname(target);
  let cursor = outputRoot.path;
  const relative = path.relative(outputRoot.path, parent);
  for (const part of relative.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    let stat;
    try { stat = fs.lstatSync(cursor); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      fs.mkdirSync(cursor, { mode: 0o700 });
      stat = fs.lstatSync(cursor);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Unsafe output directory component: ${cursor}`);
    fs.chmodSync(cursor, 0o700);
    stat = fs.lstatSync(cursor);
    if ((stat.mode & 0o777) !== 0o700) throw new Error(`Output directory permissions must be exactly 0700: ${cursor}`);
    const real = fs.realpathSync(cursor);
    if (!isWithin(outputRoot.real, real)) throw new Error("Output parent escapes physical result directory");
  }
  const parentReal = fs.realpathSync(parent);
  if (!isWithin(outputRoot.real, parentReal)) throw new Error("Output parent escapes physical result directory");
}

function atomicWrite(outputRoot, relativePath, bytes) {
  const target = resolveOutputPath(outputRoot, relativePath);
  ensureSafeParents(outputRoot, target);
  if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw new Error("Refusing to replace output symlink");
  const temp = `${target}.${process.pid}.${crypto.randomBytes(8).toString("hex")}.tmp`;
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0);
  let fd;
  try {
    fd = fs.openSync(temp, flags, 0o600);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temp, target);
    const dirFd = fs.openSync(path.dirname(target), fs.constants.O_RDONLY);
    try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temp); } catch {}
    throw error;
  }
  return target;
}

// Create a durable artifact without ever replacing an existing path. Linking the
// fully-written temporary file into place gives us O_EXCL-like publication while
// retaining atomic visibility for readers.
function atomicWriteNew(outputRoot, relativePath, bytes) {
  const target = resolveOutputPath(outputRoot, relativePath);
  ensureSafeParents(outputRoot, target);
  if (fs.existsSync(target)) throw new Error(`Refusing to overwrite output artifact: ${relativePath}`);
  const temp = `${target}.${process.pid}.${crypto.randomBytes(8).toString("hex")}.tmp`;
  const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0);
  let fd;
  try {
    fd = fs.openSync(temp, flags, 0o600);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.linkSync(temp, target);
    fs.unlinkSync(temp);
    const dirFd = fs.openSync(path.dirname(target), fs.constants.O_RDONLY);
    try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
  } catch (error) {
    if (fd !== undefined) fs.closeSync(fd);
    try { fs.unlinkSync(temp); } catch {}
    throw error;
  }
  return target;
}

module.exports = { atomicWrite, atomicWriteNew, ensureOutputRoot, isWithin, resolveOutputPath };
