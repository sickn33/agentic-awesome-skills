import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadReceiptValidator } from "../lib/receipt.mjs";
import { classifyConcurrencyOutcomes, corruptPrefixIsFailClosed, faultFixtureProfile, faultObservationSkillId, nativeMutationEvidenceSatisfied, nativeObservationLineage, portableTreeDigest, raceFixtureProfile, selectBackupSkillIds, walBoundaryIsValid } from "../lib/transaction-controller.mjs";
import { expectedRecoveryId, isTransientTraversalError, validateObservedLockRecord } from "../lib/transaction-fault-contract.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const validate = loadReceiptValidator(path.resolve(here, "..", "..", "schemas", "product-transaction-evidence.schema.json"));
const digest = `sha256-${"a".repeat(64)}`;
const fault = ["lock", "journal", "backup", "write", "fsync", "rename", "commit"];
const race = ["concurrency", "drift", "symlink-swap", "target-swap", "corrupt-journal", "recovery-race"];

function evidence() {
  const records = [...fault, ...race].map((value, index) => {
    const kind = index < fault.length ? "faultBoundary" : "race";
    const action = kind === "faultBoundary" ? "kill" : value === "concurrency" ? "concurrent" : value;
    return {
      executionId: `${kind}-${value}`,
      class: value,
      kind,
      observedOperation: `event-${index}`,
      injectionAction: action,
      planDigest: digest,
      commandDigest: digest,
      observerEventDigest: digest,
      beforeDigest: digest,
      afterDigest: digest,
      unmanagedBeforeDigest: digest,
      unmanagedAfterDigest: digest,
      exitCode: kind === "faultBoundary" ? 137 : 0,
      exitSignal: kind === "faultBoundary" ? "SIGKILL" : null,
      recoveryAction: kind === "faultBoundary" ? "cleanup" : "none",
      recoveryStatus: kind === "faultBoundary" ? "cleaned" : "healthy",
      recoveryPlanDigest: digest,
      finalState: index % 2 ? "new" : "previous",
      noPartialState: true,
    };
  });
  return {
    schemaVersion: 1, status: "passed", productionBinary: true, testMode: false, mocked: false,
    candidate: {
      package: "agentic-awesome-skills", version: "14.6.0",
      tarballSha512: `sha512-${"Y".repeat(86)}==`, installedTreeSha256: digest, aasEntrypointSha256: digest,
    },
    controller: { version: "1.0.0", digest },
    observer: { backend: "linux-strace-process-tree", eventDigest: digest, eventCount: 13, overflow: false, ambiguousLineage: false },
    faultBoundaryClasses: [...fault], raceClasses: [...race], executions: 13, killExecutions: 7,
    swapExecutions: 2, recoveryExecutions: 7, partialStates: 0, unmanagedMutations: 0,
    hardPolicyViolations: 0,
    boundaryEvidence: records,
  };
}

test("transaction evidence requires full external black-box coverage", () => {
  assert.equal(validate(evidence()), true, JSON.stringify(validate.errors));
  const mocked = evidence();
  mocked.mocked = true;
  assert.equal(validate(mocked), false);
  const incomplete = evidence();
  incomplete.faultBoundaryClasses.pop();
  assert.equal(validate(incomplete), false);
  const unbound = evidence();
  delete unbound.boundaryEvidence[0].planDigest;
  assert.equal(validate(unbound), false);
  const mutatedUnmanaged = evidence();
  mutatedUnmanaged.boundaryEvidence[0].unmanagedAfterDigest = `sha256-${"b".repeat(64)}`;
  assert.equal(validate(mutatedUnmanaged), true, "schema leaves cross-field equality to the verifier");
});

test("backup fixtures use only policy-safe reviewed skills", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-controller-skills-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const complete = (risk = "safe") => ({
    reviewDecision: "supported",
    capabilities: ["test-capability"],
    risk: { status: "known", value: risk },
    source: { status: "known", value: { type: "test" } },
    setup: { status: "known", value: "none" },
    targets: { codex: { status: "known", value: "supported" } },
    dependencies: { status: "known", value: [] },
    conflicts: { status: "known", value: [] },
    validation: { status: "notApplicable", value: null },
  });
  const reviewed = {
    "safe-a": complete(),
    "safe-b": complete("none"),
    incomplete: { ...complete(), dependencies: { status: "unknown", value: null } },
    "manual-skill": { risk: { status: "known", value: "safe" }, source: { status: "known", value: { type: "test" } }, setup: { status: "known", value: "manual" } },
    "unknown-source": { risk: { status: "known", value: "safe" }, source: { status: "unknown", value: null }, setup: { status: "known", value: "none" } },
    "blocked-target": { risk: { status: "known", value: "safe" }, source: { status: "known", value: { type: "test" } }, setup: { status: "known", value: "none" }, targets: { codex: { status: "known", value: "blocked" } } },
  };
  const metadataPath = path.join(root, "tools", "lib", "aas-v1");
  fs.mkdirSync(metadataPath, { recursive: true });
  fs.writeFileSync(path.join(metadataPath, "metadata-overrides.v1.json"), JSON.stringify({ skills: reviewed }));
  for (const id of Object.keys(reviewed)) {
    const skillRoot = path.join(root, "skills", id);
    fs.mkdirSync(skillRoot, { recursive: true });
    fs.writeFileSync(path.join(skillRoot, "SKILL.md"), `# ${id}\n${id === "safe-b" ? "larger fixture\n" : ""}`);
  }
  assert.deepEqual(selectBackupSkillIds(root, "unused-primary", 2), ["safe-b", "safe-a"]);
});

