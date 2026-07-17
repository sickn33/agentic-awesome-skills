import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { digestJson } from "../lib/canonical.mjs";
import {
  assertTransactionEvidenceSemantics,
  readTransactionEvidence,
  TRANSACTION_FAULT_CLASSES,
  TRANSACTION_RACE_CLASSES,
  transactionEvidenceFailures,
} from "../lib/transaction-evidence.mjs";

test("malformed transaction JSON maps to the public schema failure", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aas-transaction-json-"));
  const file = path.join(root, "evidence.json");
  fs.writeFileSync(file, "{not-json");
  assert.throws(() => readTransactionEvidence(file, () => true), { code: "AAS_VERIFIER_TRANSACTION_EVIDENCE_SCHEMA" });
  fs.rmSync(root, { recursive: true, force: true });
});

const digest = (label) => digestJson({ label });
const candidate = Object.freeze({
  package: "agentic-awesome-skills",
  version: "14.6.0",
  tarballSha512: "sha512-YWFzLXRyYW5zYWN0aW9uLWV2aWRlbmNl",
  installedTreeSha256: digest("installed-tree"),
  aasEntrypointSha256: digest("aas-entrypoint"),
});
const context = Object.freeze({
  expectedCandidate: candidate,
  jobId: "linux-node-22",
  nativeObserverBackend: "linux-strace-process-tree",
  controllerVersion: "1.0.0",
});

function evidence() {
  const classes = [...TRANSACTION_FAULT_CLASSES, ...TRANSACTION_RACE_CLASSES];
  const boundaryEvidence = classes.map((className, index) => {
    const fault = index < TRANSACTION_FAULT_CLASSES.length;
    const kind = fault ? "faultBoundary" : "race";
    const injectionAction = fault ? "kill" : className === "concurrency" ? "concurrent" : className;
    const finalState = fault ? className === "commit" ? "new" : "previous" : className === "concurrency" ? "new" : "previous";
    const planDigest = digest(`plan-${index}`);
    let recoveryAction = fault ? "cleanup" : "none";
    if (className === "corrupt-journal") recoveryAction = "cleanup";
    if (className === "recovery-race") recoveryAction = "rollback";
    return {
      executionId: `${kind}-${className}`,
      class: className,
      kind,
      observedOperation: `${fault ? "external-filesystem" : "external-race"}:${className}`,
      injectionAction,
      planDigest,
      commandDigest: digest(`command-${index}`),
      observerEventDigest: digest(`trace-${index}`),
      beforeDigest: digest(`before-${index}`),
      afterDigest: finalState === "previous" ? digest(`before-${index}`) : digest(`after-${index}`),
      unmanagedBeforeDigest: digest(`unmanaged-${index}`),
      unmanagedAfterDigest: digest(`unmanaged-${index}`),
      exitCode: fault ? 137 : className === "concurrency" ? 0 : 1,
      exitSignal: fault ? "SIGKILL" : null,
      recoveryAction,
      recoveryStatus: recoveryAction === "none" ? "healthy" : recoveryAction === "cleanup" ? "cleaned" : "rolledBack",
      recoveryPlanDigest: ["none", "fail-closed"].includes(recoveryAction) ? planDigest : digest(`recovery-plan-${index}`),
      finalState,
      noPartialState: true,
    };
  });
  return {
    schemaVersion: 1,
    status: "passed",
    productionBinary: true,
    testMode: false,
    mocked: false,
    candidate: { ...candidate },
    controller: {
      version: context.controllerVersion,
      digest: digestJson({
        version: context.controllerVersion,
        faultClasses: TRANSACTION_FAULT_CLASSES,
        raceClasses: TRANSACTION_RACE_CLASSES,
      }),
    },
    observer: {
      backend: context.nativeObserverBackend,
      eventDigest: digestJson(boundaryEvidence.map((record) => record.observerEventDigest)),
      eventCount: boundaryEvidence.length,
      overflow: false,
      ambiguousLineage: false,
    },
    faultBoundaryClasses: [...TRANSACTION_FAULT_CLASSES],
    raceClasses: [...TRANSACTION_RACE_CLASSES],
    executions: boundaryEvidence.length,
    killExecutions: boundaryEvidence.filter((record) => record.injectionAction === "kill").length,
    swapExecutions: boundaryEvidence.filter((record) => record.injectionAction.endsWith("swap")).length,
    recoveryExecutions: boundaryEvidence.filter((record) => !["none", "fail-closed"].includes(record.recoveryAction)).length,
    partialStates: 0,
    unmanagedMutations: 0,
    hardPolicyViolations: 0,
    boundaryEvidence,
  };
}

function codes(value, validationContext = context) {
  return transactionEvidenceFailures(value, validationContext).map((entry) => entry.code);
}

test("transaction semantic contract accepts independently bound unique executions", () => {
  const value = evidence();
  assert.deepEqual(transactionEvidenceFailures(value, context), []);
  assert.equal(assertTransactionEvidenceSemantics(value, context), value);
});

test("transaction semantic contract rejects duplicated or reordered execution claims", () => {
  const duplicate = evidence();
  duplicate.boundaryEvidence[1] = structuredClone(duplicate.boundaryEvidence[0]);
  duplicate.observer.eventDigest = digestJson(duplicate.boundaryEvidence.map((record) => record.observerEventDigest));
  assert.ok(codes(duplicate).includes("AAS_VERIFIER_TRANSACTION_DUPLICATE_EXECUTION"));
  assert.ok(codes(duplicate).includes("AAS_VERIFIER_TRANSACTION_DUPLICATE_BINDING"));

  const reordered = evidence();
  [reordered.boundaryEvidence[0], reordered.boundaryEvidence[1]] = [reordered.boundaryEvidence[1], reordered.boundaryEvidence[0]];
  reordered.observer.eventDigest = digestJson(reordered.boundaryEvidence.map((record) => record.observerEventDigest));
  assert.ok(codes(reordered).includes("AAS_VERIFIER_TRANSACTION_EXECUTION_BINDING"));
});

