import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { aggregateReceipts } from "../lib/aggregate.mjs";
import { digestJson } from "../lib/canonical.mjs";
import { finalizeReceipt, JOB_IDS, loadReceiptValidator, SUITE_IDS } from "../lib/receipt.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const validator = loadReceiptValidator(path.resolve(here, "..", "..", "schemas", "product-verifier-receipt.schema.json"));
const d = `sha256-${"a".repeat(64)}`;
const sri = `sha512-${Buffer.alloc(64).toString("base64")}`;

function receipt(job, index) {
  const totals = { property: index < 4 ? 16667 : 16666, fuzz: index < 2 ? 8334 : 8333 };
  const suites = SUITE_IDS.map((id) => {
    const evidence = id === "property" ? { total: totals.property, hardPolicyViolations: 0 }
      : id === "fuzz" ? { total: totals.fuzz }
        : id === "hostile" ? { executions: 64 }
          : id === "legacy" ? { executions: 41 }
            : id === "transaction" ? { faultBoundaryClasses: ["lock", "journal", "backup", "write", "fsync", "rename", "commit"], raceClasses: ["concurrency", "drift", "symlink-swap", "target-swap", "corrupt-journal", "recovery-race"] }
              : {};
    return { id, status: "passed", executions: evidence.total || evidence.executions || 1, failures: 0, evidenceSha256: digestJson(evidence), evidence };
  });
  return finalizeReceipt({ schemaVersion: 1, receiptVersion: "1.0.0", status: "passed",
    job: { id: job, workflowRunId: "1", workflowRunAttempt: "1" },
    candidate: { commit: "1".repeat(40), package: "agentic-awesome-skills", version: "14.6.0", tarballBytes: 1, tarballSha256: d, tarballSha512: sri, packManifestSha256: d, installTreeSha256: d },
    verifier: { version: "1.0.0", commit: "2".repeat(40), rootDigest: d, contractDigest: d, owner: "aas-v1-independent-verifier" },
    environment: { platform: job.startsWith("linux") ? "linux" : job.startsWith("macos") ? "darwin" : "win32", osVersion: "test", kernelVersion: "test", architecture: "x64", nodeVersion: job.endsWith("22") ? "v22.23.1" : "v24.18.0", nodeExecutableSha256: d, runnerImageLabel: "test", runnerImageVersion: "test", filesystemType: job.startsWith("linux") ? "ext4" : job.startsWith("macos") ? "apfs" : "ntfs", filesystemCaseSensitivity: job.startsWith("linux") ? "sensitive" : "insensitive-preserving" },
    observer: { contractVersion: "1.0.0", backend: job.startsWith("linux") ? "linux-strace-process-tree" : job.startsWith("macos") ? "macos-fs_usage-process" : "windows-etw-kernel-process-tree", selfTestDigest: d, networkSentinels: 1, writeSentinels: 1, overflow: false, ambiguousLineage: false },
    zones: Object.fromEntries(["home", "project", "cache", "tmp"].map((name) => [name, { beforeSha256: d, afterSha256: d, persistentWriteCount: 0 }])),
    suites, canonicalPayload: { sha256: d, excludedFields: ["timestamp", "correlationId", "localizedMessage", "diagnostics"], sampleCount: 60 }, failures: [] });
}

test("aggregator accepts only the exact complete matrix", () => {
  const receipts = JOB_IDS.map(receipt);
  assert.equal(aggregateReceipts(receipts, validator).status, "passed");
  const missing = aggregateReceipts(receipts.slice(1), validator);
  assert.equal(missing.status, "failed");
  assert.ok(missing.failures.some((entry) => entry.code === "AAS_VERIFIER_MATRIX_MISSING_JOB"));
});

test("aggregator catches receipt tampering and duplicates", () => {
  const receipts = JOB_IDS.map(receipt);
  receipts[0].candidate.tarballBytes = 2;
  const result = aggregateReceipts([...receipts.slice(0, 5), receipts[0]], validator);
  assert.equal(result.status, "failed");
  assert.ok(result.failures.some((entry) => entry.code === "AAS_VERIFIER_RECEIPT_DIGEST"));
  assert.ok(result.failures.some((entry) => entry.code === "AAS_VERIFIER_MATRIX_DUPLICATE_JOB"));
});