test("WAL boundary rules reject commits without rejecting reversible recovery metadata", () => {
  assert.equal(walBoundaryIsValid("lock", []), true);
  assert.equal(walBoundaryIsValid("lock", ["started"]), false);
  assert.equal(walBoundaryIsValid("journal", ["started", "layoutDirectoryCreated"]), true);
  assert.equal(walBoundaryIsValid("journal", []), false);
  assert.equal(walBoundaryIsValid("journal", ["started", "committed"]), false);
  assert.equal(walBoundaryIsValid("fsync", ["started", "mutationIntent"]), true);
  assert.equal(walBoundaryIsValid("fsync", ["started", "committed"]), false);
  assert.equal(walBoundaryIsValid("commit", ["started", "committed"]), true);
  assert.equal(walBoundaryIsValid("backup", ["started", "committed"]), false);
});

test("portable tree evidence compares content without product-specific digest metadata", (t) => {
  const left = fs.mkdtempSync(path.join(os.tmpdir(), "aas-controller-tree-left-"));
  const right = fs.mkdtempSync(path.join(os.tmpdir(), "aas-controller-tree-right-"));
  t.after(() => {
    fs.rmSync(left, { recursive: true, force: true });
    fs.rmSync(right, { recursive: true, force: true });
  });
  for (const root of [left, right]) {
    fs.mkdirSync(path.join(root, "nested"));
    fs.writeFileSync(path.join(root, "nested", "SKILL.md"), "same bytes\n");
  }
  fs.chmodSync(path.join(left, "nested", "SKILL.md"), 0o600);
  fs.chmodSync(path.join(right, "nested", "SKILL.md"), 0o644);
  assert.equal(portableTreeDigest(left), portableTreeDigest(right));
  fs.writeFileSync(path.join(right, "nested", "SKILL.md"), "changed bytes\n");
  assert.notEqual(portableTreeDigest(left), portableTreeDigest(right));
});

test("native lineage accepts macOS executable binding without invented child events", () => {
  const base = { result: { timedOut: false, outputLimitExceeded: false }, observation: { childProcesses: 0 }, diagnostics: {} };
  assert.deepEqual(nativeObservationLineage("darwin", { ...base, backend: "macos-fs_usage-process" }), {
    childObserved: true,
    verified: true,
  });
  assert.deepEqual(nativeObservationLineage("linux", { ...base, backend: "linux-strace-process-tree" }), {
    childObserved: false,
    verified: true,
  });
  assert.equal(nativeObservationLineage("linux", { ...base, backend: "macos-fs_usage-process" }).verified, false);
  assert.equal(nativeObservationLineage("win32", {
    ...base,
    backend: "windows-etw-kernel-process-tree",
    observation: { childProcesses: 1 },
    diagnostics: { processTreeEmpty: true },
  }).verified, true);
});

test("only the externally validated lock boundary may omit a sampled native write", () => {
  assert.equal(nativeMutationEvidenceSatisfied("darwin", "lock", 0, true), true);
  assert.equal(nativeMutationEvidenceSatisfied("darwin", "lock", 0, false), false);
  assert.equal(nativeMutationEvidenceSatisfied("linux", "lock", 0, true), false);
  assert.equal(nativeMutationEvidenceSatisfied("win32", "lock", 0, true), false);
  assert.equal(nativeMutationEvidenceSatisfied("darwin", "journal", 0, true), false);
  assert.equal(nativeMutationEvidenceSatisfied("linux", "journal", 1, false), true);
  assert.equal(nativeMutationEvidenceSatisfied("win32", "write", 10, true), true);
});

