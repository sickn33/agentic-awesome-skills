"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  ALLOWED_BUNDLE_ROOTS,
  MAX_BUNDLE_BYTES,
  MAX_BUNDLE_FILE_BYTES,
  MAX_BUNDLE_FILES,
  MAX_SKILL_BYTES,
} = require("./constants");
const { safeTempRoot } = require("./safe-io");
const { secretIdentifierLike } = require("./secret");

function posix(value) { return value.split(path.sep).join("/"); }

function assertSafeRelative(value, label = "path") {
  if (typeof value !== "string" || !value || value.includes("\0") || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`${label} contains invalid characters`);
  }
  if (path.isAbsolute(value) || value.includes("\\")) throw new Error(`${label} must be a POSIX relative path`);
  if (secretIdentifierLike(value)) throw new Error(`${label} contains secret-like material`);
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`${label} escapes its root`);
  }
  return value;
}

function sha256(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }

const REGULAR_GIT_MODES = new Set(["100644", "100755"]);

const TRACKED_CACHE = new Map();

function parseIndexRecords(output) {
  const entries = new Map();
  for (const record of output.toString("utf8").split("\0").filter(Boolean)) {
    const full = record.match(/^(\d{6}) ([0-9a-f]{40,64}) (\d)\t([\s\S]+)$/);
    if (!full) throw new Error("Unable to parse git index object");
    assertSafeRelative(full[4], "Git index path");
    if (full[3] !== "0") throw new Error(`Unmerged Git index entry rejected: ${full[4]}`);
    if (entries.has(full[4])) throw new Error(`Duplicate Git index entry rejected: ${full[4]}`);
    entries.set(full[4], full[1]);
    if (!entries.objects) Object.defineProperty(entries, "objects", { value: new Map(), enumerable: false });
    entries.objects.set(full[4], full[2]);
  }
  return entries;
}

