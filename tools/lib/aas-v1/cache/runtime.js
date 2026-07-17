"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { fsyncDirectoryAsync } = require("../durability");
const { canonicalJson, sha256 } = require("../canonical-json");
const { parsePackageArchive } = require("./archive");
const {
  CATALOG_PACKAGE,
  DIGEST_VERSION,
  RUNTIME_IDENTITY_FILE,
  cacheError,
  parseNpmIntegrity,
  runtimeCachePath,
  validateCacheRoot,
  validatePackageVersion,
} = require("./identity");
const { REGISTRY_ORIGIN, fetchBytes, verifySri } = require("./update");

const MAX_RUNTIME_IDENTITY_BYTES = 4 * 1024 * 1024;
const RUNTIME_ARCHIVE_LIMITS = Object.freeze({
  maxEntries: 10000,
  maxSingleFileBytes: 32 * 1024 * 1024,
  maxExpandedTotalBytes: 160 * 1024 * 1024,
  maxCompressionRatio: 128,
});
const REQUIRED_RUNTIME_FILES = Object.freeze([
  "package.json",
  "tools/bin/aas-mcp.js",
  "tools/lib/aas-v1/index.js",
  "data/aas-v1/catalog-manifest.v1.json",
  "data/catalog.json",
  "data/plugin-compatibility.json",
  "skills_index.json",
]);
const REQUIRED_BUNDLED_DEPENDENCIES = Object.freeze(["ajv", "sanitize-filename", "yaml"]);

function allowedRuntimeAsset(relativePath) {
  return relativePath === "package.json"
    || relativePath === "tools/bin/aas-mcp.js"
    || relativePath.startsWith("tools/lib/aas-v1/")
    || relativePath.startsWith("data/aas-v1/")
    || relativePath === "data/catalog.json"
    || relativePath === "data/plugin-compatibility.json"
    || relativePath === "skills_index.json"
    || relativePath.startsWith("skills/")
    || relativePath.startsWith("schemas/aas-v1/")
    || relativePath.startsWith("node_modules/");
}

function privateModeUnsafe(stat) {
  return process.platform !== "win32" && (stat.mode & 0o077) !== 0;
}

function publicRuntimeIdentity(identity) {
  return Object.freeze({
    package: identity.package,
    version: identity.version,
    integrity: identity.integrity,
    closureDigest: identity.closureDigest,
  });
}

function validateRuntimeIdentity(identity, expected = {}) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "runtime identity must be an object");
  }
  const allowed = new Set(["schemaVersion", "package", "version", "integrity", "closureDigest", "digestVersion", "assets", "provenance"]);
  for (const key of Object.keys(identity)) {
    if (!allowed.has(key)) throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", `unknown runtime identity field: ${key}`);
  }
  if (identity.schemaVersion !== 1 || identity.package !== CATALOG_PACKAGE || identity.digestVersion !== DIGEST_VERSION) {
    throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "runtime identity is incompatible");
  }
  const version = validatePackageVersion(identity.version);
  const integrity = parseNpmIntegrity(identity.integrity).integrity;
  if (typeof identity.closureDigest !== "string" || !/^sha256-[0-9a-f]{64}$/.test(identity.closureDigest)) {
    throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "runtime closure digest is invalid");
  }
  if (!Array.isArray(identity.assets) || identity.assets.length === 0 || identity.assets.length > RUNTIME_ARCHIVE_LIMITS.maxEntries) {
    throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "runtime asset records are invalid");
  }
  const seen = new Set();
  const assets = identity.assets.map((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)
      || Object.keys(record).sort().join(",") !== "path,sha256,size"
      || typeof record.path !== "string" || !record.path.startsWith("package/") || record.path.includes("\\")
      || record.path.split("/").some((part) => !part || part === "." || part === "..")
      || !Number.isSafeInteger(record.size) || record.size < 0
      || !/^sha256-[0-9a-f]{64}$/.test(record.sha256) || seen.has(record.path)) {
      throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "runtime asset record is invalid");
    }
    seen.add(record.path);
    return { path: record.path, size: record.size, sha256: record.sha256 };
  }).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const provenance = identity.provenance;
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)
    || Object.keys(provenance).sort().join(",") !== "attestationsPresent,registryOrigin,signaturesPresent"
    || provenance.registryOrigin !== REGISTRY_ORIGIN || typeof provenance.signaturesPresent !== "boolean"
    || typeof provenance.attestationsPresent !== "boolean") {
    throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "runtime provenance is invalid");
  }
  const normalized = {
    schemaVersion: 1,
    package: CATALOG_PACKAGE,
    version,
    integrity,
    closureDigest: identity.closureDigest,
    digestVersion: DIGEST_VERSION,
    assets,
    provenance: { ...provenance },
  };
  if (sha256(canonicalJson({ digestVersion: DIGEST_VERSION, assets })) !== normalized.closureDigest) {
    throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "runtime asset records do not match the closure digest");
  }
  for (const key of ["package", "version", "integrity", "closureDigest"]) {
    if (expected[key] !== undefined && normalized[key] !== expected[key]) {
      throw cacheError("AAS_RUNTIME_IDENTITY_MISMATCH", `runtime identity ${key} does not match the expected value`);
    }
  }
  return normalized;
}

