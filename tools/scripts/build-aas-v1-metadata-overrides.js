#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, sha256 } = require("../lib/aas-v1/canonical-json");
const { compareStrings, sortedUnique } = require("../lib/aas-v1/normalize");
const { buildLedger, parsePairs } = require("./import-aas-v1-metadata-reviews");

const ROOT = path.resolve(__dirname, "../..");
const REVIEWS_PATH = path.join(ROOT, "tools/lib/aas-v1/metadata-reviews.v1.json");
const OUTPUT_PATH = path.join(ROOT, "tools/lib/aas-v1/metadata-overrides.v1.json");
const INDEX_PATH = path.join(ROOT, "skills_index.json");
const CATALOG_PATH = path.join(ROOT, "data/catalog.json");
const COMPATIBILITY_PATH = path.join(ROOT, "data/plugin-compatibility.json");
const ONTOLOGY_PATH = path.join(ROOT, "tools/lib/aas-v1/ontology.v1.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizedJudgment(field, validator, name) {
  if (!field || !["known", "unknown"].includes(field.status)) throw new Error(`${name} has an invalid review status`);
  if (field.status === "unknown") {
    if (field.value !== null) throw new Error(`${name} unknown review must have a null value`);
    return { status: "unknown", value: null };
  }
  const value = validator(field.value);
  return { status: "known", value };
}

function stringList(value, allIds, name) {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  const normalized = sortedUnique(value);
  for (const id of normalized) if (!allIds.has(id)) throw new Error(`${name} references an unknown skill: ${id}`);
  return normalized;
}

