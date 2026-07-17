#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const modeArg = process.argv.indexOf("--mode");
const mode = modeArg >= 0 ? process.argv[modeArg + 1] : "structure";

if (!["structure", "freeze-ready"].includes(mode)) {
  console.error(`Unknown mode: ${mode}`);
  process.exit(64);
}

const failures = [];
const pending = [];
const assert = (condition, code, detail) => {
  if (!condition) failures.push({ code, detail });
};
const requireForFreeze = (condition, code, detail) => {
  if (!condition) pending.push({ code, detail });
};
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

const schemaDir = path.join(root, "schemas");
const schemaFiles = fs.readdirSync(schemaDir).filter((name) => name.endsWith(".schema.json"));
assert(schemaFiles.length >= 9, "AAS_BASELINE_SCHEMA_SET_INCOMPLETE", "At least nine public schemas are required.");
for (const schemaFile of schemaFiles) {
  const schema = readJson(`schemas/${schemaFile}`);
  assert(schema.$schema === "https://json-schema.org/draft/2020-12/schema", "AAS_BASELINE_SCHEMA_DRAFT", schemaFile);
  assert(typeof schema.$id === "string" && schema.$id.length > 0, "AAS_BASELINE_SCHEMA_ID", schemaFile);
}

const metrics = readJson("baseline/v1/metrics.json");
assert(metrics.heldOutCasesPerIntent === 30, "AAS_BASELINE_METRIC_DENOMINATOR", "Expected 30 held-out cases per intent.");
assert(metrics.thresholds.verifiedCoverage === 0.8, "AAS_BASELINE_METRIC_COVERAGE", "Coverage threshold must be 0.8.");
assert(metrics.thresholds.inclusionPrecision === 0.9, "AAS_BASELINE_METRIC_PRECISION", "Precision threshold must be 0.9.");
assert(metrics.thresholds.outOfCoverageAbstention === 1, "AAS_BASELINE_METRIC_ABSTENTION", "Abstention threshold must be 1.");
assert(metrics.thresholds.hardPolicyViolations === 0, "AAS_BASELINE_METRIC_POLICY", "Hard-policy violations must be zero.");
assert(metrics.canonicalComparisonExcludedFields.length === 4, "AAS_BASELINE_CANONICAL_EXCLUSIONS", "Canonical exclusions must be an explicit four-field list.");

const benchmark = readJson("baseline/v1/benchmark/manifest.json");
const heldOut = readJson("baseline/v1/benchmark/held-out-index.json");
const tuningManifest = readJson("baseline/v1/benchmark/tuning/manifest.json");
const expectedIntents = [
  "web-application-delivery",
  "api-backend-delivery",
  "test-qa-automation",
  "security-review-hardening",
  "deployment-devops",
  "agent-mcp-development",
];
assert(JSON.stringify(benchmark.intents) === JSON.stringify(expectedIntents), "AAS_BASELINE_INTENTS", "The six frozen intents changed.");
assert(benchmark.benchmarkVersion === "1.0.1", "AAS_BASELINE_BENCHMARK_VERSION", "The independently amended benchmark must be version 1.0.1.");
assert(tuningManifest.tuningVersion === "1.0.1"
  && tuningManifest.equivalenceAudit?.auditId === "aas-v1-tuning-gold-equivalence-1.0.1"
  && tuningManifest.equivalenceAudit?.changedPairs === 7,
"AAS_BASELINE_TUNING_AUDIT", "The tuning-gold equivalence amendment is missing or incomplete.");
assert(heldOut.cases.length === 180, "AAS_BASELINE_HELDOUT_COUNT", `Expected 180 descriptors, found ${heldOut.cases.length}.`);
assert(new Set(heldOut.cases.map((entry) => entry.caseId)).size === 180, "AAS_BASELINE_CASE_ID_DUPLICATE", "Held-out case IDs must be unique.");
assert(new Set(heldOut.cases.map((entry) => entry.taskFamilyId)).size === 180, "AAS_BASELINE_TASK_FAMILY_DUPLICATE", "Task families must be unique.");
for (const intent of expectedIntents) {
  const cases = heldOut.cases.filter((entry) => entry.intent === intent);
  const subIntents = heldOut.intentSubIntents[intent];
  assert(cases.length === 30, "AAS_BASELINE_INTENT_CASE_COUNT", `${intent}: ${cases.length}`);
  assert(Array.isArray(subIntents) && subIntents.length === 5, "AAS_BASELINE_SUBINTENT_COUNT", intent);
  assert(new Set(cases.map((entry) => entry.archetype)).size === 6, "AAS_BASELINE_ARCHETYPE_COUNT", intent);
  for (const subIntent of subIntents || []) {
    for (const archetype of heldOut.archetypes) {
      assert(cases.some((entry) => entry.subIntent === subIntent && entry.archetype === archetype), "AAS_BASELINE_DIVERSIFICATION_CELL", `${intent}/${subIntent}/${archetype}`);
    }
  }
}
assert(heldOut.cases.every((entry) => !("acceptedSolutions" in entry) && !("expectedStack" in entry)), "AAS_BASELINE_FABRICATED_LABEL", "Structural descriptors must not contain gold labels.");
requireForFreeze(benchmark.labelsFrozen === true, "AAS_BASELINE_LABELS_PENDING", "Held-out labels are not frozen.");
requireForFreeze(heldOut.cases.every((entry) => entry.inputPath && entry.goldPath && entry.provenance && entry.reviewStatus === "approved"), "AAS_BASELINE_CASES_PENDING", "Real case inputs, gold sets, provenance, or approvals are missing.");
requireForFreeze(benchmark.abstention.labelsFrozen === true && benchmark.abstention.caseCount > 0, "AAS_BASELINE_ABSTENTION_PENDING", "The separate abstention set is not frozen.");
requireForFreeze(benchmark.tuning.status === "frozen", "AAS_BASELINE_TUNING_PENDING", "The tuning set is not frozen separately.");