function releaseMetadataUrl(version) {
  return `${REGISTRY_ORIGIN}/${CATALOG_PACKAGE}/${validatePackageVersion(version)}`;
}

async function inspectRuntimeRelease({ version, fetcher = fetchBytes }) {
  const packageVersion = validatePackageVersion(version);
  const bytes = await fetcher(releaseMetadataUrl(packageVersion), 2 * 1024 * 1024);
  let metadata;
  try { metadata = JSON.parse(bytes.toString("utf8")); } catch {
    throw cacheError("AAS_RUNTIME_PACKUMENT_INVALID", "registry metadata is invalid JSON");
  }
  const dist = metadata?.dist;
  if (metadata?.name !== CATALOG_PACKAGE || metadata?.version !== packageVersion
    || !dist || typeof dist.integrity !== "string" || typeof dist.tarball !== "string") {
    throw cacheError("AAS_RUNTIME_PACKUMENT_INVALID", "registry metadata lacks the exact runtime identity");
  }
  const integrity = parseNpmIntegrity(dist.integrity).integrity;
  const tarball = new URL(dist.tarball);
  if (tarball.origin !== REGISTRY_ORIGIN || tarball.protocol !== "https:") {
    throw cacheError("AAS_RUNTIME_TARBALL_URL_INVALID", "runtime tarball URL is outside the pinned npm origin");
  }
  return {
    package: CATALOG_PACKAGE,
    version: packageVersion,
    integrity,
    tarballUrl: tarball.href,
    provenance: {
      registryOrigin: REGISTRY_ORIGIN,
      distIntegrity: integrity,
      signaturesPresent: Array.isArray(dist.signatures) && dist.signatures.length > 0,
      attestationsPresent: Boolean(dist.attestations),
    },
  };
}

