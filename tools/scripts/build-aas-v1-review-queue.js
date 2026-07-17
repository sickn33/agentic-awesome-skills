#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, sha256 } = require("../lib/aas-v1/canonical-json");
const { compareStrings, sortedUnique, tokenize } = require("../lib/aas-v1/normalize");

const ROOT = path.resolve(__dirname, "../..");
const CATALOG_PATH = path.join(ROOT, "data/catalog.json");
const COMPATIBILITY_PATH = path.join(ROOT, "data/plugin-compatibility.json");
const ONTOLOGY_PATH = path.join(ROOT, "tools/lib/aas-v1/ontology.v1.json");
const OUTPUT_PATH = path.join(ROOT, "tools/lib/aas-v1/review-queue.v1.json");
const MAX_CANDIDATES_PER_CAPABILITY = 25;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sourceKnown(skill) {
  const value = skill.source_type || skill.source_repo || skill.source;
  return typeof value === "string" && value.length > 0 && value !== "unknown";
}

function candidateTokens(skill) {
  return sortedUnique(tokenize([
    skill.id,
    skill.canonical_id,
    skill.name,
    skill.category,
    ...(skill.tags || []),
  ]));
}

function buildReviewQueue() {
  const catalog = readJson(CATALOG_PATH);
  const compatibility = readJson(COMPATIBILITY_PATH);
  const ontology = readJson(ONTOLOGY_PATH);
  if (!ontology.capabilities || typeof ontology.capabilities !== "object") {
    throw new Error("ontology.v1.json must define a capabilities object");
  }
  const compatibilityById = new Map((compatibility.skills || []).map((entry) => [entry.id, entry]));
  const skills = (catalog.skills || []).map((skill) => ({
    skill,
    tokens: candidateTokens(skill),
    compatibility: compatibilityById.get(skill.id) || {},
  }));
  const queues = [];
  for (const intent of Object.keys(ontology.capabilities).sort(compareStrings)) {
    const intentTokens = new Set(tokenize([intent, ...(ontology.intentAliases[intent] || [])]));
    for (const capability of [...ontology.capabilities[intent]].sort(compareStrings)) {
      const queryTokens = sortedUnique(tokenize(capability));
      const candidates = skills.map(({ skill, tokens, compatibility: plugin }) => {
        const tokenSet = new Set(tokens);
        const matchedCapabilityTokens = queryTokens.filter((token) => tokenSet.has(token));
        const intentTokenMatches = [...intentTokens].filter((token) => tokenSet.has(token)).length;
        const exactId = skill.id === capability || skill.canonical_id === capability;
        const exactTag = (skill.tags || []).includes(capability);
        const knownRisk = ["none", "safe"].includes(skill.risk);
        const knownSource = sourceKnown(skill);
        const supportedTargets = ["codex", "claude"].filter((host) => plugin.targets?.[host] === "supported");
        const setup = plugin.setup?.type || "unknown";
        const eligibleEvidenceShape = knownRisk && knownSource && supportedTargets.length > 0
          && ["none", "automatic"].includes(setup);
        const score = (exactId ? 100000 : 0)
          + (exactTag ? 50000 : 0)
          + matchedCapabilityTokens.length * 10000
          + intentTokenMatches * 100
          + (eligibleEvidenceShape ? 10 : 0);
        return {
          id: skill.canonical_id || skill.id,
          score,
          factors: {
            eligibleEvidenceShape,
            exactId,
            exactTag,
            intentTokenMatches,
            matchedCapabilityTokens,
          },
        };
      }).filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score || compareStrings(left.id, right.id))
        .slice(0, MAX_CANDIDATES_PER_CAPABILITY)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
      queues.push({ intent, capability, queryTokens, candidates });
    }
  }
  return {
    schemaVersion: 1,
    queueVersion: 1,
    selectionPolicy: {
      kind: "catalog-structured-lexical-top-k",
      maximumCandidatesPerCapability: MAX_CANDIDATES_PER_CAPABILITY,
      benchmarkIndependent: true,
      candidateFields: ["id", "canonical_id", "name", "category", "tags"],
      scoreFactors: ["exactId", "exactTag", "matchedCapabilityTokens", "intentTokenMatches", "eligibleEvidenceShape"],
      stableTieBreak: "canonical-skill-id",
    },
    inputs: {
      catalog: sha256(fs.readFileSync(CATALOG_PATH)),
      compatibility: sha256(fs.readFileSync(COMPATIBILITY_PATH)),
      ontology: sha256(fs.readFileSync(ONTOLOGY_PATH)),
    },
    queues,
  };
}

function main() {
  const built = buildReviewQueue();
  const serialized = `${canonicalJson(built)}\n`;
  if (process.argv.includes("--write")) {
    fs.writeFileSync(OUTPUT_PATH, serialized, { mode: 0o644 });
    process.stdout.write(`Wrote ${built.queues.length} public capability review queues.\n`);
    return;
  }
  if (fs.readFileSync(OUTPUT_PATH, "utf8") !== serialized) {
    throw new Error("review-queue.v1.json is stale; run with --write");
  }
  process.stdout.write(`Validated ${built.queues.length} public capability review queues.\n`);
}

if (require.main === module) main();

module.exports = { buildReviewQueue, candidateTokens, sourceKnown };
