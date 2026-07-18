#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_SRI,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  canonicalize,
  normalizeText,
  parseTrace,
  runtimeReceipt,
  sha256,
  sri512,
  treeDigest,
  treeEntries,
  writeJson,
} from "./corpus-lib.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const fixtureRoot = path.join(root, "fixture-repository");
const work = path.join(root, "_work");
const runtimeRoot = path.join(work, "runtime");
const installer = path.join(runtimeRoot, "node_modules", PACKAGE_NAME, "tools", "bin", "install.js");
const tarball = path.join(root, "artifacts", `${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz`);
const snapshotsRoot = path.join(root, "snapshots");
const fakeBin = path.join(root, "bin");
const networkObserver = path.join(root, "network-observer.cjs");
const CASE_CONTRACT_DIGEST = "sha256-6e2ffbc49002d1a418886571d6991b5251f409a2da0105aea8498a251694f5cd";

const caseContract = manifest.cases.map(({ id, args, fixtureState, expectedExitCode }) => ({ id, args, fixtureState, expectedExitCode }));
if (sha256(Buffer.from(JSON.stringify(caseContract))) !== CASE_CONTRACT_DIGEST
  || manifest.cases.length !== 41
  || manifest.cases.some((entry) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id))) {
  throw new Error("Legacy case contract changed; refusing any filesystem mutation");
}

if (!fs.existsSync(installer)) throw new Error("Baseline runtime is missing; run acquire-baseline.mjs first");
if (!fs.existsSync(tarball) || sri512(fs.readFileSync(tarball)) !== EXPECTED_SRI) throw new Error("Frozen registry tarball is missing or failed SRI verification");
const acquisitionMetadata = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "registry-metadata.json"), "utf8"));
if (!acquisitionMetadata.runtimeReceipt
  || JSON.stringify(canonicalize(runtimeReceipt(runtimeRoot))) !== JSON.stringify(canonicalize(acquisitionMetadata.runtimeReceipt))) {
  throw new Error("Baseline runtime bytes or dependency closure differ from the frozen acquisition receipt");
}

const networkSelfTestTrace = path.join(work, "network-observer-self-test.jsonl");
fs.rmSync(networkSelfTestTrace, { force: true });
const networkSelfTest = spawnSync(process.execPath, ["-e", "require('node:net').connect({host:'127.0.0.1',port:9})"], {
  encoding: "utf8",
  env: {
    PATH: process.env.PATH || "",
    AAS_NETWORK_TRACE: networkSelfTestTrace,
    NODE_OPTIONS: `--require=${networkObserver}`,
  },
});
const selfTestAttempts = parseTrace(networkSelfTestTrace);
fs.rmSync(networkSelfTestTrace, { force: true });
if (networkSelfTest.status === 0
  || selfTestAttempts.length !== 1
  || selfTestAttempts[0]?.api !== "net.connect") {
  throw new Error("Network observer self-test did not deny and record the sentinel attempt");
}
const networkObserverReceipt = {
  contractVersion: "1.0.0",
  implementationSha256: sha256(fs.readFileSync(networkObserver)),
  selfTestDigest: sha256(Buffer.from(JSON.stringify(canonicalize(selfTestAttempts)))),
  status: "passed",
};

const fixtureEntries = treeEntries(fixtureRoot);
const fixtureDigest = treeDigest(fixtureEntries);
const aggregateTraces = [];
const snapshotIndex = [];
const snapshotsStage = path.join(work, "snapshots-stage");
const snapshotsBackup = path.join(work, "snapshots-backup");
fs.rmSync(snapshotsStage, { recursive: true, force: true });
fs.rmSync(snapshotsBackup, { recursive: true, force: true });
fs.mkdirSync(snapshotsStage, { recursive: true, mode: 0o700 });
fs.mkdirSync(path.join(work, "cases"), { recursive: true, mode: 0o700 });

function writeFixtureFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { encoding: "utf8", mode: 0o600 });
}

function managedState(target) {
  writeFixtureFile(path.join(target, "frontend-design", "SKILL.md"), "legacy managed bytes\n");
  writeFixtureFile(path.join(target, "removed-managed", "SKILL.md"), "stale managed bytes\n");
  writeFixtureFile(path.join(target, "unmanaged-sentinel", "KEEP.txt"), "unmanaged sentinel\n");
  writeFixtureFile(path.join(target, ".antigravity-install-manifest.json"), JSON.stringify({
    schemaVersion: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    entries: ["frontend-design", "removed-managed"],
  }, null, 2) + "\n");
}

