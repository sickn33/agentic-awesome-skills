"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { canonicalJson, sha256 } = require("../canonical-json");
const { DIGEST_VERSION, cacheError } = require("./identity");

const DEFAULT_LIMITS = Object.freeze({
  maxFiles: 128,
  maxEntries: 256,
  maxFileBytes: 32 * 1024 * 1024,
  maxTotalBytes: 128 * 1024 * 1024,
  maxDepth: 8,
});

function collisionKey(relativePath) {
  return relativePath.normalize("NFKC").toLowerCase();
}

function validateRelativeAssetPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512 || value.includes("\0") || value.includes("\\")) {
    throw cacheError("AAS_CACHE_ASSET_PATH_INVALID", "catalog asset path is invalid");
  }
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    throw cacheError("AAS_CACHE_ASSET_PATH_INVALID", `absolute catalog asset path is forbidden: ${value}`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw cacheError("AAS_CACHE_ASSET_PATH_INVALID", `catalog asset traversal is forbidden: ${value}`);
  }
  if (path.posix.normalize(value) !== value) {
    throw cacheError("AAS_CACHE_ASSET_PATH_INVALID", `catalog asset path is not normalized: ${value}`);
  }
  return value;
}

function normalizeLimits(limits = {}) {
  const merged = { ...DEFAULT_LIMITS, ...limits };
  for (const [key, value] of Object.entries(merged)) {
    if (!Number.isSafeInteger(value) || value < 1) throw cacheError("AAS_CACHE_LIMIT_INVALID", `${key} must be a positive safe integer`);
  }
  return merged;
}

function normalizeAllowlist(allowlist) {
  if (!Array.isArray(allowlist) || allowlist.length === 0) {
    throw cacheError("AAS_CACHE_ALLOWLIST_INVALID", "a non-empty explicit catalog asset allowlist is required");
  }
  const seen = new Map();
  return allowlist.map(validateRelativeAssetPath).sort().map((assetPath) => {
    const key = collisionKey(assetPath);
    if (seen.has(key)) {
      throw cacheError("AAS_CACHE_PATH_COLLISION", `allowlist paths collide: ${seen.get(key)} and ${assetPath}`);
    }
    seen.set(key, assetPath);
    return assetPath;
  });
}

function assertSafeMode(stat, relativePath, isDirectory) {
  if ((stat.mode & 0o7000) !== 0 || (stat.mode & 0o022) !== 0 || (!isDirectory && (stat.mode & 0o111) !== 0)) {
    throw cacheError("AAS_CACHE_MODE_UNSAFE", `anomalous permissions on catalog input: ${relativePath || "."}`);
  }
}

async function readRegularFileNoFollow(absolutePath, relativePath, priorStat, limits) {
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  let handle;
  try {
    handle = await fsp.open(absolutePath, flags);
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1 || before.dev !== priorStat.dev || before.ino !== priorStat.ino) {
      throw cacheError("AAS_CACHE_INPUT_CHANGED", `catalog input changed during validation: ${relativePath}`);
    }
    if (before.size > limits.maxFileBytes) throw cacheError("AAS_CACHE_FILE_LIMIT", `catalog asset exceeds the file-size limit: ${relativePath}`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.length !== before.size || after.size !== before.size || after.dev !== before.dev || after.ino !== before.ino) {
      throw cacheError("AAS_CACHE_INPUT_CHANGED", `catalog input changed while being read: ${relativePath}`);
    }
    return bytes;
  } finally {
    if (handle) await handle.close();
  }
}