function buildDocument() {
  const reviews = readJson(REVIEWS_PATH);
  const rebuiltReviews = buildLedger(parsePairs([]).pairs);
  if (canonicalJson(reviews) !== canonicalJson(rebuiltReviews)) {
    throw new Error("metadata review ledger is not reproducible from committed review sources");
  }
  const index = readJson(INDEX_PATH);
  const catalog = readJson(CATALOG_PATH);
  const compatibility = readJson(COMPATIBILITY_PATH);
  const ontology = readJson(ONTOLOGY_PATH);
  if (reviews.schemaVersion !== 1 || reviews.rubricVersion !== "1.0.0" || !reviews.scope?.benchmarkIndependent
    || !reviews.skills || typeof reviews.skills !== "object") {
    throw new Error("metadata review ledger is invalid or not benchmark-independent");
  }
  const indexById = new Map(index.map((entry) => [entry.id, entry]));
  const catalogById = new Map((catalog.skills || []).map((entry) => [entry.canonical_id || entry.id, entry]));
  const compatibilityByPath = new Map((compatibility.skills || []).map((entry) => [entry.path, entry]));
  const allIds = new Set(indexById.keys());
  const capabilitiesByIntent = new Map(Object.entries(ontology.capabilities || {}).map(([intent, values]) => [intent, new Set(values)]));
  const allCapabilities = new Set([...capabilitiesByIntent.values()].flatMap((values) => [...values]));
  const skills = {};
  for (const id of Object.keys(reviews.skills).sort(compareStrings)) {
    const review = reviews.skills[id];
    const indexEntry = indexById.get(id);
    const catalogEntry = catalogById.get(id);
    if (!indexEntry || !catalogEntry) throw new Error(`review references an unknown catalog skill: ${id}`);
    const contentPath = `${indexEntry.path}/SKILL.md`;
    if (review.content?.path !== contentPath || review.content.digest !== sha256(fs.readFileSync(path.join(ROOT, ...contentPath.split("/"))))) {
      throw new Error(`review content identity is stale: ${id}`);
    }
    const intents = sortedUnique(review.intents || []);
    if (intents.length === 0 || intents.some((intent) => !capabilitiesByIntent.has(intent))) throw new Error(`review intent is invalid: ${id}`);
    const capabilities = sortedUnique(review.capabilities || []);
    if (capabilities.length === 0 || capabilities.some((capability) => !allCapabilities.has(capability))) {
      throw new Error(`review capability is outside the public ontology: ${id}`);
    }
    const fields = review.fields || {};
    const risk = normalizedJudgment(fields.risk, (value) => {
      if (!["none", "safe", "critical", "offensive"].includes(value)) throw new Error(`risk is invalid: ${id}`);
      return value;
    }, `${id}.risk`);
    const source = normalizedJudgment(fields.provenance, (value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`provenance is invalid: ${id}`);
      return value;
    }, `${id}.provenance`);
    const setup = normalizedJudgment(fields.setup, (value) => {
      if (!["none", "automatic", "manual"].includes(value)) throw new Error(`setup is invalid: ${id}`);
      return value;
    }, `${id}.setup`);
    const dependencies = normalizedJudgment(fields.dependencies, (value) => stringList(value, allIds, `${id}.dependencies`), `${id}.dependencies`);
    const conflicts = normalizedJudgment(fields.conflicts, (value) => stringList(value, allIds, `${id}.conflicts`), `${id}.conflicts`);
    const compatibilityEntry = compatibilityByPath.get(indexEntry.path);
    if (!compatibilityEntry) throw new Error(`compatibility record is missing: ${id}`);
    const targets = Object.fromEntries(["codex", "claude"].map((host) => {
      const value = compatibilityEntry.targets?.[host];
      return [host, ["supported", "blocked"].includes(value)
        ? { status: "known", value }
        : { status: "unknown", value: null }];
    }));
    const evidencePayload = {
      type: "aas-v1-metadata-review",
      rubricVersion: reviews.rubricVersion,
      reviewedAt: reviews.reviewedAt,
      skillId: id,
      content: review.content,
      intents,
      capabilities,
      capabilityEvidence: review.capabilityEvidence,
      selectionEvidence: review.selectionEvidence,
      reviews: review.reviews,
      fields,
      compatibility: {
        recordDigest: sha256(canonicalJson(compatibilityEntry)),
        reportDigest: sha256(fs.readFileSync(COMPATIBILITY_PATH)),
        targets,
        limitation: "static-host-compatibility-record-not-live-execution-proof",
      },
    };
    const evidence = [{ id: sha256(canonicalJson(evidencePayload)), ...evidencePayload }];
    skills[id] = {
      reviewDecision: "supported",
      capabilities,
      risk,
      source,
      targets,
      setup,
      dependencies,
      conflicts,
      validation: {
        status: "known",
        value: {
          rubricVersion: reviews.rubricVersion,
          contentDigestBound: true,
          catalogWideSelection: true,
          fieldReviewComplete: true,
        },
      },
      reviews: {
        status: "known",
        value: review.reviews,
      },
      evidence,
    };
  }
  return {
    schemaVersion: 1,
    reviewedAt: reviews.reviewedAt,
    rubricVersion: reviews.rubricVersion,
    reviewPolicy: reviews.reviewPolicy,
    scope: {
      catalogSkillCount: index.length,
      reviewedSkillCount: Object.keys(skills).length,
      benchmarkIndependent: true,
      eligibilityRule: "public-metadata-evidence-not-skill-id",
    },
    reviewLedgerDigest: sha256(fs.readFileSync(REVIEWS_PATH)),
    skills,
  };
}

function main() {
  const write = process.argv.includes("--write");
  const built = buildDocument();
  const serialized = `${canonicalJson(built)}\n`;
  if (write) {
    fs.writeFileSync(OUTPUT_PATH, serialized, { mode: 0o644 });
    process.stdout.write(`Wrote ${Object.keys(built.skills).length} benchmark-independent metadata overrides.\n`);
    return;
  }
  if (fs.readFileSync(OUTPUT_PATH, "utf8") !== serialized) throw new Error("metadata-overrides.v1.json is stale; run with --write");
  process.stdout.write(`Validated ${Object.keys(built.skills).length} benchmark-independent metadata overrides.\n`);
}

if (require.main === module) main();

module.exports = { buildDocument, normalizedJudgment };
