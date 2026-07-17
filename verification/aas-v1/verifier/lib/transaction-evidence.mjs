import fs from "node:fs";
import { digestJson } from "./canonical.mjs";

export const TRANSACTION_FAULT_CLASSES = Object.freeze([
  "lock", "journal", "backup", "write", "fsync", "rename", "commit",
]);

export const TRANSACTION_RACE_CLASSES = Object.freeze([
  "concurrency", "drift", "symlink-swap", "target-swap", "corrupt-journal", "recovery-race",
]);

const BACKEND_BY_JOB_PREFIX = Object.freeze({
  linux: "linux-strace-process-tree",
  macos: "macos-fs_usage-process",
  windows: "windows-etw-kernel-process-tree",
});

const RACE_ACTION = Object.freeze({
  concurrency: "concurrent",
  drift: "drift",
  "symlink-swap": "symlink-swap",
  "target-swap": "target-swap",
  "corrupt-journal": "corrupt-journal",
  "recovery-race": "recovery-race",
});

const RACE_FINAL_STATE = Object.freeze({
  concurrency: "new",
  drift: "previous",
  "symlink-swap": "previous",
  "target-swap": "previous",
  "corrupt-journal": "previous",
  "recovery-race": "previous",
});

export function readTransactionEvidence(file, validator) {
  let value;
  try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch (cause) {
    throw Object.assign(new Error("Transaction evidence is not valid JSON"), {
      code: "AAS_VERIFIER_TRANSACTION_EVIDENCE_SCHEMA",
      cause,
    });
  }
  if (!validator(value)) {
    throw Object.assign(new Error("Transaction evidence schema failed"), { code: "AAS_VERIFIER_TRANSACTION_EVIDENCE_SCHEMA" });
  }
  return value;
}

function failure(code, details = {}) {
  return { code, details };
}

function sameCanonical(left, right) {
  try {
    return digestJson(left) === digestJson(right);
  } catch {
    return false;
  }
}

