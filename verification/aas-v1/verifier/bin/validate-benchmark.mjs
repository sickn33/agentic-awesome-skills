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

function fail(code, detail) {
  failures.push({ code, detail });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("AAS_BENCHMARK_INVALID_JSON", `${path.relative(verificationRoot, file)}: ${error.message}`);
    return null;
  }
}

function walkJson(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkJson(target);
      return entry.isFile() && entry.name.endsWith(".json") ? [target] : [];
    })
    .sort();
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function pairDigest(caseData, goldData) {
  const reviewNeutralGold = { ...goldData, reviews: [] };
  const bytes = JSON.stringify(canonicalize({ case: caseData, gold: reviewNeutralGold }));
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

const index = readJson(path.join(benchmarkRoot, "held-out-index.json"));
const catalog = readJson(path.join(repositoryRoot, "data", "skills_index.json"));
if (!index || !catalog) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

const descriptors = new Map(index.cases.map((entry) => [entry.caseId, entry]));
const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
const caseRoot = path.join(benchmarkRoot, "cases", "held-out");
const goldRoot = path.join(benchmarkRoot, "gold", "held-out");
const caseFiles = walkJson(caseRoot);
const goldFiles = walkJson(goldRoot);
const seenIds = new Set();
const seenFingerprints = new Set();

if (caseFiles.length !== 180) fail("AAS_BENCHMARK_CASE_COUNT", `expected 180, found ${caseFiles.length}`);
if (goldFiles.length !== 180) fail("AAS_BENCHMARK_GOLD_COUNT", `expected 180, found ${goldFiles.length}`);

for (const caseFile of caseFiles) {
  const relative = path.relative(caseRoot, caseFile);
  const goldFile = path.join(goldRoot, relative);
  const caseData = readJson(caseFile);
  const goldData = readJson(goldFile);
  if (!caseData || !goldData) continue;
  const descriptor = descriptors.get(caseData.caseId);

  if (!descriptor) fail("AAS_BENCHMARK_UNKNOWN_CASE", caseData.caseId);
  if (seenIds.has(caseData.caseId)) fail("AAS_BENCHMARK_DUPLICATE_CASE", caseData.caseId);
  seenIds.add(caseData.caseId);
  if (seenFingerprints.has(caseData.taskFamilyFingerprint)) {
    fail("AAS_BENCHMARK_DUPLICATE_FINGERPRINT", caseData.taskFamilyFingerprint);
  }
  seenFingerprints.add(caseData.taskFamilyFingerprint);

  if (!descriptor) continue;
  if (descriptor.inputPath && descriptor.inputPath !== path.relative(benchmarkRoot, caseFile)) {
    fail("AAS_BENCHMARK_PATH_MISMATCH", `${caseData.caseId}/input`);
  }
  if (descriptor.goldPath && descriptor.goldPath !== path.relative(benchmarkRoot, goldFile)) {
    fail("AAS_BENCHMARK_PATH_MISMATCH", `${caseData.caseId}/gold`);
  }
  if (caseData.intent !== descriptor.intent) fail("AAS_BENCHMARK_INTENT_MISMATCH", caseData.caseId);
  if (caseData.taskFamilyFingerprint !== descriptor.taskFamilyId) {
    fail("AAS_BENCHMARK_FINGERPRINT_MISMATCH", caseData.caseId);
  }
  if (goldData.caseId !== caseData.caseId) fail("AAS_BENCHMARK_PAIR_MISMATCH", caseData.caseId);
  if (!Array.isArray(caseData.criticalGoals) || caseData.criticalGoals.length === 0) {
    fail("AAS_BENCHMARK_CRITICAL_GOALS", caseData.caseId);
  }
  if ((caseData.minimumNonCriticalGoalCoverage ?? 0.8) < 0.8) {
    fail("AAS_BENCHMARK_NONCRITICAL_THRESHOLD", caseData.caseId);
  }
  if (caseData.requiresSkill !== true) fail("AAS_BENCHMARK_REQUIRES_SKILL", caseData.caseId);
  if (!Array.isArray(caseData.targets) || caseData.targets.length === 0) {
    fail("AAS_BENCHMARK_TARGETS", caseData.caseId);
  }
  if (!Array.isArray(caseData.policy?.allowedRisk)
    || typeof caseData.policy?.requireKnownSource !== "boolean"
    || typeof caseData.policy?.allowManualSetup !== "boolean") {
    fail("AAS_BENCHMARK_POLICY", caseData.caseId);
  }
  if (!caseData.provenance?.source || !caseData.provenance?.version || !caseData.provenance?.reviewedAt) {
    fail("AAS_BENCHMARK_PROVENANCE", caseData.caseId);
  }

  for (const solution of goldData.acceptedSolutions || []) {
    const allowed = solution.allowedSkillIds || [];
    if (allowed.length === 0 || new Set(allowed).size !== allowed.length) {
      fail("AAS_BENCHMARK_ALLOWED_SKILLS", `${caseData.caseId}/${solution.solutionId}`);
    }
    for (const skillId of allowed) {
      if (!catalogById.has(skillId)) fail("AAS_BENCHMARK_UNKNOWN_SKILL", `${caseData.caseId}/${skillId}`);
    }
    for (const group of solution.requiredGroups || []) {
      if (!Array.isArray(group) || group.length === 0 || group.some((skillId) => !allowed.includes(skillId))) {
        fail("AAS_BENCHMARK_REQUIRED_GROUP", `${caseData.caseId}/${solution.solutionId}`);
      }
    }
  }
  if (!goldData.provenance?.source || !goldData.provenance?.version || !goldData.provenance?.reviewedAt) {
    fail("AAS_BENCHMARK_GOLD_PROVENANCE", caseData.caseId);
  }
  const solutionFingerprints = new Set();
  for (const solution of goldData.acceptedSolutions || []) {
    const fingerprint = JSON.stringify(canonicalize({
      allowedSkillIds: solution.allowedSkillIds,
      requiredGroups: solution.requiredGroups,
    }));
    if (solutionFingerprints.has(fingerprint)) {
      fail("AAS_BENCHMARK_DUPLICATE_SOLUTION", `${caseData.caseId}/${solution.solutionId}`);
    }
    solutionFingerprints.add(fingerprint);
    for (const skillId of solution.allowedSkillIds || []) {
      const skill = catalogById.get(skillId);
      if (!skill) continue;
      const explicitRisk = skill.risk;
      if (explicitRisk && explicitRisk !== "unknown" && !caseData.policy.allowedRisk.includes(explicitRisk)) {
        fail("AAS_BENCHMARK_GOLD_RISK_VIOLATION", `${caseData.caseId}/${skillId}/${explicitRisk}`);
      }
      if (skill.plugin?.setup?.type === "manual" && caseData.policy.allowManualSetup !== true) {
        fail("AAS_BENCHMARK_GOLD_SETUP_VIOLATION", `${caseData.caseId}/${skillId}`);
      }
      for (const target of caseData.targets) {
        if (skill.plugin?.targets?.[target.host] === "blocked") {
          fail("AAS_BENCHMARK_GOLD_HOST_VIOLATION", `${caseData.caseId}/${skillId}/${target.host}`);
        }
      }
    }
  }

  const digest = pairDigest(caseData, goldData);
  const approvedReviews = (goldData.reviews || []).filter((review) => (
    review.decision === "approved" && review.reviewedDigest === digest
  ));
  if (frozen) {
    const uniqueReviewers = new Set(approvedReviews.map((review) => review.reviewer));
    if (uniqueReviewers.size < 2) fail("AAS_BENCHMARK_REVIEW_COUNT", caseData.caseId);
  }
}

for (const descriptor of index.cases) {
  if (!seenIds.has(descriptor.caseId)) fail("AAS_BENCHMARK_MISSING_CASE", descriptor.caseId);
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, frozen, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  frozen,
  cases: caseFiles.length,
  gold: goldFiles.length,
  uniqueFingerprints: seenFingerprints.size,
  catalogSkills: catalogById.size,
}, null, 2));
