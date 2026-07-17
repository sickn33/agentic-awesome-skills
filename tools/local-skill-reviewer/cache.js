"use strict";

const crypto = require("crypto");
const fs = require("fs");
const { ALLOWED_BUNDLE_ROOTS, MAX_BUNDLE_BYTES, MAX_BUNDLE_FILE_BYTES, MAX_BUNDLE_FILES, MAX_CACHE_BYTES, MAX_FRONTMATTER_DEPTH, MAX_FRONTMATTER_NODES, MAX_SKILL_BYTES, PROMPT_VERSION, REVIEWER_VERSION, RUBRIC_VERSION, SCHEMA_VERSION } = require("./constants");
const { ANALYZER_VERSION } = require("./analyzer");
const { atomicWrite, resolveOutputPath } = require("./output");
const { readBoundedRegular } = require("./safe-io");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function canonicalJson(value) { return JSON.stringify(stable(value)); }

function runtimeContract() {
  return { prompt: PROMPT_VERSION, reviewer: REVIEWER_VERSION, rubric: RUBRIC_VERSION, schema: SCHEMA_VERSION, analyzer: ANALYZER_VERSION };
}

function cacheKey({ bundle, profile = "tessl-aligned-local", validator = "tessl-aligned-validation-v2", contract = runtimeContract() }) {
  const payload = {
    bundle: bundle.files.map(({ path: filePath, sha256, size }) => ({ path: filePath, sha256, size })),
    bundleHash: bundle.bundleHash,
    analyzer: contract.analyzer,
    profile,
    validator,
    thresholds: { allowedBundleRoots: ALLOWED_BUNDLE_ROOTS, maxBundleBytes: MAX_BUNDLE_BYTES, maxBundleFileBytes: MAX_BUNDLE_FILE_BYTES, maxBundleFiles: MAX_BUNDLE_FILES, maxFrontmatterDepth: MAX_FRONTMATTER_DEPTH, maxFrontmatterNodes: MAX_FRONTMATTER_NODES, maxSkillBytes: MAX_SKILL_BYTES },
    runtime: { node: process.versions.node, yaml: require("yaml/package.json").version },
    versions: { prompt: contract.prompt, reviewer: contract.reviewer, rubric: contract.rubric, schema: contract.schema },
  };
  return crypto.createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

function atomicWriteJson(outputRoot, relativePath, value) {
  return atomicWrite(outputRoot, relativePath, Buffer.from(`${canonicalJson(value)}\n`, "utf8"));
}

function readValidCache(outputRoot, key, validate) {
  const filePath = resolveOutputPath(outputRoot, `cache/${key}.json`);
  try {
    const value = JSON.parse(readBoundedRegular(filePath, MAX_CACHE_BYTES, "Cache entry").toString("utf8"));
    if (value.status !== "completed" || value.cacheKey !== key) return null;
    validate(value);
    return value;
  } catch { return null; }
}

module.exports = { atomicWriteJson, cacheKey, canonicalJson, readValidCache, runtimeContract, stable };
