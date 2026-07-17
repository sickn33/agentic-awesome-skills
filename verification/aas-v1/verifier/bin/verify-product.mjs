#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { digestJson, sha256 } from "../lib/canonical.mjs";
import { snapshotZones } from "../lib/fs-evidence.mjs";
import { selfTestObserver } from "../lib/observer.mjs";
import { executableDigest, loadReceiptValidator, SUITE_IDS, writeCanonicalReceipt } from "../lib/receipt.mjs";
import { installCandidate, isolatedZones, systemIdentity } from "../lib/runtime.mjs";
import {
  packageSuite, prepareRuntimeCache, suite, verifyAdapters, verifyEntrypoints,
  verifyFuzz, verifyHostile, verifyLegacy, verifyMcp, verifyProperty,
} from "../lib/suites.mjs";
import { inspectPackageTarball } from "../lib/tarball.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const verifierRoot = path.resolve(here, "..");
const verificationRoot = path.resolve(verifierRoot, "..");
const baselineRoot = path.join(verificationRoot, "baseline", "v1");

function args(values) {
  const out = {};
  for (let i = 2; i < values.length; i += 2) {
    if (!values[i].startsWith("--") || values[i + 1] === undefined) throw new Error(`Invalid argument: ${values[i]}`);
    out[values[i].slice(2)] = values[i + 1];
  }
  return out;
}

