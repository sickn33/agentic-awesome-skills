"use strict";

const { ANALYZER_VERSION, analyzeBundle } = require("./analyzer");
const { canonicalJson } = require("./cache");
const { DIMENSIONS, PILOT_LIMITS, PROMPT_VERSION, REVIEWER_VERSION, RUBRIC_VERSION, SCHEMA_VERSION, SEMANTIC_REVIEWER } = require("./constants");
const { verifyJudgment } = require("./evidence");
const { buildPacket, packetHash, secretLike } = require("./packet");
const { aggregateScore, weightedJudgeScore } = require("./score");
const { bundleMap } = require("./safe-bundle");
const { deterministicValidation, splitFrontmatter, tesslAlignedValidation } = require("./validation");
const { productionTriage } = require("./triage");

function requiredString(value, label, maxBytes = 4096) {
  if (typeof value !== "string" || !value.trim() || Buffer.byteLength(value, "utf8") > maxBytes) throw new Error(`${label} must be a bounded non-empty string`);
}

function assertKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  if (canonicalJson(actual) !== canonicalJson([...expected].sort())) throw new Error(`${label} has unexpected properties`);
}

function expectedVersions() {
  return { analyzer: ANALYZER_VERSION, prompt: PROMPT_VERSION, reviewer: REVIEWER_VERSION, rubric: RUBRIC_VERSION, schema: SCHEMA_VERSION };
}

function sanitizeJudgments(judgments) {
  return Object.fromEntries(Object.entries(judgments).map(([kind, judgment]) => [kind, {
    ...judgment,
    dimensions: Object.fromEntries(Object.entries(judgment.dimensions).map(([name, dimension]) => [name, {
      ...dimension,
      evidence: dimension.evidence.map((item) => secretLike(item.excerpt)
        ? { path: item.path, start_line: item.start_line, end_line: item.end_line, redacted: true, excerpt_sha256: require("crypto").createHash("sha256").update(item.excerpt).digest("hex") }
        : item),
    }])),
  }]));
}

function buildResult(bundle, key) {
  const validation = tesslAlignedValidation(bundle, bundle.skillId);
  const aasValidation = deterministicValidation(bundle.files[0].text, bundle.skillId);
  const rawJudgments = analyzeBundle(bundle);
  verifyJudgment("description", rawJudgments.description, bundleMap(bundle), DIMENSIONS.description);
  verifyJudgment("content", rawJudgments.content, bundleMap(bundle), DIMENSIONS.content);
  const descriptionScore = weightedJudgeScore("description", rawJudgments.description.dimensions);
  const contentScore = weightedJudgeScore("content", rawJudgments.content.dimensions);
  const judgments = sanitizeJudgments(rawJudgments);
  const risk = splitFrontmatter(bundle.files[0].text).metadata?.risk || "unknown";
  const result = {
    status: "completed",
    cacheKey: key,
    cacheHit: false,
    skillId: bundle.skillId,
    skillPath: bundle.skillPath,
    bundleHash: bundle.bundleHash,
    files: bundle.files.map(({ path, sha256, size, encoding }) => ({ path, sha256, size, encoding })),
    local_quality_score: aggregateScore(validation.score, descriptionScore, contentScore),
    risk,
    components: { validation, description: descriptionScore, content: contentScore },
    judgments,
    aas_policy: { status: aasValidation.score === 1 ? "pass" : "needs_review", findings: aasValidation.checks.filter((item) => !item.passed), validation: aasValidation },
    confidence: Object.fromEntries(Object.entries(judgments).map(([kind, value]) => [kind, Object.values(value.dimensions).reduce((sum, item) => sum + item.confidence, 0) / Object.keys(value.dimensions).length])),
    versions: expectedVersions(),
  };
  result.triage = productionTriage(result);
  return result;
}

function validateResult(result, bundle, key) {
  const expected = buildResult(bundle, key);
  if (canonicalJson(result) !== canonicalJson(expected)) throw new Error("Result differs from canonical deterministic result");
  return true;
}

function validateRuntimeResult(result, bundle, key) {
  if (typeof result?.cacheHit !== "boolean") throw new Error("Runtime result cache metadata invalid");
  const canonical = result.cacheHit ? { ...result, cacheHit: false } : result;
  validateResult(canonical, bundle, key);
  return true;
}

function validatePacket(packet, result) {
  if (!packet || !/^[0-9a-f]{64}$/.test(packet.packetHash || "") || packet.packetHash !== packetHash(packet)) throw new Error("Packet hash mismatch");
  const expected = buildPacket(result);
  if (canonicalJson(packet) !== canonicalJson(expected)) throw new Error("Packet differs from canonical deterministic packet");
  if (Buffer.byteLength(canonicalJson(packet), "utf8") > PILOT_LIMITS.maxPacketBytes) throw new Error("Packet exceeds byte limit");
  return true;
}