function trackedFiles(repoRoot) {
  const output = execFileSync("git", ["ls-files", "--stage", "-z", "--", "skills"], {
    cwd: repoRoot,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
  const cacheId = `${fs.realpathSync(repoRoot)}\0${sha256(output)}`;
  if (TRACKED_CACHE.has(cacheId)) return TRACKED_CACHE.get(cacheId);
  const entries = parseIndexRecords(output);
  const eligible = [...entries].filter(([filePath, mode]) => {
    if (!REGULAR_GIT_MODES.has(mode) || !filePath.startsWith("skills/")) return false;
    return filePath.endsWith("/SKILL.md") || /\/(?:references|scripts|assets)\//.test(filePath);
  });
  const oids = [...new Set(eligible.map(([filePath]) => entries.objects.get(filePath)))];
  const input = `${oids.join("\n")}\n`;
  const checked = execFileSync("git", ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], { cwd: repoRoot, input, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  let total = 0;
  for (const line of checked.trim().split("\n").filter(Boolean)) {
    const match = line.match(/^([0-9a-f]{40,64}) blob (\d+)$/);
    if (!match) throw new Error("Unexpected frozen git object metadata");
    total += Number(match[2]) + line.length + 2;
  }
  if (!Number.isSafeInteger(total) || total > 512 * 1024 * 1024) throw new Error("Frozen Git object corpus exceeds memory boundary");
  const batch = execFileSync("git", ["cat-file", "--batch"], { cwd: repoRoot, input, encoding: null, maxBuffer: total + 1024 });
  const blobs = new Map();
  let offset = 0;
  while (offset < batch.length) {
    const newline = batch.indexOf(10, offset);
    if (newline < 0) throw new Error("Truncated frozen Git object header");
    const header = batch.subarray(offset, newline).toString("utf8");
    const match = header.match(/^([0-9a-f]{40,64}) blob (\d+)$/);
    if (!match) throw new Error("Unexpected frozen Git object header");
    const size = Number(match[2]);
    const start = newline + 1;
    const end = start + size;
    if (end >= batch.length || batch[end] !== 10) throw new Error("Truncated frozen Git object body");
    blobs.set(match[1], Buffer.from(batch.subarray(start, end)));
    offset = end + 1;
  }
  Object.defineProperty(entries, "blobs", { value: blobs, enumerable: false });
  TRACKED_CACHE.set(cacheId, entries);
  return entries;
}

function readTrackedFile(repoRoot, relPath, tracked, maxBytes, { requireUtf8 = true } = {}) {
  assertSafeRelative(relPath);
  const oid = tracked.objects?.get(relPath);
  if (!oid || !/^[0-9a-f]{40,64}$/.test(oid)) throw new Error(`Missing frozen git object: ${relPath}`);
  const bytes = tracked.blobs?.get(oid);
  if (!bytes) throw new Error(`Frozen git object bytes unavailable: ${relPath}`);
  if (bytes.length > maxBytes) throw new Error(`File exceeds byte limit: ${relPath}`);
  const algorithm = oid.length === 40 ? "sha1" : "sha256";
  const gitOid = crypto.createHash(algorithm).update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
  if (gitOid !== oid) throw new Error(`Frozen git object changed while reading: ${relPath}`);
  let text = null;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (error) { if (requireUtf8) throw error; }
  return { path: relPath, bytes, text, encoding: text === null ? "binary" : "utf-8", sha256: sha256(bytes), size: bytes.length };
}

function readRegularFile(repoRoot, relPath, maxBytes, { requireUtf8 = true } = {}) {
  assertSafeRelative(relPath);
  const absolute = path.join(repoRoot, ...relPath.split("/"));
  const rootReal = fs.realpathSync(repoRoot);
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const fd = fs.openSync(absolute, flags);
  let bytes;
  let stat;
  try {
    stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new Error(`Not a regular file: ${relPath}`);
    if (stat.size > maxBytes) throw new Error(`File exceeds byte limit: ${relPath}`);
    const real = fs.realpathSync(absolute);
    if (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`)) throw new Error(`File escapes repository: ${relPath}`);
    bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    if (after.dev !== stat.dev || after.ino !== stat.ino || after.size !== bytes.length || after.mtimeMs !== stat.mtimeMs) throw new Error(`File changed while reading: ${relPath}`);
  } finally { fs.closeSync(fd); }
  let text = null;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (error) {
    if (requireUtf8) throw error;
  }
  return { path: relPath, bytes, text, encoding: text === null ? "binary" : "utf-8", sha256: sha256(bytes), size: bytes.length };
}

function discoverBundle(repoRoot, skillId, tracked = trackedFiles(repoRoot)) {
  assertSafeRelative(skillId, "skill id");
  const base = `skills/${skillId}`;
  const skillPath = `${base}/SKILL.md`;
  if (!tracked.has(skillPath)) throw new Error(`Canonical skill is not tracked: ${skillPath}`);
  if (!REGULAR_GIT_MODES.has(tracked.get(skillPath))) throw new Error(`Canonical skill has unsafe git mode: ${skillPath}`);
  const primary = readTrackedFile(repoRoot, skillPath, tracked, MAX_SKILL_BYTES);
  const candidates = [...tracked.keys()].filter((item) => item.startsWith(`${base}/`)).sort();
  const files = [primary];
  let bundleBytes = 0;
  for (const relPath of candidates) {
    if (relPath === skillPath) continue;
    const suffix = relPath.slice(base.length + 1);
    const root = suffix.split("/")[0];
    if (!ALLOWED_BUNDLE_ROOTS.includes(root)) continue;
    if (!REGULAR_GIT_MODES.has(tracked.get(relPath))) throw new Error(`Bundle file has unsafe git mode: ${relPath}`);
    // Supplemental files participate byte-for-byte in bundle identity. Binary
    // archives/assets are hashed but never parsed, rendered, or sent to Codex.
    const file = readTrackedFile(repoRoot, relPath, tracked, MAX_BUNDLE_FILE_BYTES, { requireUtf8: false });
    bundleBytes += file.size;
    if (bundleBytes > MAX_BUNDLE_BYTES) throw new Error(`Bundle exceeds byte limit: ${skillId}`);
    files.push(file);
    if (files.length - 1 > MAX_BUNDLE_FILES) throw new Error(`Bundle exceeds file limit: ${skillId}`);
  }
  const identity = files.map((file) => `${file.path}\0${file.sha256}\0${file.size}`).join("\n");
  return { skillId, skillPath, files, bundleHash: sha256(Buffer.from(identity)) };
}

function bundleMap(bundle) { return new Map(bundle.files.map((file) => [file.path, file.text])); }

function listCanonicalSkillIds(repoRoot, tracked = trackedFiles(repoRoot)) {
  const result = [];
  for (const [filePath, mode] of tracked.entries()) {
    if (!filePath.startsWith("skills/") || !filePath.endsWith("/SKILL.md")) continue;
    if (!REGULAR_GIT_MODES.has(mode)) throw new Error(`Canonical skill has unsafe git mode: ${filePath}`);
    const skillId = filePath.slice("skills/".length, -"/SKILL.md".length);
    result.push(skillId);
  }
  return result.sort();
}

function materializeBundle(bundle) {
  const root = fs.mkdtempSync(path.join(safeTempRoot(), "aas-review-snapshot-"));
  try {
    for (const file of bundle.files) {
      assertSafeRelative(file.path);
      const target = path.join(root, ...file.path.split("/"));
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      fs.writeFileSync(target, file.bytes, { flag: "wx", mode: 0o600 });
    }
    const files = bundle.files.map((file, index) => readRegularFile(root, file.path, index === 0 ? MAX_SKILL_BYTES : MAX_BUNDLE_FILE_BYTES, { requireUtf8: index === 0 || file.encoding === "utf-8" }));
    const identity = files.map((file) => `${file.path}\0${file.sha256}\0${file.size}`).join("\n");
    const bundleHash = sha256(Buffer.from(identity));
    if (bundleHash !== bundle.bundleHash) throw new Error("Isolated snapshot hash mismatch");
    return { root, bundle: { ...bundle, files, bundleHash } };
  } catch (error) {
    fs.rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function disposeSnapshot(snapshot) {
  if (!snapshot?.root || !path.basename(snapshot.root).startsWith("aas-review-snapshot-")) throw new Error("Invalid snapshot cleanup target");
  fs.rmSync(snapshot.root, { recursive: true, force: true });
}

module.exports = { assertSafeRelative, bundleMap, discoverBundle, disposeSnapshot, listCanonicalSkillIds, materializeBundle, parseIndexRecords, readRegularFile, sha256, trackedFiles };