function required(value, name, pattern = /./) {
  if (!value || !pattern.test(value)) throw new Error(`--${name} is required or invalid`);
  return value;
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function failedSuite(id, error) {
  const evidence = { code: error.code || "AAS_VERIFIER_INTERNAL", detailDigest: digestJson({ name: error.name, message: error.message }) };
  return { id, status: "failed", executions: 0, failures: 1, evidenceSha256: digestJson(evidence), evidence };
}

function transactionSuite(file, manifest, validator) {
  if (!file || !fs.existsSync(file)) throw Object.assign(new Error("OS-level transaction evidence is required"), { code: "AAS_VERIFIER_TRANSACTION_EVIDENCE_MISSING" });
  const value = readJson(file);
  if (!validator(value)) throw Object.assign(new Error("Transaction evidence schema failed"), { code: "AAS_VERIFIER_TRANSACTION_EVIDENCE_SCHEMA" });
  const fault = new Set(value.faultBoundaryClasses || []);
  const race = new Set(value.raceClasses || []);
  for (const item of manifest.faultBoundaryClasses) if (!fault.has(item)) throw Object.assign(new Error(`Fault boundary not covered: ${item}`), { code: "AAS_VERIFIER_FAULT_BOUNDARY_MISSING" });
  for (const item of manifest.raceClasses) if (!race.has(item)) throw Object.assign(new Error(`Race class not covered: ${item}`), { code: "AAS_VERIFIER_RACE_CLASS_MISSING" });
  if (value.testMode === true || value.mocked === true || value.productionBinary !== true) throw Object.assign(new Error("Transaction evidence is not production black-box evidence"), { code: "AAS_VERIFIER_TRANSACTION_NOT_BLACK_BOX" });
  if (value.partialStates !== 0 || value.unmanagedMutations !== 0 || value.hardPolicyViolations !== 0) throw Object.assign(new Error("Transaction safety invariant failed"), { code: "AAS_VERIFIER_TRANSACTION_INVARIANT" });
  return suite("transaction", value, value.executions || 0);
}

const options = args(process.argv);
const tarball = path.resolve(required(options.tarball, "tarball"));
const candidateCommit = required(options["candidate-commit"], "candidate-commit", /^[a-f0-9]{40}$/);
const verifierCommit = required(options["verifier-commit"], "verifier-commit", /^[a-f0-9]{40}$/);
const jobId = required(options["job-id"], "job-id");
const output = path.resolve(required(options.out, "out"));
const workRoot = path.resolve(required(options["work-root"], "work-root"));
const runtimeMatrix = readJson(path.join(baselineRoot, "runtime-matrix.json"));
const job = runtimeMatrix.jobs.find((entry) => entry.id === jobId);
if (!job) throw new Error(`Unknown job: ${jobId}`);
if (process.platform !== job.os.replace("macos", "darwin").replace("windows", "win32")) throw new Error(`Job/platform mismatch: ${jobId}/${process.platform}`);
if (process.arch !== job.architecture || process.version !== `v${job.nodePatch}`) throw new Error(`Frozen runtime identity mismatch: ${process.arch}/${process.version}`);

fs.mkdirSync(workRoot, { recursive: true, mode: 0o700 });
const evidenceDir = path.join(workRoot, "observer-evidence");
const zones = isolatedZones(path.join(workRoot, "zones"));
const zoneBefore = snapshotZones(zones);
const manifest = readJson(path.join(baselineRoot, "verifier-manifest.json"));
const freeze = readJson(path.join(baselineRoot, "freeze-manifest.json"));
const budgets = readJson(path.join(baselineRoot, "budgets.json"));
const hostileManifest = readJson(path.join(baselineRoot, "hostile", "manifest.json"));
const transactionValidator = loadReceiptValidator(path.join(verificationRoot, "schemas", "product-transaction-evidence.schema.json"));
const inspection = inspectPackageTarball(tarball);
const runtime = await installCandidate(tarball, path.join(workRoot, "candidate-install"));
const tarballBytes = fs.readFileSync(tarball);
const observer = await selfTestObserver({ cwd: zones.tmp, env: process.env, zones, evidenceDir });
const runtimePromotion = await prepareRuntimeCache(runtime, tarballBytes, inspection.sha512, zones.cache);

const suites = [];
const failures = [];
const run = async (id, action) => {
  try { suites.push(await action()); }
  catch (error) {
    suites.push(failedSuite(id, error));
    failures.push({ code: /^AAS_VERIFIER_/.test(error.code || "") ? error.code : "AAS_VERIFIER_INTERNAL", suite: id, detailDigest: digestJson({ name: error.name, message: error.message }) });
  }
};
await run("package", () => packageSuite(inspection, runtime));
await run("entrypoints", () => verifyEntrypoints(runtime, zones));
await run("mcp", () => verifyMcp(runtime, zones, evidenceDir));
await run("property", () => verifyProperty(runtime, budgets, runtimeMatrix.jobs.indexOf(job), verifierRoot));
await run("fuzz", () => verifyFuzz(runtime, budgets, runtimeMatrix.jobs.indexOf(job), verifierRoot));
await run("hostile", () => verifyHostile(runtime, zones, evidenceDir, hostileManifest, path.join(baselineRoot, "hostile"), verifierRoot));
await run("legacy", () => verifyLegacy(runtime, zones, verifierRoot, path.join(baselineRoot, "legacy", "14.6.0")));
await run("transaction", () => transactionSuite(options["transaction-evidence"], manifest, transactionValidator));
await run("adapters", () => verifyAdapters(runtime, zones, path.join(baselineRoot, "host-adapters"), inspection.sha512, runtimePromotion.identity.closureDigest));
for (const id of SUITE_IDS) if (!suites.some((entry) => entry.id === id)) suites.push(failedSuite(id, Object.assign(new Error("Suite did not execute"), { code: "AAS_VERIFIER_SUITE_MISSING" })));

const mcp = suites.find((entry) => entry.id === "mcp");
const canonicalSha = mcp?.evidence?.canonicalResponseDigest || digestJson(null);
const { jobId: _jobId, ...identity } = systemIdentity(job);
const mcpBefore = mcp?.evidence?.before || Object.fromEntries(Object.keys(zones).map((name) => [name, zoneBefore[name].digest]));
const mcpAfter = mcp?.evidence?.after || mcpBefore;
const receipt = {
  schemaVersion: 1,
  receiptVersion: "1.0.0",
  status: failures.length ? "failed" : "passed",
  job: { id: job.id, workflowRunId: process.env.GITHUB_RUN_ID || "1", workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT || "1" },
  candidate: {
    commit: candidateCommit, package: runtime.manifest.name, version: runtime.manifest.version,
    tarballBytes: inspection.bytes, tarballSha256: inspection.sha256, tarballSha512: inspection.sha512,
    packManifestSha256: digestJson(inspection.entries), installTreeSha256: runtime.treeDigest,
  },
  verifier: { version: "1.0.0", commit: verifierCommit, rootDigest: freeze.rootDigest, contractDigest: digestJson(manifest), owner: "aas-v1-independent-verifier" },
  environment: { ...identity, nodeExecutableSha256: executableDigest() },
  observer: { contractVersion: observer.contractVersion, backend: observer.backend, selfTestDigest: observer.selfTestDigest, networkSentinels: observer.observedNetworkSentinels, writeSentinels: observer.observedWriteSentinels, overflow: false, ambiguousLineage: false },
  zones: Object.fromEntries(Object.keys(zones).map((name) => [name, { beforeSha256: mcpBefore[name], afterSha256: mcpAfter[name], persistentWriteCount: 0 }])),
  suites: suites.sort((a, b) => SUITE_IDS.indexOf(a.id) - SUITE_IDS.indexOf(b.id)),
  canonicalPayload: { sha256: canonicalSha, excludedFields: ["timestamp", "correlationId", "localizedMessage", "diagnostics"], sampleCount: 60 },
  failures,
};
writeCanonicalReceipt(output, receipt);
process.stdout.write(`${JSON.stringify({ ok: failures.length === 0, output, failures })}\n`);
if (failures.length) process.exit(1);