function validateInterpretation(value, packet) {
  assertKeys(value, ["schemaVersion", "kind", "reviewer", "skillId", "bundleHash", "cacheKey", "packetHash", "dimensions", "positives", "shortcomings", "improvements"], "Interpretation");
  if (value.schemaVersion !== SCHEMA_VERSION || value.kind !== "aas-codex-app-interpretation") throw new Error("Interpretation schema mismatch");
  if (!/^[0-9a-f]{64}$/.test(value.packetHash || "") || value.skillId !== packet.skillId || value.bundleHash !== packet.bundleHash || value.cacheKey !== packet.cacheKey || value.packetHash !== packet.packetHash) throw new Error("Interpretation packet binding mismatch");
  if (canonicalJson(value.reviewer) !== canonicalJson(SEMANTIC_REVIEWER)) throw new Error("Interpretation semantic reviewer binding mismatch");
  assertKeys(value.dimensions, ["description", "content"], "Interpretation dimensions");
  for (const kind of ["description", "content"]) {
    const expected = Object.keys(DIMENSIONS[kind]);
    assertKeys(value.dimensions[kind], expected, `Interpretation ${kind}`);
    for (const name of expected) {
      const item = value.dimensions[kind][name];
      assertKeys(item, ["verdict", "note", "evidence_ids"], `Interpretation ${kind}.${name}`);
      if (!["agree", "uncertain", "disagree"].includes(item.verdict)) throw new Error("Interpretation verdict invalid");
      requiredString(item.note, "interpretation note", PILOT_LIMITS.maxNarrativeBytes);
      if (secretLike(item.note)) throw new Error("Interpretation narrative contains a secret-like value");
      if (!Array.isArray(item.evidence_ids) || item.evidence_ids.length < 1 || item.evidence_ids.length > PILOT_LIMITS.maxEvidenceItemsPerDimension) throw new Error("Interpretation evidence ids invalid");
      const allowedEvidence = new Set(packet.deterministic.dimensions[kind][name].evidence_ids);
      for (const id of item.evidence_ids) if (!allowedEvidence.has(id)) throw new Error("Interpretation evidence id outside its dimension");
    }
  }
  for (const field of ["positives", "shortcomings", "improvements"]) {
    if (!Array.isArray(value[field]) || value[field].length < 1 || value[field].length > 8) throw new Error(`Interpretation ${field} invalid`);
    for (const item of value[field]) {
      requiredString(item, `interpretation ${field}`, PILOT_LIMITS.maxNarrativeBytes);
      if (secretLike(item)) throw new Error("Interpretation narrative contains a secret-like value");
    }
  }
  if (Buffer.byteLength(canonicalJson(value), "utf8") > PILOT_LIMITS.maxInterpretationBytes) throw new Error("Interpretation exceeds byte limit");
  return true;
}

function validateProposal(value) {
  assertKeys(value, ["schemaVersion", "kind", "skillId", "targetPath", "inputSha256", "candidateSha256", "patchSha256", "versions", "packetHash", "interpretationHash", "reviewer", "applyCapability", "isolatedRootDeleted", "patchCheck", "validation", "analysis"], "Proposal");
  if (value.schemaVersion !== SCHEMA_VERSION || value.kind !== "aas-local-skill-proposal" || canonicalJson(value.reviewer) !== canonicalJson(SEMANTIC_REVIEWER)) throw new Error("Proposal schema mismatch");
  if (![value.inputSha256, value.candidateSha256, value.patchSha256, value.packetHash, value.interpretationHash].every((item) => /^[0-9a-f]{64}$/.test(item))) throw new Error("Proposal binding hash invalid");
  if (value.applyCapability !== false || value.isolatedRootDeleted !== true || value.patchCheck !== "passed") throw new Error("Proposal safety attestation invalid");
  if (canonicalJson(value.versions) !== canonicalJson(expectedVersions())) throw new Error("Proposal version mismatch");
  return true;
}

function validateProposalCompletion(value) {
  assertKeys(value, ["schemaVersion", "kind", "skillId", "patchSha256", "reportSha256"], "Proposal completion");
  if (value.schemaVersion !== SCHEMA_VERSION || value.kind !== "aas-local-skill-proposal-complete") throw new Error("Proposal completion schema mismatch");
  requiredString(value.skillId, "Proposal completion skill id", 1024);
  if (![value.patchSha256, value.reportSha256].every((item) => /^[0-9a-f]{64}$/.test(item))) throw new Error("Proposal completion hash invalid");
  return true;
}

module.exports = { assertKeys, buildResult, expectedVersions, requiredString, sanitizeJudgments, validateInterpretation, validatePacket, validateProposal, validateProposalCompletion, validateResult, validateRuntimeResult };
