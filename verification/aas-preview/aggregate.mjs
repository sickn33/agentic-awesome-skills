#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const EXPECTED_JOBS = Object.freeze([
  "linux-node-22",
  "linux-node-24",
  "macos-node-22",
  "macos-node-24",
  "windows-node-22",
  "windows-node-24",
]);
const EXPECTED_NODE = Object.freeze({ "22": "v22.23.1", "24": "v24.18.0" });
const EXPECTED_NOT_EVALUATED = Object.freeze([
  "native-network-and-filesystem-attempt-observation",
  "transactional-crash-and-race-certification",
  "benchmark-80-90-100",
  "real-host-configuration-writes",
  "public-release",
]);

function fail(code) {
  throw new Error(`AAS_PREVIEW_AGGREGATE_${code}`);
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return `sha256-${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function parseArgs(argv) {
  const receipts = [];
  let workbench;
  let out;
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) fail("ARGUMENTS_INVALID");
    if (!path.isAbsolute(value)) fail("ABSOLUTE_PATH_REQUIRED");
    if (flag === "--receipt") receipts.push(value);
    else if (flag === "--workbench" && !workbench) workbench = value;
    else if (flag === "--out" && !out) out = value;
    else fail("ARGUMENT_UNKNOWN_OR_DUPLICATE");
  }
  if (receipts.length !== EXPECTED_JOBS.length || !workbench || !out) fail("ARGUMENT_REQUIRED");
  return { receipts, workbench, out };
}

function readJson(file) {
  const bytes = fs.readFileSync(file, "utf8");
  const value = JSON.parse(bytes);
  assert.equal(bytes, `${stable(value)}\n`, `${file} is not canonical JSON`);
  return value;
}

function validateReceipt(receipt) {
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.assuranceProfile, "agent-first-preview-1");
  assert.equal(receipt.previewQualified, true);
  assert.equal(receipt.certifiedV1, false);
  assert.deepEqual(receipt.notEvaluated, EXPECTED_NOT_EVALUATED);
  assert.equal(receipt.lifecycle.initialized, true);
  assert.equal(receipt.lifecycle.recommended, true);
  assert.equal(receipt.lifecycle.validated, true);
  assert.equal(receipt.lifecycle.planned, true);
  assert.equal(receipt.lifecycle.doctorReadOnly, true);
  assert.equal(receipt.writeGuards.applyDisabledByDefault, true);
  assert.equal(receipt.writeGuards.recoveryDisabledByDefault, true);
  assert.equal(receipt.writeGuards.targetStateCreated, false);
  assert.equal(receipt.mcp.localStdio, true);
  assert.equal(receipt.mcp.readOnlySnapshot, true);
  assert.equal(receipt.mcp.nativeAttemptObservation, "notEvaluated");
  const [platform, , major] = receipt.jobId.split("-");
  const expectedPlatform = { linux: "linux", macos: "darwin", windows: "win32" }[platform];
  assert.equal(receipt.runtime.platform, expectedPlatform);
  assert.equal(receipt.runtime.node, EXPECTED_NODE[major]);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const receipts = args.receipts.map(readJson);
  for (const receipt of receipts) validateReceipt(receipt);
  assert.deepEqual(receipts.map((receipt) => receipt.jobId).sort(), [...EXPECTED_JOBS]);

  const sharedFields = ["package", "recommendationDigest", "mcpContractDigest", "runtimeCache", "notEvaluated"];
  for (const field of sharedFields) {
    const expected = stable(receipts[0][field]);
    for (const receipt of receipts.slice(1)) assert.equal(stable(receipt[field]), expected, `${field} drifted across jobs`);
  }

  const workbench = readJson(args.workbench);
  assert.deepEqual(workbench, {
    schemaVersion: 1,
    assuranceProfile: "agent-first-preview-1",
    appTests: "passed",
    productionBuild: "passed",
    liveDeployment: "notEvaluated",
  });

  const bundle = {
    schemaVersion: 1,
    assuranceProfile: "agent-first-preview-1",
    previewQualified: true,
    certifiedV1: false,
    package: receipts[0].package,
    jobs: receipts.map((receipt) => ({
      jobId: receipt.jobId,
      node: receipt.runtime.node,
      platform: receipt.runtime.platform,
      architecture: receipt.runtime.architecture,
      receiptDigest: sha256(stable(receipt)),
    })).sort((left, right) => (left.jobId < right.jobId ? -1 : left.jobId > right.jobId ? 1 : 0)),
    recommendationDigest: receipts[0].recommendationDigest,
    mcpContractDigest: receipts[0].mcpContractDigest,
    workbench,
    notEvaluated: EXPECTED_NOT_EVALUATED,
  };
  fs.mkdirSync(path.dirname(args.out), { recursive: true, mode: 0o700 });
  fs.writeFileSync(args.out, `${stable(bundle)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${stable(bundle)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error?.message || "AAS_PREVIEW_AGGREGATE_FAILED"}\n`);
  process.exitCode = 1;
}