async function scanDataDirectory({ sourceDir, allowlist, ignoredPaths = [], limits }) {
  if (typeof sourceDir !== "string" || sourceDir.length === 0 || sourceDir.includes("\0")) {
    throw cacheError("AAS_CACHE_SOURCE_INVALID", "catalog source directory is invalid");
  }
  const normalizedAllowlist = normalizeAllowlist(allowlist);
  const ignored = new Set(ignoredPaths.map(validateRelativeAssetPath));
  for (const ignoredPath of ignored) {
    if (normalizedAllowlist.includes(ignoredPath)) throw cacheError("AAS_CACHE_ALLOWLIST_INVALID", `ignored path is also allowlisted: ${ignoredPath}`);
  }
  const bounded = normalizeLimits(limits);
  const root = path.resolve(sourceDir);
  const rootStat = await fsp.lstat(root).catch((error) => {
    if (error.code === "ENOENT") throw cacheError("AAS_CACHE_SOURCE_MISSING", "catalog source directory does not exist");
    throw error;
  });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw cacheError("AAS_CACHE_SOURCE_INVALID", "catalog source must be a real directory");
  assertSafeMode(rootStat, "", true);

  const allowed = new Set(normalizedAllowlist);
  const allowedDirectories = new Set();
  for (const assetPath of [...normalizedAllowlist, ...ignored]) {
    const segments = assetPath.split("/");
    for (let index = 1; index < segments.length; index += 1) allowedDirectories.add(segments.slice(0, index).join("/"));
  }
  const collisionPaths = new Map();
  const records = [];
  const ignoredRecords = [];
  let entryCount = 0;
  let totalBytes = 0;

  async function walk(relativeDirectory) {
    const directory = relativeDirectory ? path.join(root, ...relativeDirectory.split("/")) : root;
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      entryCount += 1;
      if (entryCount > bounded.maxEntries) throw cacheError("AAS_CACHE_ENTRY_LIMIT", "catalog input exceeds the entry-count limit");
      if (entry.name.includes("/") || entry.name.includes("\\") || entry.name === "." || entry.name === ".." || entry.name.includes("\0")) {
        throw cacheError("AAS_CACHE_ASSET_PATH_INVALID", "catalog input contains an unsafe directory entry");
      }
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      validateRelativeAssetPath(relativePath);
      if (relativePath.split("/").length > bounded.maxDepth) throw cacheError("AAS_CACHE_DEPTH_LIMIT", `catalog input exceeds maximum depth: ${relativePath}`);
      const key = collisionKey(relativePath);
      if (collisionPaths.has(key)) throw cacheError("AAS_CACHE_PATH_COLLISION", `catalog paths collide: ${collisionPaths.get(key)} and ${relativePath}`);
      collisionPaths.set(key, relativePath);

      const absolutePath = path.join(root, ...relativePath.split("/"));
      const stat = await fsp.lstat(absolutePath);
      if (stat.isSymbolicLink()) throw cacheError("AAS_CACHE_LINK_FORBIDDEN", `symbolic links are forbidden: ${relativePath}`);
      if (stat.isDirectory()) {
        if (!allowedDirectories.has(relativePath)) throw cacheError("AAS_CACHE_ASSET_NOT_ALLOWED", `directory is not allowlisted: ${relativePath}`);
        assertSafeMode(stat, relativePath, true);
        await walk(relativePath);
        continue;
      }
      if (!stat.isFile()) throw cacheError("AAS_CACHE_SPECIAL_FILE_FORBIDDEN", `special files are forbidden: ${relativePath}`);
      if (stat.nlink !== 1) throw cacheError("AAS_CACHE_HARDLINK_FORBIDDEN", `hard-linked files are forbidden: ${relativePath}`);
      assertSafeMode(stat, relativePath, false);
      if (!allowed.has(relativePath) && !ignored.has(relativePath)) {
        throw cacheError("AAS_CACHE_ASSET_NOT_ALLOWED", `file is not allowlisted: ${relativePath}`);
      }
      const bytes = await readRegularFileNoFollow(absolutePath, relativePath, stat, bounded);
      totalBytes += bytes.length;
      if (totalBytes > bounded.maxTotalBytes) throw cacheError("AAS_CACHE_TOTAL_LIMIT", "catalog input exceeds the expanded-byte limit");
      const record = { path: relativePath, size: bytes.length, sha256: sha256(bytes), bytes };
      if (ignored.has(relativePath)) ignoredRecords.push(record);
      else records.push(record);
    }
  }

  await walk("");
  if (records.length > bounded.maxFiles) throw cacheError("AAS_CACHE_FILE_COUNT_LIMIT", "catalog input exceeds the file-count limit");
  const found = new Set(records.map((record) => record.path));
  const missing = normalizedAllowlist.filter((assetPath) => !found.has(assetPath));
  if (missing.length > 0) throw cacheError("AAS_CACHE_ASSET_MISSING", `required catalog asset is missing: ${missing[0]}`);
  records.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const publicRecords = records.map(({ path: assetPath, size, sha256: digest }) => ({ path: assetPath, size, sha256: digest }));
  const publicIgnoredRecords = ignoredRecords.map(({ path: assetPath, size, sha256: digest }) => ({ path: assetPath, size, sha256: digest }));
  const catalogDigest = sha256(canonicalJson({ digestVersion: DIGEST_VERSION, assets: publicRecords }));
  return { catalogDigest, records, ignoredRecords, publicRecords, publicIgnoredRecords, totalBytes };
}

module.exports = {
  DEFAULT_LIMITS,
  collisionKey,
  normalizeAllowlist,
  normalizeLimits,
  scanDataDirectory,
  validateRelativeAssetPath,
};
