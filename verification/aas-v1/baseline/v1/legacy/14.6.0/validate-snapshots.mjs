#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_SHASUM,
  EXPECTED_SRI,
  PACKAGE_NAME,
  PACKAGE_VERSION,
  canonicalize,
  sha256,
  sri512,
  treeDigest,
  treeEntries,
} from "./corpus-lib.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const index = JSON.parse(fs.readFileSync(path.join(root, manifest.snapshotIndex), "utf8"));
const registryMetadata = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "registry-metadata.json"), "utf8"));
const allowedDifferences = JSON.parse(fs.readFileSync(path.join(root, "allowed-differences.json"), "utf8"));
const ALLOWED_DIFFERENCES_DIGEST = "sha256-ec3b4582daf39af7494cad5aaf0eac7c766169803f370e1b84d70bf2d0b0e4aa";
const failures = [];
const fail = (code, detail) => failures.push({ code, detail });

const tarball = path.join(root, "artifacts", `${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz`);
let tarballSha256 = null;
if (!fs.existsSync(tarball)) fail("LEGACY_TARBALL_MISSING", tarball);
else {
  const tarballBytes = fs.readFileSync(tarball);
  tarballSha256 = sha256(tarballBytes);
  if (sri512(tarballBytes) !== EXPECTED_SRI) fail("LEGACY_TARBALL_SRI", tarball);
}
if (registryMetadata.package !== PACKAGE_NAME
  || registryMetadata.version !== PACKAGE_VERSION
  || registryMetadata.distIntegrity !== EXPECTED_SRI
  || registryMetadata.distShasum !== EXPECTED_SHASUM
  || registryMetadata.tarballSha256 !== tarballSha256) {
  fail("LEGACY_REGISTRY_METADATA", registryMetadata);
}
if (registryMetadata.runtimeReceipt?.schemaVersion !== 1
  || !Array.isArray(registryMetadata.runtimeReceipt?.closure)
  || registryMetadata.runtimeReceipt.closure.length !== 5
  || registryMetadata.runtimeReceipt.closureDigest !== sha256(Buffer.from(JSON.stringify(canonicalize(registryMetadata.runtimeReceipt.closure))))
  || typeof registryMetadata.runtimeReceipt.runtimeTreeDigest !== "string"
  || typeof registryMetadata.runtimeReceipt.entrypointSha256 !== "string") {
  fail("LEGACY_RUNTIME_RECEIPT", registryMetadata.runtimeReceipt);
}
if (allowedDifferences.status !== "frozen" || allowedDifferences.genericOutputExclusionsAllowed !== false) {
  fail("LEGACY_ALLOWED_DIFFERENCES", allowedDifferences.status);
}
if (sha256(Buffer.from(JSON.stringify(canonicalize(allowedDifferences)))) !== ALLOWED_DIFFERENCES_DIGEST) {
  fail("LEGACY_ALLOWED_DIFFERENCES_DIGEST", allowedDifferences);
}

const observedFixtureDigest = treeDigest(treeEntries(path.join(root, "fixture-repository")));
const networkObserverSha256 = sha256(fs.readFileSync(path.join(root, "network-observer.cjs")));
if (manifest.status !== "frozen" || manifest.fixtureRepository?.status !== "frozen") fail("LEGACY_STATUS", manifest.status);
if (manifest.fixtureRepository?.treeDigest !== observedFixtureDigest) fail("LEGACY_FIXTURE_DIGEST", observedFixtureDigest);
if (manifest.observation?.network?.contractVersion !== "1.0.0"
  || manifest.observation.network.implementationSha256 !== networkObserverSha256
  || manifest.observation.network.status !== "passed"
  || typeof manifest.observation.network.selfTestDigest !== "string") {
  fail("LEGACY_NETWORK_OBSERVER_RECEIPT", manifest.observation?.network);
}
if (manifest.cases.length !== 41 || new Set(manifest.cases.map((entry) => entry.id)).size !== 41) fail("LEGACY_CASE_SET", manifest.cases.length);
if (index.schemaVersion !== 1 || index.status !== "frozen" || index.caseCount !== 41 || index.snapshots?.length !== 41) {
  fail("LEGACY_INDEX_CONTRACT", { schemaVersion: index.schemaVersion, status: index.status, caseCount: index.caseCount });
}
if (new Set((index.snapshots || []).map((entry) => entry.caseId)).size !== 41) fail("LEGACY_INDEX_CASE_SET", index.snapshots?.length);

