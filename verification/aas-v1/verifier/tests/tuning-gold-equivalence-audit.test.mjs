import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const validator = path.resolve(here, "..", "bin", "validate-tuning-gold-equivalence-audit.mjs");

test("tuning gold equivalence audit is complete, independently reviewed, and metric-bound", () => {
  const run = spawnSync(process.execPath, [validator], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.omissionCases, 17);
  assert.equal(report.claims, 19);
  assert.equal(report.changedPairs, 7);
  assert.equal(report.independentReviewers, 4);
  assert.equal(report.macroInclusionPrecisionBefore, 0.5638888888888889);
  assert.equal(report.macroInclusionPrecisionAfter, 0.7222222222222223);
  assert.deepEqual(report.postAuditGates, {
    hardPolicyViolations: true,
    inclusionPrecision: false,
    verifiedCoverage: false,
  });
});
