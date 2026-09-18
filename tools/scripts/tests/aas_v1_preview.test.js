const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const aggregator = path.resolve(__dirname, "../../../verification/aas-preview/aggregate.mjs");
const jobs = ["linux-node-22", "windows-node-22"];
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
  const result = {
    schemaVersion: 1,
    assuranceProfile: "agent-first-preview-1",
    previewQualified: true,
    certifiedV1: false,
    jobId,
    runtime: { node: { "22": "v22.23.1" }[major], platform: { linux: "linux", windows: "win32" }[platform], architecture: "x64" },
    package: { name: "agentic-awesome-skills", version: "14.6.0", tarballIntegrity: "sha512-test", tarballSha256: "sha256-test" },
    selectionDigest: "sha256-selection",
    mcpContractDigest: "sha256-contract",
    lifecycle: { initialized: true, selected: true, composed: true, validated: true, planned: true, doctorReadOnly: true, installPreviewPrepared: true, runtimeAutoResolved: true },
    installation: { shell: platform === "windows" ? "powershell" : "posix", status: "passed", publicationResolution: "fixture", installer: "actual-packed-candidate", dryRunUnchanged: true, installedBytesMatch: true, repeatPreservesBytes: true, staleManagedSkillsRemoved: true, unmanagedFilePreserved: true, movedReleaseRejected: true, symlinkTargetRejected: true },
    writeGuards: { applyDisabledByDefault: true, recoveryDisabledByDefault: true, targetStateCreated: false },
    mcp: { localStdio: true, readOnlySnapshot: true, nativeAttemptObservation: "notEvaluated" },
    runtimeCache: { integrity: "sha512-test", closureDigest: "sha256-closure" },
    notEvaluated,
  };
  if (platform === "windows") {
    result.installation.windowsPowerShell51 = { ...result.installation, shellExecutable: "powershell.exe", shellVersion: "5.1.26100.1" };
    result.installation.shellExecutable = "pwsh";
    result.installation.shellVersion = "7.5.1";
  }
  return result;
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

test("preview receipt aggregation requires the supported packed smoke and a passing Workbench", (t) => {
  const item = fixture();
  t.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const result = run(item);
  assert.equal(result.status, 0, result.stderr);
  const aggregate = JSON.parse(fs.readFileSync(item.out, "utf8"));
  assert.equal(aggregate.previewQualified, true);
  assert.equal(aggregate.certifiedV1, false);
  assert.equal(aggregate.jobs.length, 2);
  assert.equal(aggregate.selectionDigest, "sha256-selection");
  assert.deepEqual(aggregate.notEvaluated, notEvaluated);
});

test("preview receipt aggregation rejects an unexpected job identity", (t) => {
  const item = fixture();
  t.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const changed = receipt(jobs[0]);
  changed.jobId = "macos-node-22";
  writeJson(item.receipts[0], changed);
  const result = run(item);
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(item.out), false);
});

test("preview aggregation refuses missing or failed actual installation evidence", (t) => {
  const item = fixture();
  t.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  for (const failure of ["missing", "installedBytesMatch", "unmanagedFilePreserved", "symlinkTargetRejected", "movedReleaseRejected"]) {
    const changed = receipt(jobs[0]);
    if (failure === "missing") delete changed.installation;
    else changed.installation[failure] = false;
    writeJson(item.receipts[0], changed);
    assert.notEqual(run(item).status, 0, failure);
    assert.equal(fs.existsSync(item.out), false);
  }
});


test("preview aggregation rejects a missing Windows receipt", (t) => {
  const item = fixture();
  t.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  item.receipts.pop();
  assert.notEqual(run(item).status, 0);
  assert.equal(fs.existsSync(item.out), false);
});


test("preview aggregation rejects Windows evidence from a POSIX shell", (t) => {
  const item = fixture();
  t.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  const changed = receipt("windows-node-22");
  changed.installation.shell = "posix";
  writeJson(item.receipts[1], changed);
  assert.notEqual(run(item).status, 0);
  assert.equal(fs.existsSync(item.out), false);
});


test("preview aggregation requires a passing actual Windows PowerShell 5.1 run", (t) => {
  const item = fixture();
  t.after(() => fs.rmSync(item.root, { recursive: true, force: true }));
  for (const failure of ["missing", "version", "installedBytesMatch", "unmanagedFilePreserved", "symlinkTargetRejected"]) {
    const changed = receipt("windows-node-22");
    if (failure === "missing") delete changed.installation.windowsPowerShell51;
    else if (failure === "version") changed.installation.windowsPowerShell51.shellVersion = "7.5.1";
    else changed.installation.windowsPowerShell51[failure] = false;
    writeJson(item.receipts[1], changed);
    assert.notEqual(run(item).status, 0, failure);
    assert.equal(fs.existsSync(item.out), false);
  }
});