const budgets = readJson("baseline/v1/budgets.json");
const sum = (strata) => strata.reduce((total, stratum) => total + stratum.executions, 0);
assert(budgets.propertyAndGenerative.minimumExecutions === 100000, "AAS_BASELINE_PROPERTY_BUDGET", "Property/generative budget must be 100000.");
assert(sum(budgets.propertyAndGenerative.strata) === 100000, "AAS_BASELINE_PROPERTY_DISTRIBUTION", "Property/generative strata must sum to 100000.");
assert(budgets.parserAndMcpFuzz.minimumExecutions === 50000, "AAS_BASELINE_FUZZ_BUDGET", "Parser/MCP fuzz budget must be 50000.");
assert(sum(budgets.parserAndMcpFuzz.strata) === 50000, "AAS_BASELINE_FUZZ_DISTRIBUTION", "Parser/MCP fuzz strata must sum to 50000.");
assert(budgets.hardGate.budgetReductionAllowed === false, "AAS_BASELINE_BUDGET_REDUCTION", "Budget reduction must be forbidden.");
requireForFreeze(budgets.status === "frozen" && budgets.prng.rootSeed && budgets.prng.algorithm !== "pending-independent-review", "AAS_BASELINE_SEEDS_PENDING", "Independent PRNG seed and derivation are pending.");

const hostile = readJson("baseline/v1/hostile/manifest.json");
assert(hostile.classes.some((entry) => entry.surface === "archive"), "AAS_BASELINE_ARCHIVE_CORPUS", "Archive classes are missing.");
assert(hostile.classes.some((entry) => entry.surface === "input"), "AAS_BASELINE_INPUT_CORPUS", "Input classes are missing.");
assert(new Set(hostile.classes.map((entry) => entry.classId)).size === hostile.classes.length, "AAS_BASELINE_HOSTILE_DUPLICATE", "Hostile class IDs must be unique.");
assert(hostile.classes.every((entry) => entry.exploit.expected === "reject" && entry.boundaryControl.expected === "accept"), "AAS_BASELINE_HOSTILE_PAIR", "Every hostile class requires reject/accept pairs.");
requireForFreeze(hostile.status === "frozen" && hostile.classes.every((entry) => entry.status === "frozen" && entry.exploit.path && entry.exploit.sha256 && entry.boundaryControl.path && entry.boundaryControl.sha256), "AAS_BASELINE_HOSTILE_FIXTURES_PENDING", "Hostile exploit/control fixtures and hashes are pending.");

const runtime = readJson("baseline/v1/runtime-matrix.json");
const expectedJobs = new Set(["linux-node-22", "linux-node-24", "macos-node-22", "macos-node-24", "windows-node-22", "windows-node-24"]);
assert(runtime.jobs.length === 6 && runtime.jobs.every((job) => expectedJobs.has(job.id)), "AAS_BASELINE_RUNTIME_MATRIX", "Runtime matrix must contain exactly six OS/Node jobs.");
assert(runtime.skipsAllowed === false && runtime.continueOnErrorAllowed === false, "AAS_BASELINE_MATRIX_FAILURE_POLICY", "Skips and allowed failures are forbidden.");
requireForFreeze(runtime.status === "frozen" && runtime.jobs.every((job) => job.nodePatch && job.runnerImage && job.architecture && job.filesystem && job.observer && job.status === "frozen"), "AAS_BASELINE_RUNTIME_IDENTITIES_PENDING", "Exact Node, runner, architecture, filesystem, or observer identities are pending.");

