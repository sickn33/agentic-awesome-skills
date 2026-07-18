"use strict";

const fsp = require("node:fs/promises");
const path = require("node:path");
const { loadBundledCatalog } = require("../catalog");
const { catalogStatus } = require("./status");
const { validateCacheRoot, validateCatalogDigest } = require("./identity");

function compareStrings(left, right) {
  return left < right ? -1 : (left > right ? 1 : 0);
}

async function realDirectories(directory) {
  let entries;
  try {
    entries = await fsp.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return entries.filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => entry.name).sort(compareStrings);
}

function createVerifiedCatalogResolver({ cacheRoot, bundledRoot, maximumVersions = 64 } = {}) {
  const bundled = loadBundledCatalog({ root: bundledRoot });
  const root = cacheRoot ? validateCacheRoot(cacheRoot) : null;
  return async function resolveCatalog(digest) {
    validateCatalogDigest(digest);
    if (digest === bundled.digest) return bundled;
    if (!root) return null;
    const versions = await realDirectories(path.join(root, "catalogs"));
    if (versions.length > maximumVersions) {
      const error = new Error("verified catalog cache exceeds the resolver limit");
      error.code = "AAS_CACHE_RESOLVER_LIMIT";
      throw error;
    }
    const matches = [];
    for (const version of versions) {
      const status = await catalogStatus({ cacheRoot: root, packageVersion: version, catalogDigest: digest });
      if (status.status === "verified") matches.push(status);
    }
    if (matches.length === 0) return null;
    if (matches.length > 1) {
      const error = new Error("catalog digest resolves to multiple verified cache identities");
      error.code = "AAS_CACHE_RESOLVER_AMBIGUOUS";
      throw error;
    }
    const catalog = loadBundledCatalog({ root: matches[0].targetPath });
    if (catalog.digest !== digest) {
      const error = new Error("resolved catalog digest changed after verification");
      error.code = "AAS_CACHE_RESOLVER_DRIFT";
      throw error;
    }
    return catalog;
  };
}

module.exports = { createVerifiedCatalogResolver, realDirectories };
