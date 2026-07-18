"use strict";

const { discoverBundle, disposeSnapshot, materializeBundle } = require("./safe-bundle");
const { atomicWriteJson, cacheKey, readValidCache } = require("./cache");
const { ensureOutputRoot } = require("./output");
const { artifactName } = require("./safe-io");
const { buildResult, validateResult, validateRuntimeResult } = require("./schema");

async function reviewSkill({ repoRoot, skillId, resultDir, outputRoot, tracked }) {
  const safeOutput = outputRoot || ensureOutputRoot(resultDir, repoRoot);
  const discovered = discoverBundle(repoRoot, skillId, tracked);
  const snapshot = materializeBundle(discovered);
  try {
    const bundle = snapshot.bundle;
    const key = cacheKey({ bundle });
    const cached = readValidCache(safeOutput, key, (value) => validateResult(value, bundle, key));
    if (cached) {
      atomicWriteJson(safeOutput, `results/${artifactName(skillId)}.json`, cached);
      const runtime = { ...cached, cacheHit: true };
      validateRuntimeResult(runtime, bundle, key);
      return runtime;
    }
    const result = buildResult(bundle, key);
    validateResult(result, bundle, key);
    atomicWriteJson(safeOutput, `cache/${key}.json`, result);
    atomicWriteJson(safeOutput, `results/${artifactName(skillId)}.json`, result);
    validateRuntimeResult(result, bundle, key);
    return result;
  } finally { disposeSnapshot(snapshot); }
}

function readCompletedResult({ repoRoot, skillId, resultDir, outputRoot, tracked }) {
  const safeOutput = outputRoot || ensureOutputRoot(resultDir, repoRoot);
  const discovered = discoverBundle(repoRoot, skillId, tracked);
  const snapshot = materializeBundle(discovered);
  try {
    const bundle = snapshot.bundle;
    const key = cacheKey({ bundle });
    const cached = readValidCache(safeOutput, key, (value) => validateResult(value, bundle, key));
    if (!cached) throw new Error(`Completed batch cache is unavailable or stale: ${skillId}`);
    atomicWriteJson(safeOutput, `results/${artifactName(skillId)}.json`, cached);
    const runtime = { ...cached, cacheHit: true };
    validateRuntimeResult(runtime, bundle, key);
    return runtime;
  } finally { disposeSnapshot(snapshot); }
}

module.exports = { readCompletedResult, reviewSkill };
