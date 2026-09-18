"use strict";

const fsp = require("node:fs/promises");
const path = require("node:path");
const { canonicalJson } = require("../canonical-json");
const {
  CATALOG_IDENTITY_FILE,
  DIGEST_VERSION,
  cacheError,
  catalogCachePath,
  validateCatalogIdentity,
} = require("./identity");
const { scanDataDirectory } = require("./scan");

const MAX_IDENTITY_BYTES = 128 * 1024;

function validateStoredIdentity(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw cacheError("AAS_CACHE_IDENTITY_INVALID", "stored catalog identity must be an object");
  const allowed = new Set(["schemaVersion", "package", "version", "integrity", "catalogDigest", "digestVersion", "assets", "controls"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw cacheError("AAS_CACHE_IDENTITY_INVALID", `unknown stored identity field: ${key}`);
  }
  const identity = validateCatalogIdentity({
    schemaVersion: value.schemaVersion,
    package: value.package,
    version: value.version,
    integrity: value.integrity,
    catalogDigest: value.catalogDigest,
  }, expected);
  if (value.digestVersion !== DIGEST_VERSION) throw cacheError("AAS_CACHE_IDENTITY_INVALID", "unsupported catalog digest version");
  if (!Array.isArray(value.assets) || value.assets.length === 0) throw cacheError("AAS_CACHE_IDENTITY_INVALID", "stored catalog identity needs asset records");
  const assets = value.assets.map((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record) || Object.keys(record).sort().join(",") !== "path,sha256,size") {
      throw cacheError("AAS_CACHE_IDENTITY_INVALID", "stored catalog asset record is invalid");
    }
    if (!Number.isSafeInteger(record.size) || record.size < 0 || !/^sha256-[0-9a-f]{64}$/.test(record.sha256)) {
      throw cacheError("AAS_CACHE_IDENTITY_INVALID", "stored catalog asset size or digest is invalid");
    }
    return { path: record.path, size: record.size, sha256: record.sha256 };
  });
  const controls = (value.controls || []).map((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record) || Object.keys(record).sort().join(",") !== "path,sha256,size") {
      throw cacheError("AAS_CACHE_IDENTITY_INVALID", "stored catalog control record is invalid");
    }
    if (!Number.isSafeInteger(record.size) || record.size < 0 || !/^sha256-[0-9a-f]{64}$/.test(record.sha256)) {
      throw cacheError("AAS_CACHE_IDENTITY_INVALID", "stored catalog control size or digest is invalid");
    }
    return { path: record.path, size: record.size, sha256: record.sha256 };
  });
  return { ...identity, digestVersion: DIGEST_VERSION, assets, controls };
}

async function catalogStatus({ cacheRoot, packageVersion, catalogDigest, integrity }) {
  const targetPath = catalogCachePath({ cacheRoot, packageVersion, catalogDigest });
  try {
    const targetStat = await fsp.lstat(targetPath);
    if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) throw cacheError("AAS_CACHE_TARGET_INVALID", "catalog cache target is not a real directory");
    const identityPath = path.join(targetPath, CATALOG_IDENTITY_FILE);
    const identityStat = await fsp.lstat(identityPath);
    if (!identityStat.isFile() || identityStat.isSymbolicLink() || identityStat.nlink !== 1 || identityStat.size > MAX_IDENTITY_BYTES) {
      throw cacheError("AAS_CACHE_IDENTITY_INVALID", "stored catalog identity is not a bounded regular file");
    }
    const text = await fsp.readFile(identityPath, "utf8");
    const parsed = JSON.parse(text);
    if (`${canonicalJson(parsed)}\n` !== text) throw cacheError("AAS_CACHE_IDENTITY_INVALID", "stored catalog identity is not canonical JSON");
    const identity = validateStoredIdentity(parsed, {
      version: packageVersion,
      catalogDigest,
      ...(integrity === undefined ? {} : { integrity }),
    });
    const scan = await scanDataDirectory({
      sourceDir: targetPath,
      allowlist: identity.assets.map((asset) => asset.path),
      ignoredPaths: [CATALOG_IDENTITY_FILE, ...identity.controls.map((asset) => asset.path)],
    });
    const observedControls = scan.publicIgnoredRecords.filter((record) => record.path !== CATALOG_IDENTITY_FILE);
    if (scan.catalogDigest !== identity.catalogDigest || canonicalJson(scan.publicRecords) !== canonicalJson(identity.assets)
      || canonicalJson(observedControls) !== canonicalJson(identity.controls)) {
      throw cacheError("AAS_CACHE_CONTENT_MISMATCH", "cached catalog bytes do not match their identity");
    }
    return { status: "verified", present: true, identity, targetPath };
  } catch (error) {
    if (error.code === "ENOENT") return { status: "missing", present: false, targetPath };
    return {
      status: "invalid",
      present: true,
      targetPath,
      error: { code: error.code || "AAS_CACHE_STATUS_FAILED", message: error.message },
    };
  }
}

module.exports = { MAX_IDENTITY_BYTES, catalogStatus, validateStoredIdentity };
