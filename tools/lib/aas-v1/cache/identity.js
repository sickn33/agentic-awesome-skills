"use strict";

const path = require("node:path");

const CATALOG_PACKAGE = "agentic-awesome-skills";
const CATALOG_IDENTITY_FILE = ".aas-catalog-identity.json";
const RUNTIME_IDENTITY_FILE = ".aas-runtime-identity.json";
const DIGEST_VERSION = 1;
const SRI_LENGTHS = Object.freeze({ sha256: 32, sha384: 48, sha512: 64 });

function cacheError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function parseNpmIntegrity(integrity) {
  if (typeof integrity !== "string" || integrity.trim() !== integrity || /\s/.test(integrity)) {
    throw cacheError("AAS_CACHE_INTEGRITY_INVALID", "npm integrity must be one canonical SRI token");
  }
  const match = /^(sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/.exec(integrity);
  if (!match) throw cacheError("AAS_CACHE_INTEGRITY_INVALID", "npm integrity is not a supported SRI token");
  const [, algorithm, encoded] = match;
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length !== SRI_LENGTHS[algorithm]) {
    throw cacheError("AAS_CACHE_INTEGRITY_INVALID", `npm ${algorithm} integrity has the wrong digest length`);
  }
  const canonical = bytes.toString("base64");
  if (canonical !== encoded) {
    throw cacheError("AAS_CACHE_INTEGRITY_INVALID", "npm integrity digest is not canonical base64");
  }
  return { algorithm, bytes, integrity };
}

function filesystemSafeIntegrityKey(integrity) {
  const parsed = parseNpmIntegrity(integrity);
  return `${parsed.algorithm}-${parsed.bytes.toString("base64url")}`;
}

function validatePackageVersion(version) {
  if (typeof version !== "string" || version.length > 128 || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(version)) {
    throw cacheError("AAS_CACHE_VERSION_INVALID", "package version must be a canonical SemVer value");
  }
  return version;
}

function validateCatalogDigest(digest) {
  if (typeof digest !== "string" || !/^sha256-[0-9a-f]{64}$/.test(digest)) {
    throw cacheError("AAS_CACHE_CATALOG_DIGEST_INVALID", "catalog digest must be canonical sha256 hex");
  }
  return digest;
}

function validateCacheRoot(cacheRoot) {
  if (typeof cacheRoot !== "string" || cacheRoot.length === 0 || cacheRoot.includes("\0")) {
    throw cacheError("AAS_CACHE_ROOT_INVALID", "cache root must be a non-empty filesystem path");
  }
  return path.resolve(cacheRoot);
}

function runtimeCachePath({ cacheRoot, packageVersion, integrity }) {
  return path.join(
    validateCacheRoot(cacheRoot),
    "runtimes",
    validatePackageVersion(packageVersion),
    filesystemSafeIntegrityKey(integrity),
  );
}

function catalogCachePath({ cacheRoot, packageVersion, catalogDigest }) {
  return path.join(
    validateCacheRoot(cacheRoot),
    "catalogs",
    validatePackageVersion(packageVersion),
    validateCatalogDigest(catalogDigest),
  );
}

function validateCatalogIdentity(identity, expected = {}) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    throw cacheError("AAS_CACHE_IDENTITY_INVALID", "catalog identity must be an object");
  }
  const allowedKeys = new Set(["schemaVersion", "package", "version", "integrity", "catalogDigest"]);
  for (const key of Object.keys(identity)) {
    if (!allowedKeys.has(key)) throw cacheError("AAS_CACHE_IDENTITY_INVALID", `unknown catalog identity field: ${key}`);
  }
  if (identity.schemaVersion !== 1) throw cacheError("AAS_CACHE_IDENTITY_INVALID", "catalog identity schemaVersion must be 1");
  if (identity.package !== CATALOG_PACKAGE) throw cacheError("AAS_CACHE_IDENTITY_INVALID", `catalog package must be ${CATALOG_PACKAGE}`);
  const normalized = {
    schemaVersion: 1,
    package: CATALOG_PACKAGE,
    version: validatePackageVersion(identity.version),
    integrity: parseNpmIntegrity(identity.integrity).integrity,
    catalogDigest: validateCatalogDigest(identity.catalogDigest),
  };
  for (const key of ["package", "version", "integrity", "catalogDigest"]) {
    if (expected[key] !== undefined && normalized[key] !== expected[key]) {
      throw cacheError("AAS_CACHE_IDENTITY_MISMATCH", `catalog identity ${key} does not match the expected value`);
    }
  }
  return normalized;
}

module.exports = {
  CATALOG_IDENTITY_FILE,
  CATALOG_PACKAGE,
  RUNTIME_IDENTITY_FILE,
  DIGEST_VERSION,
  cacheError,
  catalogCachePath,
  filesystemSafeIntegrityKey,
  parseNpmIntegrity,
  runtimeCachePath,
  validateCacheRoot,
  validateCatalogDigest,
  validateCatalogIdentity,
  validatePackageVersion,
};