test("lock observation is bound to the exact child, plan, target, and journal", () => {
  const expected = {
    pid: 321,
    planDigest: `sha256-${"b".repeat(64)}`,
    targetIdentityDigest: `sha256-${"c".repeat(64)}`,
  };
  const recoveryId = expectedRecoveryId(expected.planDigest, expected.targetIdentityDigest);
  const record = {
    schemaVersion: 1,
    kind: "apply",
    pid: expected.pid,
    token: "e".repeat(48),
    planDigest: expected.planDigest,
    targetIdentityDigest: expected.targetIdentityDigest,
    recoveryId,
    journalName: `.aas-transaction-${recoveryId}.wal`,
    plannedDirectories: [],
  };
  assert.equal(validateObservedLockRecord(record, expected), true);
  assert.equal(validateObservedLockRecord({ ...record, pid: 322 }, expected), false);
  assert.equal(validateObservedLockRecord({ ...record, planDigest: digest }, expected), false);
  assert.equal(validateObservedLockRecord({ ...record, targetIdentityDigest: digest }, expected), false);
  assert.equal(validateObservedLockRecord({ ...record, journalName: ".aas-transaction-other.wal" }, expected), false);
  assert.equal(validateObservedLockRecord({ ...record, recoveryId: `recovery-${"d".repeat(48)}` }, expected), false);
  assert.equal(validateObservedLockRecord({ ...record, plannedDirectories: ["unrelated-but-safe"] }, expected), false);
});

test("transaction traversal ignores disappearance only", () => {
  assert.equal(isTransientTraversalError({ code: "ENOENT" }), true);
  assert.equal(isTransientTraversalError({ code: "ENOTDIR" }), true);
  assert.equal(isTransientTraversalError({ code: "EACCES" }), false);
  assert.equal(isTransientTraversalError({ code: "EIO" }), false);
  assert.equal(isTransientTraversalError({ code: "EPERM" }), false);
});

test("write faults use a policy-safe corpus to expose the transient staging boundary", () => {
  const corpus = ["large-a", "large-b"];
  assert.deepEqual(faultFixtureProfile("write", corpus), {
    installed: false,
    desired: true,
    additionalSkills: corpus,
  });
  assert.deepEqual(faultFixtureProfile("backup", corpus), {
    installed: true,
    desired: false,
    additionalSkills: corpus,
  });
  assert.deepEqual(faultFixtureProfile("rename", corpus), {
    installed: false,
    desired: true,
    additionalSkills: corpus,
  });
  assert.deepEqual(faultFixtureProfile("commit", corpus), {
    installed: false,
    desired: true,
    additionalSkills: [],
  });
});

test("rename faults observe the first deterministic staged publication", () => {
  const corpus = ["frontend-dev-guidelines", "agent-tool-builder", "tailwind-design-system"];
  assert.equal(faultObservationSkillId("rename", "react-best-practices", corpus), "agent-tool-builder");
  assert.equal(faultObservationSkillId("write", "react-best-practices", corpus), "react-best-practices");
});

test("concurrency races keep the externally observed target lock contended", () => {
  const corpus = ["large-a", "large-b"];
  assert.deepEqual(raceFixtureProfile("concurrency", corpus), { additionalSkills: corpus });
  assert.deepEqual(raceFixtureProfile("drift", corpus), { additionalSkills: corpus });
  assert.deepEqual(raceFixtureProfile("symlink-swap", corpus), { additionalSkills: corpus });
  assert.deepEqual(raceFixtureProfile("target-swap", corpus), { additionalSkills: corpus });
  assert.deepEqual(raceFixtureProfile("corrupt-journal", corpus), { additionalSkills: [] });
});

test("concurrency accepts only lock rejection or post-commit idempotence", () => {
  const applied = { result: { code: 0 }, value: { status: "applied" } };
  const locked = { result: { code: 4 }, value: { status: "error", code: "AAS_TRANSACTION_LOCKED" } };
  const idempotent = { result: { code: 0 }, value: { status: "alreadyApplied" } };
  assert.equal(classifyConcurrencyOutcomes([applied, locked]), "locked");
  assert.equal(classifyConcurrencyOutcomes([applied, idempotent]), "alreadyApplied");
  assert.equal(classifyConcurrencyOutcomes([applied, { result: { code: 0 }, value: { status: "applied" } }]), null);
  assert.equal(classifyConcurrencyOutcomes([applied, { result: { code: 1 }, value: { status: "alreadyApplied" } }]), null);
});

test("corrupt journal prefixes fail closed under both actionable doctor statuses", () => {
  assert.equal(corruptPrefixIsFailClosed("degraded", ["AAS_TRANSACTION_JOURNAL_CORRUPT"]), true);
  assert.equal(corruptPrefixIsFailClosed("recoveryRequired", ["AAS_TRANSACTION_JOURNAL_CORRUPT"]), true);
  assert.equal(corruptPrefixIsFailClosed("healthy", ["AAS_TRANSACTION_JOURNAL_CORRUPT"]), false);
  assert.equal(corruptPrefixIsFailClosed("recoveryRequired", ["AAS_TRANSACTION_STALE_OR_ACTIVE_LOCK"]), false);
});
