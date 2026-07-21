"use strict";

const fs = require("node:fs");
const path = require("node:path");
const versions = require("./versions");
const { canonicalJson, sha256 } = require("./canonical-json");
const { compareStrings, sortedUnique, tokenize } = require("./normalize");
const { validateInstance } = require("./schema-validator");

const OFFLINE_MANIFEST = "data/aas-v1/catalog-manifest.v1.json";
const CONTENT_INDEX = "data/aas-v1/skill-content-index.v1.json";
const CATALOG_PACKAGE = "agentic-awesome-skills";

function readVerifiedAsset(root, asset) {
  if (!asset || typeof asset.path !== "string" || !/^[a-zA-Z0-9._/-]+$/.test(asset.path)
    || asset.path.startsWith("/") || asset.path.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Offline catalog contains an unsafe asset path");
  }
  const filePath = path.resolve(root, ...asset.path.split("/"));
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) throw new Error("Offline catalog asset escaped package root");
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size !== asset.size) {
    throw new Error(`Offline catalog asset is unsafe or changed: ${asset.path}`);
  }
  const bytes = fs.readFileSync(filePath);
  if (sha256(bytes) !== asset.sha256) throw new Error(`Offline catalog asset digest mismatch: ${asset.path}`);
  return bytes;
}

function loadOfflineIdentity(root) {
  const manifestPath = path.join(root, ...OFFLINE_MANIFEST.split("/"));
  const text = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(text);
  validateInstance("catalog-manifest.schema.json", manifest, "AAS_CATALOG_MANIFEST_SCHEMA_INVALID");
  if (`${canonicalJson(manifest)}\n` !== text || manifest.schemaVersion !== 1 || manifest.digestVersion !== 1
    || manifest.package !== CATALOG_PACKAGE || typeof manifest.packageVersion !== "string"
    || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.packageVersion)
    || manifest.catalogSchemaVersion !== versions.catalogSchemaVersion || !Array.isArray(manifest.assets)) {
    throw new Error("Offline catalog manifest is invalid or incompatible");
  }
  const assets = manifest.assets.map((asset) => {
    const bytes = readVerifiedAsset(root, asset);
    return { path: asset.path, size: bytes.length, sha256: sha256(bytes) };
  }).sort((left, right) => compareStrings(left.path, right.path));
  const digest = sha256(canonicalJson({ digestVersion: 1, assets }));
  const indexAsset = manifest.assets.find((asset) => asset.path === CONTENT_INDEX);
  if (!indexAsset) throw new Error("Offline catalog content index is missing");
  const contentIndex = JSON.parse(readVerifiedAsset(root, indexAsset));
  const indexedSkillCount = Object.keys(contentIndex?.entries || {}).length;
  if (digest !== manifest.catalogDigest || !Number.isSafeInteger(manifest.skillCount)
    || manifest.skillCount <= 0 || manifest.skillCount !== indexedSkillCount) {
    throw new Error("Offline catalog identity mismatch");
  }
  return { digest, manifest, contentIndex };
}

function loadBundledCatalog(options = {}) {
  const root = path.resolve(options.root || path.resolve(__dirname, "../../.."));
  const offline = loadOfflineIdentity(root);
  const catalogPath = options.catalogPath || path.join(root, "data", "catalog.json");
  const raw = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const skills = (raw.skills || []).map((entry) => {
    const canonicalId = entry.canonical_id || entry.id;
    const contentRef = offline.contentIndex.entries?.[canonicalId];
    if (!contentRef || !Number.isSafeInteger(contentRef.offset) || !Number.isSafeInteger(contentRef.length)
      || !/^sha256-[a-f0-9]{64}$/.test(contentRef.sha256)) {
      throw new Error(`Offline skill content reference is invalid: ${canonicalId}`);
    }
    return {
      id: canonicalId,
      name: entry.name || canonicalId,
      description: entry.description || "",
      category: entry.category || "unknown",
      tags: sortedUnique(entry.tags || []),
      triggers: sortedUnique(entry.triggers || []),
      searchTokens: sortedUnique(tokenize([
        canonicalId,
        entry.id,
        entry.name,
        entry.description,
        entry.category,
        ...(entry.tags || []),
        ...(entry.triggers || []),
      ])),
      untrustedContentPath: entry.path || null,
      untrustedContentRef: {
        assetPath: "data/aas-v1/skill-content.v1.ndjson",
        offset: contentRef.offset,
        length: contentRef.length,
        sha256: contentRef.sha256,
      },
    };
  }).sort((left, right) => compareStrings(left.id, right.id));
  return {
    schemaVersion: 1,
    package: offline.manifest.package,
    version: offline.manifest.packageVersion,
    digest: offline.digest,
    skills,
  };
}

function syntheticCatalog(skills, identity = {}) {
  const normalized = [...skills].sort((left, right) => compareStrings(left.id, right.id));
  return {
    schemaVersion: 1,
    package: identity.package || "synthetic-aas-catalog",
    version: identity.version || "1.0.0",
    digest: sha256(canonicalJson({ catalogSchemaVersion: versions.catalogSchemaVersion, skills: normalized })),
    skills: normalized,
  };
}

module.exports = { loadBundledCatalog, syntheticCatalog };
