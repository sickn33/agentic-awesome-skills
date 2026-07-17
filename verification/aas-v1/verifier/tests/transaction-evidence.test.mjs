import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadReceiptValidator } from "../lib/receipt.mjs";

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
