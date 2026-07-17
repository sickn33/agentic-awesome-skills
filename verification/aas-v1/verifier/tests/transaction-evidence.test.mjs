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
  return {
    schemaVersion: 1, status: "passed", productionBinary: true, testMode: false, mocked: false,
    observer: { backend: "linux-strace-process-tree", eventDigest: digest, overflow: false, ambiguousLineage: false },
    faultBoundaryClasses: fault, raceClasses: race, executions: 13, killExecutions: 7,
    swapExecutions: 2, recoveryExecutions: 2, partialStates: 0, unmanagedMutations: 0,
    hardPolicyViolations: 0,
    boundaryEvidence: [...fault, ...race].map((value, index) => ({
      class: value, observedOperation: `event-${index}`,
      injectionAction: index < fault.length ? "kill" : value === "concurrency" ? "concurrent" : value,
      beforeDigest: digest, afterDigest: digest, finalState: index % 2 ? "new" : "previous", noPartialState: true,
    })),
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
});