const indexByCase = new Map((index.snapshots || []).map((entry) => [entry.caseId, entry]));
const aggregateTraces = [];
const noCloneCases = new Set([
  "help-long", "help-short", "version",
  "missing-value-path", "missing-value-release", "missing-value-tag", "missing-value-risk",
  "missing-value-category", "missing-value-tags", "missing-value-skills",
  "unknown-flag", "unknown-command", "empty-exact-token",
]);
for (const caseData of manifest.cases) {
  const expectedSnapshotPath = `snapshots/${caseData.id}.json`;
  const expectedArgs = caseData.args.map((arg) => arg
    .replace("{{ABSOLUTE_TARGET}}", "<CASE_ROOT>/targets/absolute")
    .replace("{{MISSING_TARGET}}", "<CASE_ROOT>/targets/missing")
    .replace("{{SYMLINK_TARGET}}", "<CASE_ROOT>/targets/symlink"));
  if (!caseData.expectedSnapshot || !caseData.expectedSnapshotSha256) {
    fail("LEGACY_SNAPSHOT_REFERENCE", caseData.id);
    continue;
  }
  const snapshotPath = path.resolve(root, caseData.expectedSnapshot);
  if (!snapshotPath.startsWith(`${root}${path.sep}`) || !fs.existsSync(snapshotPath)) {
    fail("LEGACY_SNAPSHOT_MISSING", caseData.id);
    continue;
  }
  const bytes = fs.readFileSync(snapshotPath);
  const digest = sha256(bytes);
  if (digest !== caseData.expectedSnapshotSha256) fail("LEGACY_SNAPSHOT_DIGEST", caseData.id);
  const snapshot = JSON.parse(bytes.toString("utf8"));
  if (caseData.expectedSnapshot !== expectedSnapshotPath
    || snapshot.schemaVersion !== 1
    || snapshot.caseId !== caseData.id
    || snapshot.fixtureState !== caseData.fixtureState
    || snapshot.expectedExitCode !== caseData.expectedExitCode
    || snapshot.observedExitCode !== caseData.expectedExitCode) {
    fail("LEGACY_SNAPSHOT_IDENTITY", caseData.id);
  }
  if (snapshot.invocation?.executable !== `<BASELINE_RUNTIME>/node_modules/${PACKAGE_NAME}/tools/bin/install.js`
    || snapshot.invocation?.cwd !== "<CASE_ROOT>/workspace"
    || JSON.stringify(snapshot.invocation?.args) !== JSON.stringify(expectedArgs)) {
    fail("LEGACY_SNAPSHOT_INVOCATION", caseData.id);
  }
  if (snapshot.packageIdentity?.package !== PACKAGE_NAME
    || snapshot.packageIdentity?.version !== PACKAGE_VERSION
    || snapshot.packageIdentity?.distIntegrity !== EXPECTED_SRI) {
    fail("LEGACY_SNAPSHOT_PACKAGE", caseData.id);
  }
  if (snapshot.signal !== null) fail("LEGACY_SNAPSHOT_SIGNAL", caseData.id);
  const tagIndex = caseData.args.indexOf("--tag");
  const releaseIndex = caseData.args.indexOf("--release");
  const expectedBranch = noCloneCases.has(caseData.id)
    ? null
    : (tagIndex >= 0
      ? caseData.args[tagIndex + 1]
      : (releaseIndex >= 0 ? `v${caseData.args[releaseIndex + 1].replace(/^v/, "")}` : `v${PACKAGE_VERSION}`));
  const expectedTrace = noCloneCases.has(caseData.id) ? [] : [{
    schemaVersion: 1,
    command: "clone",
    depth: "1",
    branch: expectedBranch,
    repository: "https://github.com/sickn33/agentic-awesome-skills.git",
    destination: "<CLONE_DIR>",
    destinationWasEmpty: true,
    destinationContained: true,
    fixtureDigest: observedFixtureDigest,
  }];
  if (JSON.stringify(canonicalize(snapshot.fakeGitTrace)) !== JSON.stringify(canonicalize(expectedTrace))) {
    fail("LEGACY_TRACE_SEMANTICS", caseData.id);
  }
  if (snapshot.invariants?.noStackStateCreated !== true
    || snapshot.invariants?.harnessEvidenceExcluded !== true
    || snapshot.invariants?.fixtureDigest !== observedFixtureDigest) fail("LEGACY_SNAPSHOT_INVARIANT", caseData.id);
  if (!Array.isArray(snapshot.evidence?.harnessFiles)
    || JSON.stringify(snapshot.evidence.harnessFiles) !== JSON.stringify(expectedTrace.length ? ["fake-git.jsonl"] : [])
    || !Array.isArray(snapshot.evidence?.networkAttempts)
    || snapshot.evidence.networkAttempts.length !== 0
    || snapshot.evidence.networkAttemptDigest !== sha256(Buffer.from(JSON.stringify(canonicalize(snapshot.evidence.networkAttempts))))) {
    fail("LEGACY_SNAPSHOT_EVIDENCE", caseData.id);
  }
  if (!Array.isArray(snapshot.preFilesystem) || snapshot.preTreeDigest !== treeDigest(snapshot.preFilesystem)) fail("LEGACY_PRE_TREE_DIGEST", caseData.id);
  if (snapshot.treeDigest !== treeDigest(snapshot.filesystem)) fail("LEGACY_TREE_DIGEST", caseData.id);
  const traceDigest = sha256(Buffer.from(JSON.stringify(canonicalize(snapshot.fakeGitTrace))));
  if (traceDigest !== snapshot.fakeGitTraceDigest) fail("LEGACY_TRACE_DIGEST", caseData.id);
  const indexed = indexByCase.get(caseData.id);
  if (!indexed
    || indexed.path !== expectedSnapshotPath
    || indexed.sha256 !== digest
    || indexed.treeDigest !== snapshot.treeDigest
    || indexed.fakeGitTraceDigest !== traceDigest) fail("LEGACY_INDEX_ENTRY", caseData.id);
  aggregateTraces.push({ caseId: caseData.id, trace: snapshot.fakeGitTrace });
}

const aggregateDigest = sha256(Buffer.from(JSON.stringify(canonicalize(aggregateTraces))));
if (aggregateDigest !== manifest.fixtureRepository?.fakeGitTraceDigest || aggregateDigest !== index.aggregateFakeGitTraceDigest) fail("LEGACY_AGGREGATE_TRACE_DIGEST", aggregateDigest);
if (index.fixtureTreeDigest !== observedFixtureDigest) fail("LEGACY_INDEX_FIXTURE_DIGEST", index.fixtureTreeDigest);

if (failures.length) {
  process.stderr.write(`${JSON.stringify({ ok: false, failures }, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`${JSON.stringify({ ok: true, status: manifest.status, cases: manifest.cases.length, fixtureTreeDigest: observedFixtureDigest, aggregateFakeGitTraceDigest: aggregateDigest })}\n`);
