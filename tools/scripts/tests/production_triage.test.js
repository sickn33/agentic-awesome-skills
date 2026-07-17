#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { compareTriage, productionTriage } = require("../../local-skill-reviewer/triage");
const { artifactName } = require("../../local-skill-reviewer/safe-io");

const ROOT = path.resolve(__dirname, "../../..");
const sha256 = (relativePath) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, relativePath))).digest("hex");

const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/config/local-skill-review-operational-receipt.json"), "utf8"));
assert.deepStrictEqual(Object.keys(receipt).sort(), ["acceptedAgreement", "acceptedUse", "claims", "fullCatalogScan", "futureTesslUse", "historicalEvidence", "kind", "revealedLabelsMayBeRetuned", "schemaVersion"].sort());
assert.strictEqual(receipt.kind, "aas-local-skill-review-operational-receipt");
assert.strictEqual(receipt.acceptedAgreement.exact / receipt.acceptedAgreement.total, receipt.acceptedAgreement.rate);
assert.strictEqual(receipt.acceptedAgreement.rate, 0.745);
assert.strictEqual(receipt.acceptedAgreement.blind, false);
assert.strictEqual(receipt.acceptedAgreement.deterministicScannerAlone, false);
assert(Object.values(receipt.claims).every((claim) => claim === false));
assert.strictEqual(receipt.revealedLabelsMayBeRetuned, false);
assert.strictEqual(receipt.fullCatalogScan.completed, receipt.fullCatalogScan.trackedSkills);
assert.strictEqual(receipt.fullCatalogScan.failures, 0);
assert.strictEqual(receipt.fullCatalogScan.manualReviewRequired + receipt.fullCatalogScan.localPass, receipt.fullCatalogScan.completed);
assert.strictEqual(Object.values(receipt.fullCatalogScan.priorityCounts).reduce((sum, count) => sum + count, 0), receipt.fullCatalogScan.completed);
assert.match(receipt.fullCatalogScan.resultsSha256, /^[0-9a-f]{64}$/);
assert.strictEqual(receipt.historicalEvidence.validationAdjudicatedLevelsSha256, sha256("tools/config/local-skill-review-parity-validation-v2-adjudicated-levels.json"));
assert.strictEqual(receipt.historicalEvidence.guideV2Sha256, sha256("tools/config/local-skill-review-parity-codex-guide-v2.json"));
assert.strictEqual(receipt.historicalEvidence.blindPredictionsSha256, sha256("tools/config/local-skill-review-parity-final-blind-predictions-v2.json"));

function fixture({ score = 90, risk = "safe", descriptionConfidence = 0.8, contentConfidence = 0.8, extremeConfidence = 0.8, validationErrors = 0, referenceStatus = "passed", policy = "pass" } = {}) {
  const dimension = (level = 2, confidence = 0.8) => ({ score: level, confidence });
  return {
    skillId: "fixture",
    local_quality_score: score,
    risk,
    confidence: { description: descriptionConfidence, content: contentConfidence },
    components: { validation: { errorCount: validationErrors, checks: [{ name: "relative_links", status: referenceStatus }, { name: "referenced_paths_exist", status: "passed" }] } },
    judgments: {
      description: { dimensions: { specificity: dimension(3, extremeConfidence), trigger_term_quality: dimension(), completeness: dimension(), distinctiveness_conflict_risk: dimension() } },
      content: { dimensions: { conciseness: dimension(), actionability: dimension(), workflow_clarity: dimension(), progressive_disclosure: dimension() } },
    },
    aas_policy: { status: policy, findings: policy === "pass" ? [] : [{ code: "fixture" }] },
  };
}

let value = productionTriage(fixture());
assert.strictEqual(value.reviewStatus, "pass");
assert.strictEqual(value.priority, "P3");
assert.deepStrictEqual(value.reasonCodes, []);
assert.match(value.disclaimer, /not Tessl/);
assert.match(value.disclaimer, /does not predict Tessl passage/);

value = productionTriage(fixture({ score: 60 }));
assert.strictEqual(value.reviewStatus, "pass");
assert.strictEqual(value.priority, "P2", "middle-band clean results remain useful triage but are not quality approval");

for (const score of [47, 48, 49, 50, 51, 52, 53]) assert(productionTriage(fixture({ score })).reasonCodes.includes("threshold_proximity_50"), `score ${score}`);
assert(!productionTriage(fixture({ score: 54 })).reasonCodes.includes("threshold_proximity_50"));
for (const score of [72, 73, 74, 75, 76, 77, 78]) assert(productionTriage(fixture({ score })).reasonCodes.includes("threshold_proximity_75"), `score ${score}`);
assert(!productionTriage(fixture({ score: 79 })).reasonCodes.includes("threshold_proximity_75"));