test("transaction semantic contract derives every summary and trace aggregate", () => {
  for (const field of ["executions", "killExecutions", "swapExecutions", "recoveryExecutions"]) {
    const forged = evidence();
    forged[field] += 1;
    assert.ok(codes(forged).includes("AAS_VERIFIER_TRANSACTION_AGGREGATE_BINDING"), field);
  }
  const forgedTrace = evidence();
  forgedTrace.observer.eventDigest = digest("unrelated-trace");
  assert.ok(codes(forgedTrace).includes("AAS_VERIFIER_TRANSACTION_AGGREGATE_BINDING"));
});

test("transaction semantic contract binds candidate controller observer and job", () => {
  const wrongCandidate = evidence();
  wrongCandidate.candidate.installedTreeSha256 = digest("other-tree");
  assert.ok(codes(wrongCandidate).includes("AAS_VERIFIER_TRANSACTION_CANDIDATE_MISMATCH"));

  const wrongController = evidence();
  wrongController.controller.digest = digest("other-controller");
  assert.ok(codes(wrongController).includes("AAS_VERIFIER_TRANSACTION_CONTROLLER_MISMATCH"));

  const wrongBackend = evidence();
  wrongBackend.observer.backend = "windows-etw-kernel-process-tree";
  assert.ok(codes(wrongBackend).includes("AAS_VERIFIER_TRANSACTION_OBSERVER_JOB_MISMATCH"));

  assert.ok(codes(evidence(), {}).includes("AAS_VERIFIER_TRANSACTION_TRUST_CONTEXT_MISSING"));
});

test("transaction semantic contract rejects disconnected plans commands and traces", () => {
  for (const field of ["planDigest", "commandDigest", "observerEventDigest"]) {
    const duplicate = evidence();
    duplicate.boundaryEvidence[1][field] = duplicate.boundaryEvidence[0][field];
    if (field === "observerEventDigest") {
      duplicate.observer.eventDigest = digestJson(duplicate.boundaryEvidence.map((record) => record.observerEventDigest));
    }
    assert.ok(codes(duplicate).includes("AAS_VERIFIER_TRANSACTION_DUPLICATE_BINDING"), field);
  }
});

test("transaction semantic contract rejects forged action, kill, recovery and final state", () => {
  const action = evidence();
  action.boundaryEvidence[0].injectionAction = "drift";
  assert.ok(codes(action).includes("AAS_VERIFIER_TRANSACTION_EXECUTION_BINDING"));

  const kill = evidence();
  kill.boundaryEvidence[0].exitCode = 0;
  kill.boundaryEvidence[0].exitSignal = null;
  assert.ok(codes(kill).includes("AAS_VERIFIER_TRANSACTION_KILL_NOT_OBSERVED"));

  const race = evidence();
  const drift = race.boundaryEvidence.find((record) => record.class === "drift");
  drift.exitCode = 0;
  assert.ok(codes(race).includes("AAS_VERIFIER_TRANSACTION_RACE_NOT_BLOCKED"));

  const recovery = evidence();
  const recoveryRace = recovery.boundaryEvidence.find((record) => record.class === "recovery-race");
  recoveryRace.recoveryAction = "none";
  recoveryRace.recoveryPlanDigest = recoveryRace.planDigest;
  recovery.recoveryExecutions -= 1;
  assert.ok(codes(recovery).includes("AAS_VERIFIER_TRANSACTION_RECOVERY_BINDING"));

  const finalState = evidence();
  finalState.boundaryEvidence[0].afterDigest = digest("partial-result");
  assert.ok(codes(finalState).includes("AAS_VERIFIER_TRANSACTION_FINAL_STATE_MISMATCH"));
});

test("transaction semantic contract rejects unmanaged, partial, mocked, and ambiguous evidence", () => {
  const unmanaged = evidence();
  unmanaged.boundaryEvidence[0].unmanagedAfterDigest = digest("mutated-unmanaged");
  assert.ok(codes(unmanaged).includes("AAS_VERIFIER_TRANSACTION_UNMANAGED_MUTATION"));

  const partial = evidence();
  partial.boundaryEvidence[0].noPartialState = false;
  assert.ok(codes(partial).includes("AAS_VERIFIER_TRANSACTION_PARTIAL_STATE"));

  const mocked = evidence();
  mocked.mocked = true;
  assert.ok(codes(mocked).includes("AAS_VERIFIER_TRANSACTION_NOT_BLACK_BOX"));

  const ambiguous = evidence();
  ambiguous.observer.ambiguousLineage = true;
  assert.ok(codes(ambiguous).includes("AAS_VERIFIER_TRANSACTION_INVARIANT"));
});

test("transaction semantic assertion fails closed with stable reason codes", () => {
  const duplicate = evidence();
  duplicate.boundaryEvidence[1] = structuredClone(duplicate.boundaryEvidence[0]);
  assert.throws(
    () => assertTransactionEvidenceSemantics(duplicate, context),
    (error) => error.code === "AAS_VERIFIER_TRANSACTION_DUPLICATE_EXECUTION"
      && error.failures.every((entry) => /^AAS_VERIFIER_TRANSACTION_/.test(entry.code)),
  );
  assert.deepEqual(codes(null), ["AAS_VERIFIER_TRANSACTION_SEMANTIC_INPUT"]);
});
