import fs from "node:fs";
import { canonicalJson, digestJson } from "./canonical.mjs";
import { JOB_IDS, validateReceipt } from "./receipt.mjs";

function fail(code, detail = {}) { return { code, detail }; }

export function aggregateReceipts(receipts, validator) {
  const failures = [];
  if (receipts.length !== JOB_IDS.length) failures.push(fail("AAS_VERIFIER_MATRIX_RECEIPT_COUNT", { actual: receipts.length }));
  const byJob = new Map();
  for (const receipt of receipts) {
    for (const entry of validateReceipt(receipt, validator)) failures.push(fail(entry.code, entry));
    if (byJob.has(receipt.job?.id)) failures.push(fail("AAS_VERIFIER_MATRIX_DUPLICATE_JOB", { job: receipt.job?.id }));
    byJob.set(receipt.job?.id, receipt);
  }
  for (const job of JOB_IDS) if (!byJob.has(job)) failures.push(fail("AAS_VERIFIER_MATRIX_MISSING_JOB", { job }));

  for (const field of ["commit", "tarballSha256", "tarballSha512", "packManifestSha256"]) {
    if (new Set(receipts.map((entry) => entry.candidate?.[field])).size !== 1) failures.push(fail("AAS_VERIFIER_MATRIX_CANDIDATE_MISMATCH", { field }));
  }
  for (const field of ["commit", "rootDigest", "contractDigest"]) {
    if (new Set(receipts.map((entry) => entry.verifier?.[field])).size !== 1) failures.push(fail("AAS_VERIFIER_MATRIX_VERIFIER_MISMATCH", { field }));
  }
  if (receipts.some((entry) => entry.status !== "passed")) failures.push(fail("AAS_VERIFIER_MATRIX_JOB_FAILED"));

  const evidence = (id) => receipts.map((receipt) => receipt.suites?.find((suite) => suite.id === id)?.evidence);
  const propertyTotal = evidence("property").reduce((sum, value) => sum + (value?.total || 0), 0);
  const fuzzTotal = evidence("fuzz").reduce((sum, value) => sum + (value?.total || 0), 0);
  if (propertyTotal !== 100_000) failures.push(fail("AAS_VERIFIER_PROPERTY_BUDGET", { propertyTotal }));
  if (fuzzTotal !== 50_000) failures.push(fail("AAS_VERIFIER_FUZZ_BUDGET", { fuzzTotal }));
  if (evidence("property").some((value) => value?.hardPolicyViolations !== 0)) failures.push(fail("AAS_VERIFIER_HARD_POLICY_VIOLATION"));
  if (evidence("hostile").some((value) => value?.executions !== 64)) failures.push(fail("AAS_VERIFIER_HOSTILE_DENOMINATOR"));
  if (evidence("legacy").some((value) => value?.executions !== 41)) failures.push(fail("AAS_VERIFIER_LEGACY_DENOMINATOR"));

  const canonical = new Set(receipts.map((entry) => entry.canonicalPayload?.sha256));
  if (canonical.size !== 1) failures.push(fail("AAS_VERIFIER_CANONICAL_CROSS_MATRIX_MISMATCH"));

  const faultClasses = new Set(evidence("transaction").flatMap((value) => value?.faultBoundaryClasses || []));
  const raceClasses = new Set(evidence("transaction").flatMap((value) => value?.raceClasses || []));
  for (const value of ["lock", "journal", "backup", "write", "fsync", "rename", "commit"]) {
    if (!faultClasses.has(value)) failures.push(fail("AAS_VERIFIER_FAULT_CLASS_MISSING", { value }));
  }
  for (const value of ["concurrency", "drift", "symlink-swap", "target-swap", "corrupt-journal", "recovery-race"]) {
    if (!raceClasses.has(value)) failures.push(fail("AAS_VERIFIER_RACE_CLASS_MISSING", { value }));
  }

  const bundle = {
    schemaVersion: 1,
    status: failures.length ? "failed" : "passed",
    candidate: receipts[0]?.candidate || null,
    verifier: receipts[0]?.verifier || null,
    jobs: receipts.map((entry) => ({ id: entry.job?.id, receiptDigest: entry.receiptDigest, status: entry.status })).sort((a, b) => a.id.localeCompare(b.id)),
    denominators: { property: propertyTotal, fuzz: fuzzTotal, hostilePerJob: 64, legacyPerJob: 41 },
    canonicalPayloadSha256: receipts[0]?.canonicalPayload?.sha256 || null,
    failures,
  };
  return { ...bundle, bundleDigest: digestJson(bundle) };
}

export function writeBundle(file, bundle) {
  fs.writeFileSync(file, `${canonicalJson(bundle)}\n`, { mode: 0o600, flag: "wx" });
}

