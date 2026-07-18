const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const aggregator = path.resolve(__dirname, "../../../verification/aas-preview/aggregate.mjs");
const jobs = ["linux-node-22", "linux-node-24", "macos-node-22", "macos-node-24", "windows-node-22", "windows-node-24"];
const notEvaluated = [
  "native-network-and-filesystem-attempt-observation",
  "transactional-crash-and-race-certification",
  "benchmark-80-90-100",
  "real-host-configuration-writes",
  "public-release",
];

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${stable(value)}\n`);
}

function receipt(jobId) {
  const [platform, , major] = jobId.split("-");
  return {
    schemaVersion: 1,
    assuranceProfile: "agent-first-preview-1",
    previewQualified: true,
    certifiedV1: false,
    jobId,
    runtime: { node: { "22": "v22.23.1", "24": "v24.18.0" }[major], platform: { linux: "linux", macos: "darwin", windows: "win32" }[platform], architecture: "x64" },
    package: { name: "agentic-awesome-skills", version: "14.6.0", tarballIntegrity: "sha512-test", tarballSha256: "sha256-test" },
    recommendationDigest: "sha256-recommendation",
    mcpContractDigest: "sha256-contract",
    lifecycle: { initialized: true, recommended: true, validated: true, planned: true, doctorReadOnly: true },
    writeGuards: { applyDisabledByDefault: true, recoveryDisabledByDefault: true, targetStateCreated: false },
    mcp: { localStdio: true, readOnlySnapshot: true, nativeAttemptObservation: "notEvaluated" },
    runtimeCache: { integrity: "sha512-test", closureDigest: "sha256-closure" },
    notEvaluated,
  };
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-preview-aggregate-"));
  const receipts = jobs.map((jobId) => {
    const file = path.join(root, `${jobId}.json`);
    writeJson(file, receipt(jobId));
    return file;
  });
  const workbench = path.join(root, "workbench.json");
  writeJson(workbench, {
    schemaVersion: 1,
    assuranceProfile: "agent-first-preview-1",
    appTests: "passed",
    productionBuild: "passed",
    liveDeployment: "notEvaluated",
  });
  return { root, receipts, workbench, out: path.join(root, "aggregate.json") };
}

function run(item) {
  return spawnSync(process.execPath, [
    aggregator,
    ...item.receipts.flatMap((file) => ["--receipt", file]),
    "--workbench", item.workbench,
    "--out", item.out,
  ], { encoding: "utf8" });
}

test("preview receipt aggregation requires six consistent functional jobs and a passing Workbench", (t) => {
  const item = fixture();
  t.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const result = run(item);
  assert.equal(result.status, 0, result.stderr);
  const aggregate = JSON.parse(fs.readFileSync(item.out, "utf8"));
  assert.equal(aggregate.previewQualified, true);
  assert.equal(aggregate.certifiedV1, false);
  assert.equal(aggregate.jobs.length, 6);
  assert.deepEqual(aggregate.notEvaluated, notEvaluated);
});

test("preview receipt aggregation fails closed on cross-platform evidence drift", (t) => {
  const item = fixture();
  t.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const changed = receipt(jobs[0]);
  changed.recommendationDigest = "sha256-drift";
  writeJson(item.receipts[0], changed);
  const result = run(item);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(item.out), false);
});