const legacy = readJson("baseline/v1/legacy/14.6.0/manifest.json");
assert(legacy.baseline.version === "14.6.0", "AAS_BASELINE_LEGACY_VERSION", "Legacy baseline version changed.");
assert(legacy.baseline.distIntegrity === "sha512-VTOb3O9PSYKCDO99i3h0vOn7vHQlGtO/+jSErR80g6OGaDJoBzg3q2GE9Nu890en1/Z54hBEYiVQj/1Rl95xEg==", "AAS_BASELINE_LEGACY_SRI", "Legacy npm SRI changed.");
assert(legacy.baseline.sourceCommit === "ab5f6c205a548d2f4bec411728c79b9c156fc696", "AAS_BASELINE_LEGACY_COMMIT", "Legacy source commit changed.");
const allArgs = legacy.cases.flatMap((entry) => entry.args);
for (const flag of legacy.publicFlags) {
  assert(allArgs.includes(flag), "AAS_BASELINE_LEGACY_FLAG_COVERAGE", flag);
}
for (const target of legacy.targets) {
  assert(legacy.cases.some((entry) => entry.args.includes(`--${target}`)), "AAS_BASELINE_LEGACY_TARGET_COVERAGE", target);
}
assert(legacy.cases.some((entry) => entry.args.includes("install")), "AAS_BASELINE_LEGACY_INSTALL_COMMAND", "Literal install command is missing.");
requireForFreeze(legacy.status === "frozen" && legacy.fixtureRepository.treeDigest && legacy.fixtureRepository.fakeGitTraceDigest && legacy.cases.every((entry) => entry.expectedSnapshot), "AAS_BASELINE_LEGACY_SNAPSHOTS_PENDING", "Legacy fixture digests or expected snapshots are pending.");

const ownership = readJson("ownership.v1.json");
assert(ownership.minimumApprovals === 2 && ownership.requireNonScorerReviewer === true, "AAS_BASELINE_OWNERSHIP_POLICY", "Two approvals including a non-scorer reviewer are required.");
const reviewerIdentities = new Set(ownership.reviewers.map((reviewer) => reviewer.identity));
const reviewerReportsValid = ownership.reviewers.every((reviewer) => {
  if (!reviewer.report || !reviewer.reportSha256 || reviewer.reviewedPairs !== 270) return false;
  const reportPath = path.join(root, reviewer.report);
  if (!fs.existsSync(reportPath)) return false;
  const digest = crypto.createHash("sha256")
    .update(fs.readFileSync(reportPath))
    .digest("hex");
  return digest === reviewer.reportSha256;
});
const reviewAmendmentsValid = Array.isArray(ownership.reviewAmendments)
  && ownership.reviewAmendments.length === 1
  && ownership.reviewAmendments.every((amendment) => {
    if (amendment.auditId !== "aas-v1-tuning-gold-equivalence-1.0.1"
      || amendment.claimsReviewed !== 19
      || amendment.changedPairs !== 7
      || amendment.minimumIndependentReviewsPerChangedPair !== 2
      || !Array.isArray(amendment.reports)
      || amendment.reports.length !== 4) return false;
    const auditPath = path.join(root, amendment.audit);
    if (!fs.existsSync(auditPath)) return false;
    const auditDigest = crypto.createHash("sha256").update(fs.readFileSync(auditPath)).digest("hex");
    if (auditDigest !== amendment.auditSha256) return false;
    const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
    if (audit.auditId !== amendment.auditId || audit.scope?.changedPairCount !== amendment.changedPairs) return false;
    const identities = new Set();
    for (const reviewer of amendment.reports) {
      if (!reviewer.identity || reviewer.scorerImplementer !== false || reviewer.reviewedClaims < 1) return false;
      identities.add(reviewer.identity);
      const reportPath = path.join(root, reviewer.report);
      if (!fs.existsSync(reportPath)) return false;
      const bytes = fs.readFileSync(reportPath);
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      if (digest !== reviewer.reportSha256) return false;
      const report = JSON.parse(bytes.toString("utf8"));
      if (report.reviewer?.identity !== reviewer.identity
        || report.reviewer?.scorerImplementer !== false
        || report.decisions?.length !== reviewer.reviewedClaims) return false;
    }
    return identities.size === amendment.reports.length;
  });
requireForFreeze(
  ownership.status === "frozen"
    && reviewerIdentities.size >= 2
    && ownership.reviewers.some((reviewer) => reviewer.scorerImplementer === false)
    && reviewerReportsValid
    && reviewAmendmentsValid
    && ownership.repositorySettings.settingsVerified === true
    && ownership.verificationEnvironment.requiredReviewersVerified === true
    && ownership.verificationEnvironment.productPullRequestsMayModifyBaseline === false,
  "AAS_BASELINE_OWNERS_PENDING",
  "Named independent owners, report digests, or protected GitHub settings are pending.",
);

if (failures.length > 0) {
  console.error(JSON.stringify({ ok: false, mode, failures, pending }, null, 2));
  process.exit(1);
}

if (mode === "freeze-ready" && pending.length > 0) {
  console.error(JSON.stringify({ ok: false, mode, code: "AAS_BASELINE_NOT_FREEZE_READY", pending }, null, 2));
  process.exit(2);
}

console.log(JSON.stringify({ ok: true, mode, schemaCount: schemaFiles.length, heldOutDescriptors: heldOut.cases.length, hostileClasses: hostile.classes.length, legacyCases: legacy.cases.length, pendingCount: pending.length }, null, 2));