function expectedBackend(jobId) {
  const prefix = typeof jobId === "string" ? jobId.split("-", 1)[0] : "";
  return BACKEND_BY_JOB_PREFIX[prefix] || null;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

/**
 * Validate cross-field bindings that JSON Schema cannot express.
 *
 * The caller must supply identities derived independently from the candidate
 * tarball and the frozen verifier job. Self-declared evidence identities are
 * never accepted as their own trust anchor.
 */
export function transactionEvidenceFailures(value, context = {}) {
  const failures = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [failure("AAS_VERIFIER_TRANSACTION_SEMANTIC_INPUT")];
  }

  const faultClasses = context.faultBoundaryClasses || TRANSACTION_FAULT_CLASSES;
  const raceClasses = context.raceClasses || TRANSACTION_RACE_CLASSES;
  const expectedClasses = [...faultClasses, ...raceClasses];
  const records = Array.isArray(value.boundaryEvidence) ? value.boundaryEvidence : [];

  if (!context.expectedCandidate || !context.jobId || !context.nativeObserverBackend || !context.controllerVersion) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_TRUST_CONTEXT_MISSING"));
  }

  if (!sameCanonical(value.candidate, context.expectedCandidate)) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_CANDIDATE_MISMATCH"));
  }

  const jobBackend = expectedBackend(context.jobId);
  if (!jobBackend || context.nativeObserverBackend !== jobBackend || value.observer?.backend !== jobBackend) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_OBSERVER_JOB_MISMATCH", {
      jobId: context.jobId || null,
      expected: jobBackend,
      native: context.nativeObserverBackend || null,
      evidence: value.observer?.backend || null,
    }));
  }

  const controllerVersion = typeof context.controllerVersion === "string" ? context.controllerVersion : null;
  const expectedController = {
    version: controllerVersion,
    digest: digestJson({ version: controllerVersion, faultClasses, raceClasses }),
  };
  if (!sameCanonical(value.controller, expectedController)) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_CONTROLLER_MISMATCH"));
  }

  if (!sameCanonical(value.faultBoundaryClasses, faultClasses)
    || !sameCanonical(value.raceClasses, raceClasses)) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_CLASS_SUMMARY_MISMATCH"));
  }

  if (records.length !== expectedClasses.length) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_EXECUTION_COUNT", {
      expected: expectedClasses.length,
      actual: records.length,
    }));
  }

  const ids = records.map((record) => record?.executionId);
  const classes = records.map((record) => record?.class);
  for (const [field, values] of [["executionId", ids], ["class", classes]]) {
    const duplicates = duplicateValues(values);
    if (duplicates.length) failures.push(failure("AAS_VERIFIER_TRANSACTION_DUPLICATE_EXECUTION", { field, duplicates }));
  }

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_EXECUTION_BINDING", { index }));
      continue;
    }
    const className = expectedClasses[index];
    const isFault = index < faultClasses.length;
    const kind = isFault ? "faultBoundary" : "race";
    const action = isFault ? "kill" : RACE_ACTION[className];
    const operation = `${isFault ? "external-filesystem" : "external-race"}:${className}`;
    if (record.class !== className
      || record.kind !== kind
      || record.executionId !== `${kind}-${className}`
      || record.injectionAction !== action
      || record.observedOperation !== operation) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_EXECUTION_BINDING", {
        index,
        expectedClass: className,
        executionId: record.executionId || null,
      }));
    }

    if (record.unmanagedBeforeDigest !== record.unmanagedAfterDigest) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_UNMANAGED_MUTATION", { executionId: record.executionId || null }));
    }
    if (record.noPartialState !== true) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_PARTIAL_STATE", { executionId: record.executionId || null }));
    }
    if (record.finalState === "previous" && record.afterDigest !== record.beforeDigest) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_FINAL_STATE_MISMATCH", { executionId: record.executionId || null, finalState: record.finalState }));
    }
    if (record.finalState === "new" && record.afterDigest === record.beforeDigest) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_FINAL_STATE_MISMATCH", { executionId: record.executionId || null, finalState: record.finalState }));
    }

    if (isFault) {
      const interrupted = record.exitSignal !== null || (Number.isInteger(record.exitCode) && record.exitCode !== 0);
      if (!interrupted) failures.push(failure("AAS_VERIFIER_TRANSACTION_KILL_NOT_OBSERVED", { executionId: record.executionId || null }));
      const expectedFinal = className === "commit" ? "new" : "previous";
      if (record.finalState !== expectedFinal) {
        failures.push(failure("AAS_VERIFIER_TRANSACTION_FINAL_STATE_MISMATCH", { executionId: record.executionId || null, expected: expectedFinal }));
      }
    } else {
      if (className !== "concurrency" && record.exitSignal === null && record.exitCode === 0) {
        failures.push(failure("AAS_VERIFIER_TRANSACTION_RACE_NOT_BLOCKED", { executionId: record.executionId || null }));
      }
      if (record.finalState !== RACE_FINAL_STATE[className]) {
        failures.push(failure("AAS_VERIFIER_TRANSACTION_FINAL_STATE_MISMATCH", {
          executionId: record.executionId || null,
          expected: RACE_FINAL_STATE[className],
        }));
      }
    }

    const expectedRecoveryStatus = {
      none: "healthy",
      rollback: "rolledBack",
      cleanup: "cleaned",
      "fail-closed": "degraded",
    }[record.recoveryAction];
    if (record.recoveryStatus !== expectedRecoveryStatus) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_RECOVERY_BINDING", { executionId: record.executionId || null }));
    }
    if (["none", "fail-closed"].includes(record.recoveryAction)) {
      if (record.recoveryPlanDigest !== record.planDigest) {
        failures.push(failure("AAS_VERIFIER_TRANSACTION_RECOVERY_BINDING", { executionId: record.executionId || null }));
      }
    } else if (!["rollback", "cleanup"].includes(record.recoveryAction)
      || record.recoveryPlanDigest === record.planDigest) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_RECOVERY_BINDING", { executionId: record.executionId || null }));
    }

    if (className === "corrupt-journal" && !["rollback", "cleanup"].includes(record.recoveryAction)) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_RECOVERY_BINDING", { executionId: record.executionId || null }));
    }
    if (className === "recovery-race" && !["rollback", "cleanup"].includes(record.recoveryAction)) {
      failures.push(failure("AAS_VERIFIER_TRANSACTION_RECOVERY_BINDING", { executionId: record.executionId || null }));
    }
  }

  for (const [field, values] of [
    ["planDigest", records.map((record) => record?.planDigest)],
    ["commandDigest", records.map((record) => record?.commandDigest)],
    ["observerEventDigest", records.map((record) => record?.observerEventDigest)],
  ]) {
    const duplicates = duplicateValues(values);
    if (duplicates.length) failures.push(failure("AAS_VERIFIER_TRANSACTION_DUPLICATE_BINDING", { field, duplicates }));
  }

  const killExecutions = records.filter((record) => record?.injectionAction === "kill").length;
  const swapExecutions = records.filter((record) => typeof record?.injectionAction === "string" && record.injectionAction.endsWith("swap")).length;
  const recoveryExecutions = records.filter((record) => !["none", "fail-closed"].includes(record?.recoveryAction)).length;
  let expectedEventDigest = null;
  try {
    expectedEventDigest = digestJson(records.map((record) => record?.observerEventDigest));
  } catch {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_TRACE_BINDING"));
  }
  const aggregateMatches = value.executions === records.length
    && value.killExecutions === killExecutions
    && value.swapExecutions === swapExecutions
    && value.recoveryExecutions === recoveryExecutions
    && value.observer?.eventCount === records.length
    && value.observer?.eventDigest === expectedEventDigest;
  if (!aggregateMatches) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_AGGREGATE_BINDING", {
      executions: records.length,
      killExecutions,
      swapExecutions,
      recoveryExecutions,
      eventDigest: expectedEventDigest,
    }));
  }

  if (value.productionBinary !== true || value.testMode !== false || value.mocked !== false) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_NOT_BLACK_BOX"));
  }
  if (value.partialStates !== 0 || value.unmanagedMutations !== 0 || value.hardPolicyViolations !== 0
    || value.observer?.overflow !== false || value.observer?.ambiguousLineage !== false) {
    failures.push(failure("AAS_VERIFIER_TRANSACTION_INVARIANT"));
  }

  return failures;
}

export function assertTransactionEvidenceSemantics(value, context) {
  const failures = transactionEvidenceFailures(value, context);
  if (failures.length) {
    throw Object.assign(new Error("Transaction evidence semantic validation failed"), {
      code: failures[0].code,
      failures,
    });
  }
  return value;
}
