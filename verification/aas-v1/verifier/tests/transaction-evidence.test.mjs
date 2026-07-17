import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadReceiptValidator } from "../lib/receipt.mjs";
import { selectBackupSkillIds } from "../lib/transaction-controller.mjs";

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