value = productionTriage(fixture({ score: 46 }));
assert(value.reasonCodes.includes("low_quality_score"));
assert.strictEqual(value.priority, "P1");
value = productionTriage(fixture({ extremeConfidence: 0.54 }));
assert(value.reasonCodes.includes("low_confidence_extreme"));
assert(!productionTriage(fixture({ extremeConfidence: 0.55 })).reasonCodes.includes("low_confidence_extreme"));
value = productionTriage(fixture({ risk: "critical" }));
assert(value.reasonCodes.includes("high_risk_skill"));
assert.strictEqual(value.priority, "P1");
assert(productionTriage(fixture({ risk: "offensive" })).reasonCodes.includes("high_risk_skill"));
assert(productionTriage(fixture({ validationErrors: 1 })).reasonCodes.includes("validation_error"));
assert(productionTriage(fixture({ referenceStatus: "warning" })).reasonCodes.includes("broken_reference_warning"));
assert(productionTriage(fixture({ policy: "needs_review" })).reasonCodes.includes("deterministic_policy_findings"));

value = productionTriage(fixture(), { mergeGate: true });
assert.strictEqual(value.reviewStatus, "manual-review-required");
assert.strictEqual(value.priority, "P0");
assert(value.reasonCodes.includes("merge_blocking_candidate"));
assert.strictEqual(value.manualReview.exactHeadAttestationStillRequired, true);

const ordered = [
  { skillId: "z", local_quality_score: 80, triage: productionTriage(fixture(), { mergeGate: true }) },
  { skillId: "b", local_quality_score: 40, triage: productionTriage(fixture({ score: 40 })) },
  { skillId: "a", local_quality_score: 40, triage: productionTriage(fixture({ score: 40 })) },
  { skillId: "c", local_quality_score: 90, triage: productionTriage(fixture()) },
].sort(compareTriage);
assert.deepStrictEqual(ordered.map((item) => item.skillId), ["z", "a", "b", "c"]);

const resultRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aas-production-triage-"));
fs.chmodSync(resultRoot, 0o700);
try {
  const fakeBin = path.join(resultRoot, "fake-bin"); fs.mkdirSync(fakeBin, { mode: 0o700 });
  const sentinel = path.join(resultRoot, "external-command-called");
  for (const name of ["tessl", "codex", "curl"]) fs.writeFileSync(path.join(fakeBin, name), `#!/bin/sh\ntouch '${sentinel}'\nexit 99\n`, { mode: 0o700 });
  const env = { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` };
  const cli = path.join(ROOT, "tools/local-skill-reviewer/cli.js");
  for (const legacyCommand of ["calibration", "pilot", "interpret", "pilot-import", "pilot-verify", "proposal", "manifest"]) {
    const denied = spawnSync(process.execPath, [cli, legacyCommand, "--result-dir", resultRoot], { cwd: ROOT, env, encoding: "utf8" });
    assert.strictEqual(denied.status, 2, `${legacyCommand} must not be exposed by the production CLI`);
    assert.match(denied.stderr, /^Usage: local-skill-reviewer/);
  }
  const reviewed = JSON.parse(execFileSync(process.execPath, [cli, "review", "short", "--merge-gate", "--result-dir", resultRoot], { cwd: ROOT, env, encoding: "utf8" }));
  assert.strictEqual(reviewed.triage.reviewStatus, "manual-review-required");
  assert.strictEqual(reviewed.triage.priority, "P0");
  assert(!Object.hasOwn(reviewed, "tessl_compatible_score"));
  assert(Number.isInteger(reviewed.local_quality_score));
  const persistedMergeGate = JSON.parse(fs.readFileSync(path.join(resultRoot, "merge-gate-results", `${artifactName("short")}.json`), "utf8"));
  assert.strictEqual(persistedMergeGate.triage.reviewStatus, "manual-review-required");
  assert.strictEqual(persistedMergeGate.triage.priority, "P0");
  assert(persistedMergeGate.triage.reasonCodes.includes("merge_blocking_candidate"));
  assert(!fs.existsSync(sentinel));

  const scanRoot = path.join(resultRoot, "scan");
  const summary = JSON.parse(execFileSync(process.execPath, [cli, "scan", "--max-skills", "2", "--concurrency", "1", "--result-dir", scanRoot], { cwd: ROOT, env, encoding: "utf8" }));
  assert.strictEqual(summary.triage.manualReviewRequired + summary.triage.pass, 2);
  assert.strictEqual(Object.values(summary.triage.priorityDistribution).reduce((sum, count) => sum + count, 0), 2);
  const rows = fs.readFileSync(path.join(scanRoot, "scan-results.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.strictEqual(rows.length, 2);
  assert(rows.every((item) => item.triage && Number.isInteger(item.local_quality_score)));
  assert(!fs.existsSync(sentinel));
} finally { fs.rmSync(resultRoot, { recursive: true, force: true }); }

process.stdout.write("production triage thresholds, priorities, merge gate, report, and offline runtime tests passed\n");
