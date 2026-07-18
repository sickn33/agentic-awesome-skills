#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const verificationRoot = path.resolve(here, "..", "..");
const repositoryRoot = path.resolve(verificationRoot, "..", "..");
const benchmarkRoot = path.join(verificationRoot, "baseline", "v1", "benchmark");
const frozen = process.argv.includes("--require-approvals");
const failures = [];
const fail = (code, detail) => failures.push({ code, detail });
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function pairDigest(caseData, judgmentData, section) {
  const reviewNeutralJudgment = { ...judgmentData, reviews: [] };
  const payload = section === "abstention"
    ? { case: caseData, label: reviewNeutralJudgment }
    : { case: caseData, gold: reviewNeutralJudgment };
  const bytes = JSON.stringify(canonicalize(payload));
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function requireApprovals(caseId, caseData, judgmentData, section) {
  if (!frozen) return;
  const digest = pairDigest(caseData, judgmentData, section);
  const reviewers = new Set((judgmentData.reviews || [])
    .filter((review) => review.decision === "approved" && review.reviewedDigest === digest)
    .map((review) => review.reviewer));
  if (reviewers.size < 2) fail("AAS_SECONDARY_REVIEW_COUNT", caseId);
}

function validateInputContract(caseData, expectedRequiresSkill) {
  if (!Array.isArray(caseData.targets) || caseData.targets.length === 0) {
    fail("AAS_SECONDARY_TARGETS", caseData.caseId);
  }
  if (!Array.isArray(caseData.policy?.allowedRisk)
    || typeof caseData.policy?.requireKnownSource !== "boolean"
    || typeof caseData.policy?.allowManualSetup !== "boolean") {
    fail("AAS_SECONDARY_POLICY", caseData.caseId);
  }
  if (caseData.requiresSkill !== expectedRequiresSkill) {
    fail("AAS_SECONDARY_REQUIRES_SKILL", caseData.caseId);
  }
}

const catalog = readJson(path.join(repositoryRoot, "data", "skills_index.json"));
const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
const heldOutIndex = readJson(path.join(benchmarkRoot, "held-out-index.json"));
const heldOutFingerprints = new Set(heldOutIndex.cases.map((entry) => entry.taskFamilyId));
const supportedIntents = new Set(Object.keys(heldOutIndex.intentSubIntents));

const abstentionRoot = path.join(benchmarkRoot, "abstention");
const abstentionIndex = readJson(path.join(abstentionRoot, "index.json"));
const reasonRegistry = readJson(path.join(abstentionRoot, abstentionIndex.reasonCodeRegistry));
const reasonCodes = new Set(reasonRegistry.codes.map((entry) => entry.code));
const abstentionFingerprints = new Set();
if (abstentionIndex.cases.length !== 30) fail("AAS_ABSTENTION_CASE_COUNT", abstentionIndex.cases.length);
for (const entry of abstentionIndex.cases) {
  const caseData = readJson(path.join(abstentionRoot, entry.inputPath));
  const labelData = readJson(path.join(abstentionRoot, entry.labelPath));
  if (caseData.caseId !== entry.caseId || labelData.caseId !== entry.caseId) {
    fail("AAS_ABSTENTION_PAIR", entry.caseId);
  }
  validateInputContract(caseData, false);
  if (supportedIntents.has(caseData.intent)) fail("AAS_ABSTENTION_IN_SCOPE_INTENT", entry.caseId);
  if (labelData.expectedStatus !== "insufficientCoverage" || labelData.expectedProposedStack?.length !== 0) {
    fail("AAS_ABSTENTION_LABEL", entry.caseId);
  }
  if (!labelData.reasonCodes?.length || labelData.reasonCodes.some((code) => !reasonCodes.has(code))) {
    fail("AAS_ABSTENTION_REASON_CODE", entry.caseId);
  }
  if (caseData.taskFamilyFingerprint !== entry.taskFamilyFingerprint) {
    fail("AAS_ABSTENTION_FINGERPRINT", entry.caseId);
  }
  if (abstentionFingerprints.has(entry.taskFamilyFingerprint) || heldOutFingerprints.has(entry.taskFamilyFingerprint)) {
    fail("AAS_ABSTENTION_FINGERPRINT_COLLISION", entry.caseId);
  }
  abstentionFingerprints.add(entry.taskFamilyFingerprint);
  requireApprovals(entry.caseId, caseData, labelData, "abstention");
}

const tuningRoot = path.join(benchmarkRoot, "tuning");
const tuningManifest = readJson(path.join(tuningRoot, "manifest.json"));
const tuningIndex = readJson(path.join(tuningRoot, tuningManifest.index));
const tuningFingerprints = new Set();
if (tuningIndex.cases.length !== 60) fail("AAS_TUNING_CASE_COUNT", tuningIndex.cases.length);
for (const intent of supportedIntents) {
  const count = tuningIndex.cases.filter((entry) => entry.intent === intent).length;
  if (count !== 10) fail("AAS_TUNING_INTENT_COUNT", `${intent}/${count}`);
}
for (const entry of tuningIndex.cases) {
  const caseData = readJson(path.join(tuningRoot, entry.inputPath));
  const goldData = readJson(path.join(tuningRoot, entry.goldPath));
  if (caseData.caseId !== entry.caseId || goldData.caseId !== entry.caseId) {
    fail("AAS_TUNING_PAIR", entry.caseId);
  }
  validateInputContract(caseData, true);
  if (caseData.taskFamilyFingerprint !== entry.taskFamilyFingerprint) {
    fail("AAS_TUNING_FINGERPRINT", entry.caseId);
  }
  if (tuningFingerprints.has(entry.taskFamilyFingerprint)
    || heldOutFingerprints.has(entry.taskFamilyFingerprint)
    || abstentionFingerprints.has(entry.taskFamilyFingerprint)) {
    fail("AAS_TUNING_FINGERPRINT_COLLISION", entry.caseId);
  }
  tuningFingerprints.add(entry.taskFamilyFingerprint);
  const solutionFingerprints = new Set();
  for (const solution of goldData.acceptedSolutions || []) {
    const fingerprint = JSON.stringify(canonicalize({
      allowedSkillIds: solution.allowedSkillIds,
      requiredGroups: solution.requiredGroups,
    }));
    if (solutionFingerprints.has(fingerprint)) fail("AAS_TUNING_DUPLICATE_SOLUTION", `${entry.caseId}/${solution.solutionId}`);
    solutionFingerprints.add(fingerprint);
    const allowed = solution.allowedSkillIds || [];
    if (allowed.length === 0) fail("AAS_TUNING_EMPTY_SOLUTION", entry.caseId);
    for (const group of solution.requiredGroups || []) {
      if (!group.length || group.some((skillId) => !allowed.includes(skillId))) {
        fail("AAS_TUNING_REQUIRED_GROUP", `${entry.caseId}/${solution.solutionId}`);
      }
    }
    for (const skillId of allowed) {
      const skill = catalogById.get(skillId);
      if (!skill) {
        fail("AAS_TUNING_UNKNOWN_SKILL", `${entry.caseId}/${skillId}`);
        continue;
      }
      if (skill.risk && skill.risk !== "unknown" && !caseData.policy.allowedRisk.includes(skill.risk)) {
        fail("AAS_TUNING_RISK_VIOLATION", `${entry.caseId}/${skillId}/${skill.risk}`);
      }
      if (skill.plugin?.setup?.type === "manual" && caseData.policy.allowManualSetup !== true) {
        fail("AAS_TUNING_SETUP_VIOLATION", `${entry.caseId}/${skillId}`);
      }
      for (const target of caseData.targets) {
        if (skill.plugin?.targets?.[target.host] === "blocked") {
          fail("AAS_TUNING_HOST_VIOLATION", `${entry.caseId}/${skillId}/${target.host}`);
        }
      }
    }
  }
  requireApprovals(entry.caseId, caseData, goldData, "tuning");
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, frozen, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  frozen,
  abstentionCases: abstentionIndex.cases.length,
  tuningCases: tuningIndex.cases.length,
  disjointFingerprints: heldOutFingerprints.size + abstentionFingerprints.size + tuningFingerprints.size,
}, null, 2));
