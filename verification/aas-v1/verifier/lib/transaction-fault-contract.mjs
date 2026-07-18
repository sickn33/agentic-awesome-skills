import crypto from "node:crypto";

export function isTransientTraversalError(error) {
  return ["ENOENT", "ENOTDIR"].includes(error?.code);
}

export function expectedRecoveryId(planDigest, targetIdentityDigest) {
  const value = crypto.createHash("sha256").update(`${planDigest}:${targetIdentityDigest}`).digest("hex");
  return `recovery-${value.slice(0, 48)}`;
}

export function validateObservedLockRecord(record, expected) {
  if (!record || typeof record !== "object" || Array.isArray(record)
    || !expected || !Number.isSafeInteger(expected.pid) || expected.pid <= 0) return false;
  const directories = record.plannedDirectories;
  const recoveryId = expectedRecoveryId(expected.planDigest, expected.targetIdentityDigest);
  const plannedDirectories = Array.isArray(expected.plannedDirectories) ? expected.plannedDirectories : [];
  return record.schemaVersion === 1
    && record.kind === "apply"
    && record.pid === expected.pid
    && /^[a-f0-9]{48}$/.test(record.token || "")
    && record.planDigest === expected.planDigest
    && record.targetIdentityDigest === expected.targetIdentityDigest
    && record.recoveryId === recoveryId
    && record.journalName === `.aas-transaction-${recoveryId}.wal`
    && Array.isArray(directories)
    && directories.every((value) => typeof value === "string"
      && value.length > 0 && !value.includes("\\") && !value.startsWith("/")
      && !value.split("/").includes(".."))
    && new Set(directories).size === directories.length
    && JSON.stringify(directories) === JSON.stringify(plannedDirectories);
}
