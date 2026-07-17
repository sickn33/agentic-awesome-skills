"use strict";

const REVIEWER_VERSION = "0.6.0";
const RUBRIC_VERSION = "tessl-public-contract-cleanroom-v1";
const PROMPT_VERSION = "aas-codex-app-packet-v14";
const SCHEMA_VERSION = 10;
const SEMANTIC_REVIEWER = Object.freeze({ surface: "codex-app", model: "gpt-5", modelVersion: "app-managed-unexposed" });

const PILOT_LIMITS = Object.freeze({
  skills: 24,
  concurrency: 2,
  maxPacketBytes: 48 * 1024,
  maxInterpretationBytes: 32 * 1024,
  maxEvidenceItemsPerDimension: 3,
  maxExcerptBytes: 2 * 1024,
  maxNarrativeBytes: 4 * 1024,
});

const DIMENSIONS = Object.freeze({
  description: Object.freeze({
    specificity: 0.20,
    trigger_term_quality: 0.30,
    completeness: 0.35,
    distinctiveness_conflict_risk: 0.15,
  }),
  content: Object.freeze({
    conciseness: 0.30,
    actionability: 0.30,
    workflow_clarity: 0.25,
    progressive_disclosure: 0.15,
  }),
});

const COMPONENT_WEIGHTS = Object.freeze({
  validation: 0.20,
  description: 0.40,
  content: 0.40,
});

const ALLOWED_BUNDLE_ROOTS = Object.freeze(["references", "scripts", "assets"]);
const MAX_SKILL_BYTES = 192 * 1024;
const MAX_BUNDLE_FILE_BYTES = 8 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 32 * 1024 * 1024;
const MAX_BUNDLE_FILES = 512;
const MAX_CACHE_BYTES = 2 * 1024 * 1024;
const MAX_FRONTMATTER_DEPTH = 12;
const MAX_FRONTMATTER_NODES = 512;

module.exports = {
  ALLOWED_BUNDLE_ROOTS,
  COMPONENT_WEIGHTS,
  DIMENSIONS,
  MAX_BUNDLE_BYTES,
  MAX_BUNDLE_FILE_BYTES,
  MAX_BUNDLE_FILES,
  MAX_CACHE_BYTES,
  MAX_FRONTMATTER_DEPTH,
  MAX_FRONTMATTER_NODES,
  MAX_SKILL_BYTES,
  PILOT_LIMITS,
  PROMPT_VERSION,
  REVIEWER_VERSION,
  RUBRIC_VERSION,
  SCHEMA_VERSION,
  SEMANTIC_REVIEWER,
};