function runtimeRecords(entries, version) {
  if (entries.some((entry) => !entry.path.startsWith("package/"))) {
    throw cacheError("AAS_RUNTIME_ARCHIVE_ROOT_INVALID", "runtime archive contains a file outside the npm package root");
  }
  const selectedEntries = entries.filter((entry) => allowedRuntimeAsset(entry.path.slice("package/".length)));
  const byPath = new Map(selectedEntries.map((entry) => [entry.path.slice("package/".length), entry]));
  for (const required of REQUIRED_RUNTIME_FILES) {
    if (!byPath.has(required)) throw cacheError("AAS_RUNTIME_FILE_MISSING", `runtime archive is missing ${required}`);
  }
  let metadata;
  try { metadata = JSON.parse(byPath.get("package.json").bytes.toString("utf8")); } catch {
    throw cacheError("AAS_RUNTIME_PACKAGE_INVALID", "runtime package metadata is invalid");
  }
  const bin = typeof metadata.bin === "string" ? { [CATALOG_PACKAGE]: metadata.bin } : metadata.bin;
  if (metadata.name !== CATALOG_PACKAGE || metadata.version !== version || bin?.["aas-mcp"] !== "tools/bin/aas-mcp.js") {
    throw cacheError("AAS_RUNTIME_PACKAGE_INVALID", "runtime package metadata does not expose the expected MCP binary");
  }
  const bundled = metadata.bundledDependencies || metadata.bundleDependencies;
  if (!Array.isArray(bundled)
    || REQUIRED_BUNDLED_DEPENDENCIES.some((dependency) => !bundled.includes(dependency))
    || REQUIRED_BUNDLED_DEPENDENCIES.some((dependency) => !byPath.has(`node_modules/${dependency}/package.json`))) {
    throw cacheError("AAS_RUNTIME_DEPENDENCY_CLOSURE_MISSING", "runtime package lacks its declared verified dependency closure");
  }
  const records = selectedEntries.map((entry) => ({ path: entry.path, size: entry.bytes.length, sha256: sha256(entry.bytes), bytes: entry.bytes }))
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const assets = records.map(({ path: assetPath, size, sha256: digest }) => ({ path: assetPath, size, sha256: digest }));
  return { records, assets, closureDigest: sha256(canonicalJson({ digestVersion: DIGEST_VERSION, assets })) };
}

async function ensureRealDirectory(directoryPath, created) {
  try {
    const stat = await fsp.lstat(directoryPath);
    if (!stat.isDirectory() || stat.isSymbolicLink() || privateModeUnsafe(stat)) {
      throw cacheError("AAS_RUNTIME_DIRECTORY_UNSAFE", "runtime cache path is not a private real directory");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = path.dirname(directoryPath);
    if (parent !== directoryPath) await ensureRealDirectory(parent, created);
    try {
      await fsp.mkdir(directoryPath, { mode: 0o700 });
      created.push(directoryPath);
    } catch (mkdirError) {
      if (mkdirError.code !== "EEXIST") throw mkdirError;
      const stat = await fsp.lstat(directoryPath);
      if (!stat.isDirectory() || stat.isSymbolicLink() || privateModeUnsafe(stat)) {
        throw cacheError("AAS_RUNTIME_DIRECTORY_UNSAFE", "runtime cache path is not a private real directory");
      }
    }
  }
}

async function fsyncDirectory(directoryPath) {
  await fsyncDirectoryAsync(directoryPath);
}

async function writeExclusive(filePath, bytes, { sync = true } = {}) {
  const handle = await fsp.open(filePath, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.chmod(0o600);
    if (sync) await handle.sync();
  } finally { await handle.close(); }
}

async function readRuntimeAsset(targetPath, record) {
  const absolute = path.join(targetPath, ...record.path.split("/"));
  const stat = await fsp.lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || privateModeUnsafe(stat) || stat.size !== record.size) {
    throw cacheError("AAS_RUNTIME_CONTENT_MISMATCH", "cached runtime contains an unsafe or changed asset");
  }
  const handle = await fsp.open(absolute, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const before = await handle.stat();
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || sha256(bytes) !== record.sha256) {
      throw cacheError("AAS_RUNTIME_CONTENT_MISMATCH", "cached runtime changed during verification");
    }
  } finally { await handle.close(); }
}

