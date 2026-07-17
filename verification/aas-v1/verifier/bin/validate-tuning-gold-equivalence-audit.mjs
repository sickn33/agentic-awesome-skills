#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { caseInclusionAssessment, macroAverage } from "../lib/metrics.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const verificationRoot = path.resolve(here, "..", "..");
const repositoryRoot = path.resolve(verificationRoot, "..", "..");
const baselineRoot = path.join(verificationRoot, "baseline", "v1");
const tuningRoot = path.join(baselineRoot, "benchmark", "tuning");
const reviewsRoot = path.join(baselineRoot, "reviews");
const auditPath = path.join(reviewsRoot, "tuning-gold-equivalence-audit.json");
const failures = [];

function fail(code, detail) {
  failures.push({ code, detail });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("AAS_TUNING_AUDIT_INVALID_JSON", `${path.relative(verificationRoot, file)}: ${error.message}`);
    return null;
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256File(file) {
  return sha256(fs.readFileSync(file));
}

function pairDigest(caseData, goldData) {
  const reviewNeutralGold = { ...goldData, reviews: [] };
  return `sha256-${sha256(Buffer.from(canonicalJson({ case: caseData, gold: reviewNeutralGold })))}`;
}

function decisionKey(caseId, skillId) {
  return `${caseId}\u0000${skillId}`;
}

function decisionMap(report) {
  return new Map((report.decisions || []).map((entry) => [decisionKey(entry.caseId, entry.skillId), entry]));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const audit = readJson(auditPath);
if (!audit) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

const diagnosticPath = path.join(verificationRoot, audit.diagnostic.path);
if (!fs.existsSync(diagnosticPath)) {
  fail("AAS_TUNING_AUDIT_DIAGNOSTIC_MISSING", audit.diagnostic.path);
}
const diagnostic = fs.existsSync(diagnosticPath) ? readJson(diagnosticPath) : null;
if (diagnostic && sha256File(diagnosticPath) !== audit.diagnostic.sha256) {
  fail("AAS_TUNING_AUDIT_DIAGNOSTIC_DIGEST", audit.diagnostic.path);
}
if (diagnostic) {
  if (diagnostic.reportType !== "aas-v1-tuning-diagnostic"
    || diagnostic.benchmark?.tuningOnly !== true
    || diagnostic.benchmark?.caseCount !== 60
    || diagnostic.caseReports?.length !== 60
    || diagnostic.caseReports.some((entry) => !entry.caseId?.startsWith("tuning."))) {
    fail("AAS_TUNING_AUDIT_DIAGNOSTIC_SCOPE", "The frozen input must contain exactly 60 tuning-only results.");
  }
  if ((diagnostic.benchmark?.roots || []).some((root) => !root.includes("/tuning/"))) {
    fail("AAS_TUNING_AUDIT_DIAGNOSTIC_ROOT", diagnostic.benchmark?.roots);
  }
  if (diagnostic.catalog?.digest !== audit.diagnostic.catalogDigest) {
    fail("AAS_TUNING_AUDIT_CATALOG_DIGEST", diagnostic.catalog?.digest);
  }
}

const publicIndexPath = path.join(repositoryRoot, "data", "skills_index.json");
if (sha256File(publicIndexPath) !== audit.baseline.publicSkillsIndexSha256) {
  fail("AAS_TUNING_AUDIT_PUBLIC_INDEX_DIGEST", "data/skills_index.json");
}

const reports = new Map();
for (const descriptor of audit.reviewReports || []) {
  const reportPath = path.join(verificationRoot, descriptor.path);
  if (!fs.existsSync(reportPath)) {
    fail("AAS_TUNING_AUDIT_REVIEW_MISSING", descriptor.path);
    continue;
  }
  if (sha256File(reportPath) !== descriptor.sha256) {
    fail("AAS_TUNING_AUDIT_REVIEW_DIGEST", descriptor.path);
  }
  const report = readJson(reportPath);
  if (!report) continue;
  if (report.reviewer?.identity !== descriptor.reviewer
    || report.reviewer?.scorerImplementer !== false
    || report.scope?.tuningOnly !== true
    || report.scope?.heldOutContentsRead !== false
    || report.scope?.abstentionLabelsRead !== false
    || report.scope?.diagnosticSha256 !== audit.diagnostic.sha256
    || report.scope?.assignedClaimCount !== report.decisions?.length
    || descriptor.claimCount !== report.decisions?.length) {
    fail("AAS_TUNING_AUDIT_REVIEW_SCOPE", descriptor.reviewer);
  }
  const counted = {
    ADD_TO_ALLOWED_EQUIVALENT: 0,
    REJECT_NOT_EQUIVALENT: 0,
    AMBIGUOUS_NEEDS_ADJUDICATION: 0,
  };
  const keys = new Set();
  for (const decision of report.decisions || []) {
    counted[decision.decision] += 1;
    const key = decisionKey(decision.caseId, decision.skillId);
    if (keys.has(key)) fail("AAS_TUNING_AUDIT_REVIEW_DUPLICATE_DECISION", `${descriptor.reviewer}/${key}`);
    keys.add(key);
    if (!decision.caseId.startsWith("tuning.")) fail("AAS_TUNING_AUDIT_REVIEW_NON_TUNING", key);
    if (decision.decision === "ADD_TO_ALLOWED_EQUIVALENT" && !decision.coherentSolution) {
      fail("AAS_TUNING_AUDIT_REVIEW_ADD_WITHOUT_SOLUTION", key);
    }
  }
  if (canonicalJson(counted) !== canonicalJson(report.decisionCounts)) {
    fail("AAS_TUNING_AUDIT_REVIEW_COUNTS", descriptor.reviewer);
  }
  for (const evidence of report.skillEvidence || []) {
    const evidencePath = path.resolve(repositoryRoot, evidence.path);
    const relative = path.relative(path.join(repositoryRoot, "skills"), evidencePath);
    if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(evidencePath)) {
      fail("AAS_TUNING_AUDIT_SKILL_EVIDENCE_PATH", evidence.path);
      continue;
    }
    if (sha256File(evidencePath) !== evidence.sha256) {
      fail("AAS_TUNING_AUDIT_SKILL_EVIDENCE_DIGEST", evidence.path);
    }
  }
  reports.set(descriptor.reviewer, report);
}

const alpha = reports.get("gold-equivalence-independent-alpha");
const beta = reports.get("gold-equivalence-independent-beta");
const adjudicator = reports.get("gold-equivalence-independent-adjudicator");
const tiebreak = reports.get("gold-equivalence-independent-ci-tiebreak");
const alphaKeys = new Set((alpha?.decisions || []).map((entry) => decisionKey(entry.caseId, entry.skillId)));
const betaKeys = new Set((beta?.decisions || []).map((entry) => decisionKey(entry.caseId, entry.skillId)));
if ([...alphaKeys].some((key) => betaKeys.has(key))) {
  fail("AAS_TUNING_AUDIT_PRIMARY_ASSIGNMENTS_OVERLAP", "Primary assignments must be disjoint.");
}

const claimMap = new Map();
for (const claim of audit.claims || []) {
  const key = decisionKey(claim.caseId, claim.skillId);
  if (claimMap.has(key)) fail("AAS_TUNING_AUDIT_DUPLICATE_CLAIM", key);
  claimMap.set(key, claim);
}
if (claimMap.size !== 19 || audit.claims?.filter((entry) => entry.decision === "ADD_TO_ALLOWED_EQUIVALENT").length !== 8) {
  fail("AAS_TUNING_AUDIT_CLAIM_COUNTS", { total: claimMap.size });
}
const primaryUnion = new Set([...alphaKeys, ...betaKeys]);
if (canonicalJson([...primaryUnion].sort()) !== canonicalJson([...claimMap.keys()].sort())) {
  fail("AAS_TUNING_AUDIT_PRIMARY_COVERAGE", "The disjoint primary assignments must cover every omission claim exactly once.");
}
const adjudicatorMap = adjudicator ? decisionMap(adjudicator) : new Map();
const tiebreakMap = tiebreak ? decisionMap(tiebreak) : new Map();
const primaryMap = new Map([
  ...[...(alpha ? decisionMap(alpha) : new Map())],
  ...[...(beta ? decisionMap(beta) : new Map())],
]);
for (const [key, claim] of claimMap) {
  const primary = primaryMap.get(key);
  const adjudicated = adjudicatorMap.get(key);
  if (!primary || !adjudicated) {
    fail("AAS_TUNING_AUDIT_CLAIM_REVIEW_MISSING", key);
    continue;
  }
  if (claim.resolution === "independent-agreement" || claim.resolution === "independent-agreement-on-conservative-exact-gold") {
    if (primary.decision !== claim.decision || adjudicated.decision !== claim.decision) {
      fail("AAS_TUNING_AUDIT_AGREEMENT_MISMATCH", key);
    }
  } else if (claim.resolution === "ambiguity-adjudicated-reject") {
    if (primary.decision !== "AMBIGUOUS_NEEDS_ADJUDICATION"
      || adjudicated.decision !== "REJECT_NOT_EQUIVALENT"
      || claim.decision !== "REJECT_NOT_EQUIVALENT") {
      fail("AAS_TUNING_AUDIT_AMBIGUITY_RESOLUTION", key);
    }
  } else if (claim.resolution === "independent-tiebreak-with-dissent-retained") {
    const tieDecision = tiebreakMap.get(key);
    if (primary.decision !== "ADD_TO_ALLOWED_EQUIVALENT"
      || adjudicated.decision !== "REJECT_NOT_EQUIVALENT"
      || tieDecision?.decision !== "ADD_TO_ALLOWED_EQUIVALENT"
      || claim.decision !== "ADD_TO_ALLOWED_EQUIVALENT") {
      fail("AAS_TUNING_AUDIT_TIEBREAK_RESOLUTION", key);
    }
  } else {
    fail("AAS_TUNING_AUDIT_UNKNOWN_RESOLUTION", `${key}/${claim.resolution}`);
  }
}

if (diagnostic) {
  const diagnosticClaims = new Set();
  let omissionCases = 0;
  for (const report of diagnostic.caseReports) {
    if (!(report.inclusionCount > 0 && report.inclusionPrecision < 1)) continue;
    omissionCases += 1;
    const claims = (audit.claims || []).filter((entry) => entry.caseId === report.caseId);
    if (claims.length !== report.inclusionCount - report.acceptedInclusionCount
      || claims.some((entry) => !report.includedSkillIds.includes(entry.skillId))) {
      fail("AAS_TUNING_AUDIT_DIAGNOSTIC_CLAIM_MAPPING", report.caseId);
    }
    for (const claim of claims) diagnosticClaims.add(decisionKey(claim.caseId, claim.skillId));
  }
  if (omissionCases !== 17 || diagnosticClaims.size !== 19) {
    fail("AAS_TUNING_AUDIT_DIAGNOSTIC_OMISSION_COUNTS", { omissionCases, claims: diagnosticClaims.size });
  }
}

const tuningManifest = readJson(path.join(tuningRoot, "manifest.json"));
const tuningIndex = tuningManifest ? readJson(path.join(tuningRoot, tuningManifest.index)) : null;
const indexById = new Map((tuningIndex?.cases || []).map((entry) => [entry.caseId, entry]));
const changedCaseIds = new Set();
for (const changed of audit.changedPairs || []) {
  if (changedCaseIds.has(changed.caseId)) fail("AAS_TUNING_AUDIT_DUPLICATE_CHANGED_PAIR", changed.caseId);
  changedCaseIds.add(changed.caseId);
  const descriptor = indexById.get(changed.caseId);
  if (!descriptor) {
    fail("AAS_TUNING_AUDIT_CHANGED_PAIR_UNKNOWN", changed.caseId);
    continue;
  }
  const caseData = readJson(path.join(tuningRoot, descriptor.inputPath));
  const goldData = readJson(path.join(tuningRoot, descriptor.goldPath));
  if (!caseData || !goldData) continue;
  const digest = pairDigest(caseData, goldData);
  if (digest !== changed.newPairDigest) fail("AAS_TUNING_AUDIT_CHANGED_PAIR_DIGEST", changed.caseId);
  if (changed.priorPairDigest === changed.newPairDigest) fail("AAS_TUNING_AUDIT_CHANGED_PAIR_NO_CHANGE", changed.caseId);
  if (goldData.provenance?.source !== audit.provenance.source
    || goldData.provenance?.version !== audit.provenance.version
    || goldData.provenance?.reviewedAt !== audit.provenance.reviewedAt) {
    fail("AAS_TUNING_AUDIT_GOLD_PROVENANCE", changed.caseId);
  }
  const solution = (goldData.acceptedSolutions || []).find((entry) => entry.solutionId === changed.solutionId);
  if (!solution) fail("AAS_TUNING_AUDIT_SOLUTION_MISSING", `${changed.caseId}/${changed.solutionId}`);
  const approved = new Set((goldData.reviews || [])
    .filter((entry) => entry.decision === "approved" && entry.reviewedDigest === digest)
    .map((entry) => entry.reviewer));
  if (canonicalJson([...approved].sort()) !== canonicalJson([...changed.approvingReviewers].sort())) {
    fail("AAS_TUNING_AUDIT_PAIR_APPROVALS", changed.caseId);
  }
  const addedClaims = (audit.claims || []).filter((entry) => (
    entry.caseId === changed.caseId && entry.decision === "ADD_TO_ALLOWED_EQUIVALENT"
  ));
  if (!solution || addedClaims.some((entry) => !solution.allowedSkillIds.includes(entry.skillId))) {
    fail("AAS_TUNING_AUDIT_SOLUTION_CLAIMS", changed.caseId);
  }
  for (const reviewer of changed.approvingReviewers) {
    const report = reports.get(reviewer);
    for (const claim of addedClaims) {
      const decision = decisionMap(report || { decisions: [] }).get(decisionKey(claim.caseId, claim.skillId));
      if (decision?.decision !== "ADD_TO_ALLOWED_EQUIVALENT"
        || canonicalJson(decision.coherentSolution) !== canonicalJson(solution)) {
        fail("AAS_TUNING_AUDIT_EXACT_GOLD_ATTESTATION", `${changed.caseId}/${reviewer}/${claim.skillId}`);
      }
    }
  }
}
if (changedCaseIds.size !== 7) fail("AAS_TUNING_AUDIT_CHANGED_PAIR_COUNT", changedCaseIds.size);
for (const descriptor of tuningIndex?.cases || []) {
  const gold = readJson(path.join(tuningRoot, descriptor.goldPath));
  if (gold?.provenance?.source === audit.provenance.source && !changedCaseIds.has(descriptor.caseId)) {
    fail("AAS_TUNING_AUDIT_UNDECLARED_GOLD_CHANGE", descriptor.caseId);
  }
}

if (diagnostic && tuningIndex) {
  const reportsAfter = diagnostic.caseReports.map((report) => {
    const descriptor = indexById.get(report.caseId);
    const gold = descriptor ? readJson(path.join(tuningRoot, descriptor.goldPath)) : null;
    if (!gold) return { ...report, acceptedInclusionCount: 0, inclusionPrecision: null };
    const inclusion = caseInclusionAssessment(report.includedSkillIds, gold.acceptedSolutions);
    return {
      ...report,
      acceptedInclusionCount: inclusion.acceptedCount,
      inclusionPrecision: inclusion.precision,
      matchedSolutionId: inclusion.matchedSolutionId,
    };
  });
  const intents = [...new Set(reportsAfter.map((entry) => entry.intent))].sort();
  const perIntent = intents.map((intent) => {
    const entries = reportsAfter.filter((entry) => entry.intent === intent);
    const acceptedInclusions = entries.reduce((sum, entry) => sum + entry.acceptedInclusionCount, 0);
    const totalInclusions = entries.reduce((sum, entry) => sum + entry.inclusionCount, 0);
    return {
      intent,
      verifiedCoverage: entries.filter((entry) => entry.verified).length / entries.length,
      inclusionPrecision: acceptedInclusions / totalInclusions,
      criticalGoalCoverage: mean(entries.map((entry) => entry.criticalGoalCoverage)),
      nonCriticalGoalCoverage: mean(entries.map((entry) => entry.nonCriticalGoalCoverage)),
      acceptedInclusions,
      totalInclusions,
      hardPolicyViolations: entries.reduce((sum, entry) => sum + entry.hardPolicyViolationCount, 0),
    };
  });
  const afterMacro = {
    verifiedCoverage: macroAverage(perIntent, "verifiedCoverage"),
    inclusionPrecision: macroAverage(perIntent, "inclusionPrecision"),
    criticalGoalCoverage: macroAverage(perIntent, "criticalGoalCoverage"),
    nonCriticalGoalCoverage: macroAverage(perIntent, "nonCriticalGoalCoverage"),
  };
  const afterPerIntentPrecision = Object.fromEntries(perIntent.map((entry) => [entry.intent, entry.inclusionPrecision]));
  const beforePerIntentPrecision = Object.fromEntries(diagnostic.perIntent.map((entry) => [entry.intent, entry.inclusionPrecision]));
  if (canonicalJson(audit.metricImplications.before.macro) !== canonicalJson(diagnostic.macro)
    || canonicalJson(audit.metricImplications.before.perIntentInclusionPrecision) !== canonicalJson(beforePerIntentPrecision)
    || canonicalJson(audit.metricImplications.after.macro) !== canonicalJson(afterMacro)
    || canonicalJson(audit.metricImplications.after.perIntentInclusionPrecision) !== canonicalJson(afterPerIntentPrecision)) {
    fail("AAS_TUNING_AUDIT_METRIC_IMPLICATIONS", { afterMacro, afterPerIntentPrecision });
  }
  const acceptedBefore = diagnostic.perIntent.reduce((sum, entry) => sum + entry.acceptedInclusions, 0);
  const acceptedAfter = perIntent.reduce((sum, entry) => sum + entry.acceptedInclusions, 0);
  const expectedDelta = {
    macroInclusionPrecision: afterMacro.inclusionPrecision - diagnostic.macro.inclusionPrecision,
    verifiedCoverage: afterMacro.verifiedCoverage - diagnostic.macro.verifiedCoverage,
    criticalGoalCoverage: afterMacro.criticalGoalCoverage - diagnostic.macro.criticalGoalCoverage,
    nonCriticalGoalCoverage: afterMacro.nonCriticalGoalCoverage - diagnostic.macro.nonCriticalGoalCoverage,
    acceptedInclusions: acceptedAfter - acceptedBefore,
  };
  if (canonicalJson(expectedDelta) !== canonicalJson(audit.metricImplications.delta)) {
    fail("AAS_TUNING_AUDIT_METRIC_DELTA", expectedDelta);
  }
  const hardPolicyViolations = perIntent.reduce((sum, entry) => sum + entry.hardPolicyViolations, 0);
  const postAuditGates = {
    hardPolicyViolations: hardPolicyViolations === 0,
    inclusionPrecision: afterMacro.inclusionPrecision >= diagnostic.thresholds.inclusionPrecision
      && perIntent.every((entry) => entry.inclusionPrecision >= diagnostic.thresholds.inclusionPrecision),
    verifiedCoverage: afterMacro.verifiedCoverage >= diagnostic.thresholds.verifiedCoverage
      && perIntent.every((entry) => entry.verifiedCoverage >= diagnostic.thresholds.verifiedCoverage),
  };
  if (canonicalJson(postAuditGates) !== canonicalJson(audit.metricImplications.postAuditGates)) {
    fail("AAS_TUNING_AUDIT_POST_GATES", postAuditGates);
  }
  const changedPrecisionCases = reportsAfter
    .filter((entry, index) => entry.inclusionPrecision !== diagnostic.caseReports[index].inclusionPrecision)
    .map((entry) => entry.caseId)
    .sort();
  if (canonicalJson(changedPrecisionCases) !== canonicalJson([...changedCaseIds].sort())) {
    fail("AAS_TUNING_AUDIT_METRIC_CHANGE_SCOPE", changedPrecisionCases);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  auditId: audit.auditId,
  omissionCases: audit.scope.omissionCaseCount,
  claims: audit.scope.omittedInclusionCount,
  changedPairs: audit.scope.changedPairCount,
  independentReviewers: reports.size,
  macroInclusionPrecisionBefore: audit.metricImplications.before.macro.inclusionPrecision,
  macroInclusionPrecisionAfter: audit.metricImplications.after.macro.inclusionPrecision,
  postAuditGates: audit.metricImplications.postAuditGates,
}, null, 2));