function setupCase(caseData, caseRoot) {
  const casesRoot = path.resolve(work, "cases");
  const resolvedCaseRoot = path.resolve(caseRoot);
  const caseRelative = path.relative(casesRoot, resolvedCaseRoot);
  if (!caseRelative || caseRelative.startsWith("..") || path.isAbsolute(caseRelative) || caseRelative.includes(path.sep)) {
    throw new Error(`${caseData.id}: case root escapes the controlled cases directory`);
  }
  fs.rmSync(caseRoot, { recursive: true, force: true });
  const home = path.join(caseRoot, "home");
  const tmp = path.join(caseRoot, "tmp");
  const cwd = path.join(caseRoot, "workspace");
  const targets = path.join(caseRoot, "targets");
  const harness = path.join(caseRoot, "harness");
  const outside = path.join(caseRoot, "outside");
  for (const directory of [home, tmp, cwd, targets, harness, outside]) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const absoluteTarget = path.join(targets, "absolute");
  const missingTarget = path.join(targets, "missing");
  const symlinkTarget = path.join(targets, "symlink");
  const codexHome = path.join(caseRoot, "codex-home");

  if (["stale-managed-with-unmanaged-sentinel", "existing-managed-and-unmanaged"].includes(caseData.fixtureState)) {
    managedState(absoluteTarget);
  }
  if (caseData.fixtureState === "symlink-target") {
    const outsideTarget = path.join(outside, "target");
    fs.mkdirSync(outsideTarget, { recursive: true });
    fs.symlinkSync(outsideTarget, symlinkTarget, process.platform === "win32" ? "junction" : "dir");
  }

  const replacements = [
    [caseRoot, "<CASE_ROOT>"],
    [runtimeRoot, "<BASELINE_RUNTIME>"],
    [root, "<CORPUS_ROOT>"],
  ];
  const args = caseData.args.map((arg) => arg
    .replace("{{ABSOLUTE_TARGET}}", absoluteTarget)
    .replace("{{MISSING_TARGET}}", missingTarget)
    .replace("{{SYMLINK_TARGET}}", symlinkTarget));
  const pathOption = args.indexOf("--path");
  if (pathOption >= 0 && typeof args[pathOption + 1] === "string") {
    const requestedTarget = path.resolve(cwd, args[pathOption + 1]);
    const targetRelative = path.relative(resolvedCaseRoot, requestedTarget);
    if (targetRelative.startsWith("..") || path.isAbsolute(targetRelative)) {
      throw new Error(`${caseData.id}: target escapes the controlled case root`);
    }
  }
  const trace = path.join(harness, "fake-git.jsonl");
  const networkTrace = path.join(harness, "network.jsonl");
  const inheritedEnvironment = {};
  for (const key of ["PATH", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT"]) {
    if (process.env[key]) inheritedEnvironment[key] = process.env[key];
  }
  const env = {
    ...inheritedEnvironment,
    HOME: home,
    USERPROFILE: home,
    TMPDIR: tmp,
    TMP: tmp,
    TEMP: tmp,
    PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`,
    PATHEXT: process.platform === "win32" ? `.CMD;.EXE;.BAT;${process.env.PATHEXT || ""}` : process.env.PATHEXT,
    AAS_LEGACY_FIXTURE_REPO: fixtureRoot,
    AAS_LEGACY_FIXTURE_DIGEST: fixtureDigest,
    AAS_FAKE_GIT_TRACE: trace,
    AAS_FAKE_GIT_ALLOWED_ROOT: tmp,
    AAS_NETWORK_TRACE: networkTrace,
    NODE_OPTIONS: `--require=${networkObserver}`,
    NO_COLOR: "1",
  };
  if (caseData.fixtureState === "codex-home-override") env.CODEX_HOME = codexHome;
  else delete env.CODEX_HOME;
  return { args, cwd, env, trace, networkTrace, harness, replacements };
}

function normalizedTree(caseRoot, replacements) {
  return treeEntries(caseRoot, { exclude: new Set(["harness"]) }).map((entry) => {
    if (entry.type !== "symlink") return entry;
    return { ...entry, target: normalizeText(entry.target, replacements) };
  });
}

function normalizedOutput(text, replacements) {
  const normalized = normalizeText(text, replacements);
  if (replacements.some(([absolute]) => normalized.includes(absolute))) {
    throw new Error("A controlled absolute path survived normalization");
  }
  return normalized;
}

for (const caseData of manifest.cases) {
  const caseRoot = path.join(work, "cases", caseData.id);
  const setup = setupCase(caseData, caseRoot);
  const before = normalizedTree(caseRoot, setup.replacements);
  const result = spawnSync(process.execPath, [installer, ...setup.args], {
    cwd: setup.cwd,
    env: setup.env,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  const observedExitCode = result.status ?? 128;
  if (observedExitCode !== caseData.expectedExitCode) {
    throw new Error(`${caseData.id}: expected exit ${caseData.expectedExitCode}, observed ${observedExitCode}\n${result.stderr || ""}`);
  }
  const trace = parseTrace(setup.trace);
  const networkAttempts = parseTrace(setup.networkTrace);
  if (networkAttempts.length !== 0) throw new Error(`${caseData.id}: observed a forbidden network attempt`);
  const harnessFiles = fs.readdirSync(setup.harness).sort();
  const allowedHarnessFiles = new Set(["fake-git.jsonl", "network.jsonl"]);
  if (harnessFiles.some((name) => !allowedHarnessFiles.has(name))) throw new Error(`${caseData.id}: unexpected harness evidence sibling`);
  const after = normalizedTree(caseRoot, setup.replacements);
  const normalizedArgs = setup.args.map((arg) => normalizeText(arg, setup.replacements));
  const normalizedTrace = trace.map((entry) => canonicalize(entry));
  const traceDigest = sha256(Buffer.from(JSON.stringify(normalizedTrace)));
  const snapshot = {
    schemaVersion: 1,
    caseId: caseData.id,
    fixtureState: caseData.fixtureState,
    invocation: {
      executable: `<BASELINE_RUNTIME>/node_modules/${PACKAGE_NAME}/tools/bin/install.js`,
      args: normalizedArgs,
      cwd: "<CASE_ROOT>/workspace",
    },
    packageIdentity: { package: PACKAGE_NAME, version: PACKAGE_VERSION, distIntegrity: EXPECTED_SRI },
    expectedExitCode: caseData.expectedExitCode,
    observedExitCode,
    signal: result.signal,
    stdout: normalizedOutput(result.stdout || "", setup.replacements),
    stderr: normalizedOutput(result.stderr || "", setup.replacements),
    fakeGitTrace: normalizedTrace,
    fakeGitTraceDigest: traceDigest,
    evidence: {
      harnessFiles,
      networkAttempts,
      networkAttemptDigest: sha256(Buffer.from(JSON.stringify(canonicalize(networkAttempts)))),
    },
    preTreeDigest: treeDigest(before),
    preFilesystem: before,
    treeDigest: treeDigest(after),
    filesystem: after,
    invariants: {
      fixtureDigest,
      noStackStateCreated: !after.some((entry) => /(^|\/)aas-stack\.json$/.test(entry.path)),
      harnessEvidenceExcluded: !after.some((entry) => entry.path.startsWith("harness")),
    },
  };
  const relativeSnapshot = `snapshots/${caseData.id}.json`;
  const snapshotPath = path.join(snapshotsStage, `${caseData.id}.json`);
  writeJson(snapshotPath, snapshot);
  const snapshotSha256 = sha256(fs.readFileSync(snapshotPath));
  caseData.expectedSnapshot = relativeSnapshot;
  caseData.expectedSnapshotSha256 = snapshotSha256;
  snapshotIndex.push({ caseId: caseData.id, path: relativeSnapshot, sha256: snapshotSha256, treeDigest: snapshot.treeDigest, fakeGitTraceDigest: traceDigest });
  aggregateTraces.push({ caseId: caseData.id, trace: normalizedTrace });
}

manifest.corpusVersion = "1.0.0";
manifest.status = "frozen";
manifest.fixtureRepository = {
  ...manifest.fixtureRepository,
  treeDigest: fixtureDigest,
  fakeGitTraceDigest: sha256(Buffer.from(JSON.stringify(canonicalize(aggregateTraces)))),
  status: "frozen",
};
manifest.snapshotIndex = "snapshot-index.json";
manifest.normalization = {
  version: "1.0.0",
  lineEndings: "CRLF and CR are normalized to LF for stdout and stderr",
  ephemeralRoots: ["<CASE_ROOT>", "<BASELINE_RUNTIME>", "<CORPUS_ROOT>"],
  manifestTimestamp: "Only .antigravity-install-manifest.json updatedAt is replaced with <TIMESTAMP> before tree hashing",
  excludedEvidencePath: "harness/",
  fileModes: "Intentionally omitted because the legacy contract compares portable path, type and normalized bytes across NTFS and POSIX filesystems",
};
manifest.observation = { network: networkObserverReceipt };
const nextIndex = {
  schemaVersion: 1,
  status: "frozen",
  caseCount: snapshotIndex.length,
  fixtureTreeDigest: fixtureDigest,
  aggregateFakeGitTraceDigest: manifest.fixtureRepository.fakeGitTraceDigest,
  snapshots: snapshotIndex,
};

const differencesPath = path.join(root, "allowed-differences.json");
const differences = JSON.parse(fs.readFileSync(differencesPath, "utf8"));
differences.status = "frozen";
let movedPreviousSnapshots = false;
try {
  if (fs.existsSync(snapshotsRoot)) {
    fs.renameSync(snapshotsRoot, snapshotsBackup);
    movedPreviousSnapshots = true;
  }
  fs.renameSync(snapshotsStage, snapshotsRoot);
  writeJson(manifestPath, manifest);
  writeJson(path.join(root, "snapshot-index.json"), nextIndex);
  writeJson(differencesPath, differences);
  fs.rmSync(snapshotsBackup, { recursive: true, force: true });
} catch (error) {
  fs.rmSync(snapshotsRoot, { recursive: true, force: true });
  if (movedPreviousSnapshots && fs.existsSync(snapshotsBackup)) fs.renameSync(snapshotsBackup, snapshotsRoot);
  throw error;
}
process.stdout.write(`${JSON.stringify({ ok: true, cases: snapshotIndex.length, fixtureDigest, aggregateFakeGitTraceDigest: manifest.fixtureRepository.fakeGitTraceDigest })}${os.EOL}`);