async function listRuntimeFiles(root, relative = "") {
  const directory = relative ? path.join(root, ...relative.split("/")) : root;
  const stat = await fsp.lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || privateModeUnsafe(stat)) {
    throw cacheError("AAS_RUNTIME_CONTENT_MISMATCH", "cached runtime contains an unsafe directory");
  }
  const found = [];
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  for (const entry of entries) {
    const next = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(root, ...next.split("/"));
    const entryStat = await fsp.lstat(absolute);
    if (entryStat.isSymbolicLink()) throw cacheError("AAS_RUNTIME_CONTENT_MISMATCH", "cached runtime contains a link");
    if (entryStat.isDirectory()) found.push(...await listRuntimeFiles(root, next));
    else if (entryStat.isFile()) found.push(next);
    else throw cacheError("AAS_RUNTIME_CONTENT_MISMATCH", "cached runtime contains a special file");
  }
  return found;
}

async function runtimeStatus({ cacheRoot, packageVersion, integrity, closureDigest }) {
  const targetPath = runtimeCachePath({ cacheRoot, packageVersion, integrity });
  try {
    const stat = await fsp.lstat(targetPath);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw cacheError("AAS_RUNTIME_TARGET_INVALID", "runtime cache target is not a real directory");
    const identityPath = path.join(targetPath, RUNTIME_IDENTITY_FILE);
    const identityStat = await fsp.lstat(identityPath);
    if (!identityStat.isFile() || identityStat.isSymbolicLink() || identityStat.nlink !== 1 || identityStat.size > MAX_RUNTIME_IDENTITY_BYTES) {
      throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "stored runtime identity is not a bounded regular file");
    }
    const text = await fsp.readFile(identityPath, "utf8");
    const parsed = JSON.parse(text);
    if (`${canonicalJson(parsed)}\n` !== text) throw cacheError("AAS_RUNTIME_IDENTITY_INVALID", "stored runtime identity is not canonical JSON");
    const identity = validateRuntimeIdentity(parsed, { version: packageVersion, integrity, ...(closureDigest ? { closureDigest } : {}) });
    const files = (await listRuntimeFiles(targetPath)).sort();
    const expected = [RUNTIME_IDENTITY_FILE, ...identity.assets.map((asset) => asset.path)].sort();
    if (canonicalJson(files) !== canonicalJson(expected)) throw cacheError("AAS_RUNTIME_CONTENT_MISMATCH", "cached runtime has missing or unexpected files");
    for (let index = 0; index < identity.assets.length; index += 32) {
      await Promise.all(identity.assets.slice(index, index + 32).map((record) => readRuntimeAsset(targetPath, record)));
    }
    return { status: "verified", present: true, identity, runtimeIdentity: publicRuntimeIdentity(identity), targetPath };
  } catch (error) {
    if (error.code === "ENOENT") return { status: "missing", present: false, targetPath };
    return { status: "invalid", present: true, targetPath, error: { code: error.code || "AAS_RUNTIME_STATUS_FAILED", message: error.message } };
  }
}

async function promoteRuntime({ cacheRoot, release, parsed }) {
  const scanned = runtimeRecords(parsed.entries, release.version);
  const targetPath = runtimeCachePath({ cacheRoot, packageVersion: release.version, integrity: release.integrity });
  const existing = await runtimeStatus({ cacheRoot, packageVersion: release.version, integrity: release.integrity, closureDigest: scanned.closureDigest });
  if (existing.status === "verified") return { ...existing, status: "alreadyPresent" };
  if (existing.status === "invalid") throw cacheError("AAS_RUNTIME_EXISTING_INVALID", "an invalid object occupies the immutable runtime cache key");
  const versionDirectory = path.dirname(targetPath);
  const created = [];
  let stagePath;
  let promoted = false;
  try {
    await ensureRealDirectory(versionDirectory, created);
    stagePath = path.join(versionDirectory, `.stage-${process.pid}-${crypto.randomBytes(12).toString("hex")}`);
    await fsp.mkdir(stagePath, { mode: 0o700 });
    const directories = new Set([stagePath]);
    for (const record of scanned.records) {
      const segments = record.path.split("/");
      let cursor = stagePath;
      for (const segment of segments.slice(0, -1)) {
        cursor = path.join(cursor, segment);
        if (!directories.has(cursor)) { await fsp.mkdir(cursor, { mode: 0o700 }); directories.add(cursor); }
      }
      await writeExclusive(path.join(stagePath, ...segments), record.bytes);
    }
    const identity = validateRuntimeIdentity({
      schemaVersion: 1,
      package: CATALOG_PACKAGE,
      version: release.version,
      integrity: release.integrity,
      closureDigest: scanned.closureDigest,
      digestVersion: DIGEST_VERSION,
      assets: scanned.assets,
      provenance: {
        registryOrigin: release.provenance.registryOrigin,
        signaturesPresent: release.provenance.signaturesPresent,
        attestationsPresent: release.provenance.attestationsPresent,
      },
    });
    await writeExclusive(path.join(stagePath, RUNTIME_IDENTITY_FILE), Buffer.from(`${canonicalJson(identity)}\n`));
    // Persist every file and nested directory before making the immutable
    // content-addressed object visible through the final rename.
    for (const directory of [...directories].sort((left, right) => right.split(path.sep).length - left.split(path.sep).length)) {
      await fsyncDirectory(directory);
    }
    try { await fsp.rename(stagePath, targetPath); promoted = true; } catch (error) {
      if (error.code !== "EEXIST" && error.code !== "ENOTEMPTY") throw error;
      const raced = await runtimeStatus({ cacheRoot, packageVersion: release.version, integrity: release.integrity, closureDigest: scanned.closureDigest });
      if (raced.status !== "verified") throw cacheError("AAS_RUNTIME_PROMOTION_CONFLICT", "runtime cache key was occupied during promotion");
      return { ...raced, status: "alreadyPresent" };
    }
    await fsyncDirectory(versionDirectory);
    return { status: "promoted", present: true, identity, runtimeIdentity: publicRuntimeIdentity(identity), targetPath };
  } finally {
    if (stagePath && !promoted) await fsp.rm(stagePath, { recursive: true, force: true });
    if (!promoted) {
      for (const directory of [...created].reverse()) await fsp.rmdir(directory).catch((error) => { if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error; });
    }
  }
}

async function installRuntimeFromRegistry({ cacheRoot, version, expectedIntegrity, fetcher = fetchBytes }) {
  validateCacheRoot(cacheRoot);
  const release = await inspectRuntimeRelease({ version, fetcher });
  if (expectedIntegrity !== undefined && release.integrity !== parseNpmIntegrity(expectedIntegrity).integrity) {
    throw cacheError("AAS_RUNTIME_RELEASE_CHANGED", "runtime release integrity differs from the approved preview");
  }
  const archive = await fetcher(release.tarballUrl, 64 * 1024 * 1024);
  verifySri(archive, release.integrity);
  const parsed = parsePackageArchive(archive, { limits: RUNTIME_ARCHIVE_LIMITS });
  const promoted = await promoteRuntime({ cacheRoot, release, parsed });
  return { ok: true, status: promoted.status, runtimeIdentity: promoted.runtimeIdentity, targetPath: promoted.targetPath, provenance: release.provenance };
}

function runtimeMcpPath({ cacheRoot, packageVersion, integrity }) {
  return path.join(runtimeCachePath({ cacheRoot, packageVersion, integrity }), "package", "tools", "bin", "aas-mcp.js");
}

module.exports = {
  MAX_RUNTIME_IDENTITY_BYTES,
  REQUIRED_RUNTIME_FILES,
  REQUIRED_BUNDLED_DEPENDENCIES,
  RUNTIME_ARCHIVE_LIMITS,
  inspectRuntimeRelease,
  installRuntimeFromRegistry,
  promoteRuntime,
  publicRuntimeIdentity,
  runtimeMcpPath,
  runtimeRecords,
  runtimeStatus,
  validateRuntimeIdentity,
};
