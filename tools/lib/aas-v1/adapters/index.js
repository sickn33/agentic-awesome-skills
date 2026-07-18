"use strict";

const crypto = require("node:crypto");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { canonicalJson } = require("../canonical-json");
const { buildClaudeText, inspectClaudeBytes } = require("./claude");
const { buildCodexText, inspectCodexBytes } = require("./codex");
const { HostConfigError, hostConfigError } = require("./errors");
const {
  assertExplicitAbsolutePath,
  assertOwned,
  assertSafeDirectory,
  assertWindowsPrivatePath,
  copyWindowsAcl,
  currentUid,
  digest,
  fsyncDirectory,
  hardenWindowsPrivatePath,
  inspectRegularFile,
  sameIdentity,
  writeExclusiveSynced,
} = require("./safety");
const { normalizeServer } = require("./values");

const PRIVATE = new WeakMap();
const HOSTS = new Set(["codex", "claude"]);
const SCOPES = new Set(["project", "user"]);

function validateHostScope(host, scope) {
  if (!HOSTS.has(host)) throw hostConfigError("AAS_ADAPTER_HOST_UNSUPPORTED", "invalidInput", { host });
  if (!SCOPES.has(scope)) throw hostConfigError("AAS_ADAPTER_SCOPE_INVALID", "invalidInput", { scope });
}

function parentIdentity(parent) {
  const stat = parent.stat;
  return { dev: stat.dev, ino: stat.ino, uid: stat.uid, gid: stat.gid, mode: stat.mode & 0o7777 };
}

function publicInspection(host, scope, snapshot, inspection) {
  return Object.freeze({
    schemaVersion: 1,
    host,
    scope,
    configPath: snapshot.path,
    exists: snapshot.exists,
    digest: snapshot.digest,
    mode: snapshot.identity?.mode ?? null,
    sectionPresent: inspection.sectionPresent,
    configured: inspection.configured,
    unknownKeys: Object.freeze([...inspection.unknownKeys]),
  });
}

async function inspectHostConfig({ host, scope, configPath }) {
  validateHostScope(host, scope);
  const snapshot = await inspectRegularFile(configPath);
  const inspection = host === "codex" ? inspectCodexBytes(snapshot.bytes) : inspectClaudeBytes(snapshot.bytes);
  return publicInspection(host, scope, snapshot, inspection);
}

async function buildPatch({ host, scope, configPath, server }) {
  validateHostScope(host, scope);
  const desired = normalizeServer(host, server);
  const snapshot = await inspectRegularFile(configPath);
  const built = host === "codex" ? buildCodexText(snapshot.bytes, desired) : buildClaudeText(snapshot.bytes, desired);
  const nextBytes = Buffer.from(built.text, "utf8");
  const nextDigest = digest(nextBytes);
  const changed = snapshot.digest !== nextDigest;
  const patch = {
    schemaVersion: 1,
    host,
    scope,
    configPath: snapshot.path,
    status: changed ? "changesProposed" : "alreadyConfigured",
    changed,
    exists: snapshot.exists,
    currentDigest: snapshot.digest,
    nextDigest,
    redactedDiff: Object.freeze({
      schemaVersion: 1,
      changedPaths: Object.freeze([...built.changedPaths].sort()),
      valuesRedacted: true,
      envValuesRedacted: true,
    }),
    inspection: publicInspection(host, scope, snapshot, built.inspection),
  };
  Object.freeze(patch);
  PRIVATE.set(patch, {
    currentBytes: snapshot.bytes,
    nextBytes,
    identity: snapshot.identity,
    parentIdentity: parentIdentity(snapshot.parent),
  });
  return patch;
}

function previewPatch(patch) {
  if (!PRIVATE.has(patch)) throw hostConfigError("AAS_ADAPTER_PATCH_INVALID", "invalidInput");
  return patch;
}

async function acquireLock(lockPath, payload) {
  try {
    const handle = await fsp.open(lockPath, "wx", 0o600);
    try {
      hardenWindowsPrivatePath(lockPath, false);
      await handle.writeFile(`${canonicalJson(payload)}\n`);
      await handle.chmod(0o600);
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (error.code === "EEXIST") throw hostConfigError("AAS_ADAPTER_LOCKED", "conflict");
    throw error;
  }
}

async function releaseLock(lockPath) {
  try { await fsp.unlink(lockPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
  await fsyncDirectory(path.dirname(lockPath));
}

async function ensureBackupDirectory(backupDirectory) {
  const absolute = assertExplicitAbsolutePath(backupDirectory, "AAS_ADAPTER_BACKUP_PATH_INVALID");
  const existing = assertSafeDirectory(absolute, { allowMissing: true });
  if (existing.exists) {
    if (process.platform !== "win32" && (existing.stat.mode & 0o077) !== 0) throw hostConfigError("AAS_ADAPTER_BACKUP_DIRECTORY_PERMISSIONS", "filesystem");
    if (process.platform === "win32") assertWindowsPrivatePath(existing.path);
    return absolute;
  }
  assertSafeDirectory(path.dirname(absolute));
  try {
    await fsp.mkdir(absolute, { mode: 0o700 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const created = assertSafeDirectory(absolute);
  await fsp.chmod(created.path, 0o700);
  if (process.platform === "win32") hardenWindowsPrivatePath(created.path, true);
  await fsyncDirectory(path.dirname(created.path));
  return created.path;
}

function safeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw hostConfigError("AAS_ADAPTER_TIMESTAMP_INVALID", "invalidInput");
  return date.toISOString().replace(/[:.]/g, "-");
}

function configKey(configPath) {
  return digest(Buffer.from(configPath)).slice("sha256-".length, "sha256-".length + 24);
}

async function createBackup({ patch, snapshot, backupDirectory, retention, now }) {
  if (!Number.isInteger(retention) || retention < 1 || retention > 100) throw hostConfigError("AAS_ADAPTER_RETENTION_INVALID", "invalidInput");
  const directory = await ensureBackupDirectory(backupDirectory);
  const key = configKey(patch.configPath);
  const stem = `${key}-${safeTimestamp(now)}-${snapshot.digest.slice(-12)}`;
  const backupFile = `${stem}.bak`;
  const metadataFile = `${stem}.json`;
  const backupPath = path.join(directory, backupFile);
  const metadataPath = path.join(directory, metadataFile);
  try {
    await writeExclusiveSynced(backupPath, snapshot.bytes, 0o600);
    const metadata = {
      schemaVersion: 1,
      host: patch.host,
      scope: patch.scope,
      configKey: key,
      configBasename: path.basename(patch.configPath),
      backupFile,
      sourceDigest: snapshot.digest,
      sourceMode: snapshot.identity.mode,
      sourceUid: snapshot.identity.uid,
      sourceGid: snapshot.identity.gid,
      createdAt: (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString(),
      retention: { maxEntries: retention, enforcement: "explicit-cleanup" },
    };
    await writeExclusiveSynced(metadataPath, Buffer.from(`${canonicalJson(metadata)}\n`), 0o600);
    await fsyncDirectory(directory);
    return Object.freeze({ backupPath, metadataPath, sourceDigest: snapshot.digest });
  } catch (error) {
    await Promise.allSettled([fsp.unlink(backupPath), fsp.unlink(metadataPath)]);
    throw error;
  }
}

async function assertSnapshotUnchanged(patch, internal) {
  const current = await inspectRegularFile(patch.configPath);
  if (current.exists !== patch.exists || current.digest !== patch.currentDigest || !sameIdentity(current.identity, internal.identity)) {
    throw hostConfigError("AAS_ADAPTER_CONFIG_CHANGED", "conflict");
  }
  if (!sameIdentity(parentIdentity(current.parent), internal.parentIdentity)) {
    throw hostConfigError("AAS_ADAPTER_DIRECTORY_CHANGED", "conflict");
  }
  return current;
}

async function applyHostConfigPatch({ patch, approved = false, backupDirectory, retention = 5, now } = {}) {
  const internal = PRIVATE.get(patch);
  if (!internal) throw hostConfigError("AAS_ADAPTER_PATCH_INVALID", "invalidInput");
  if (!approved) throw hostConfigError("AAS_ADAPTER_APPROVAL_REQUIRED", "policy");
  if (!patch.changed) return Object.freeze({ status: "alreadyConfigured", configDigest: patch.currentDigest, backup: null });
  if (patch.exists && typeof backupDirectory !== "string") throw hostConfigError("AAS_ADAPTER_BACKUP_REQUIRED", "policy");

  const directory = path.dirname(patch.configPath);
  const lockPath = path.join(directory, `.${path.basename(patch.configPath)}.aas.lock`);
  const lockPayload = { schemaVersion: 1, pid: process.pid, createdAt: new Date().toISOString(), configKey: configKey(patch.configPath) };
  await acquireLock(lockPath, lockPayload);
  let stagePath;
  try {
    let current = await assertSnapshotUnchanged(patch, internal);
    const backup = current.exists ? await createBackup({ patch, snapshot: current, backupDirectory, retention, now }) : null;
    stagePath = path.join(directory, `.${path.basename(patch.configPath)}.aas-stage-${process.pid}-${crypto.randomBytes(12).toString("hex")}`);
    const targetMode = current.exists ? current.identity.mode : 0o600;
    const handle = await fsp.open(stagePath, "wx", targetMode);
    try {
      // A newly created Windows file inherits its parent DACL regardless of
      // the POSIX mode. Install the approved target ACL while the stage is
      // still empty, before writing configuration bytes.
      if (process.platform === "win32") {
        if (current.exists) copyWindowsAcl(patch.configPath, stagePath);
        else hardenWindowsPrivatePath(stagePath, false);
      }
      await handle.writeFile(internal.nextBytes);
      await handle.chmod(targetMode);
      if (current.exists && currentUid() !== null) await handle.chown(current.identity.uid, current.identity.gid);
      await handle.sync();
    } finally {
      await handle.close();
    }
    current = await assertSnapshotUnchanged(patch, internal);
    await fsp.rename(stagePath, patch.configPath);
    stagePath = null;
    await fsyncDirectory(directory);
    const written = await inspectRegularFile(patch.configPath, { allowMissing: false });
    if (written.digest !== patch.nextDigest || (process.platform !== "win32" && written.identity.mode !== targetMode)) {
      throw hostConfigError("AAS_ADAPTER_WRITE_VERIFICATION_FAILED", "execution");
    }
    return Object.freeze({ status: "applied", configDigest: written.digest, backup });
  } finally {
    if (stagePath) await fsp.unlink(stagePath).catch((error) => { if (error.code !== "ENOENT") throw error; });
    await releaseLock(lockPath);
  }
}

async function readBackupRecords({ backupDirectory, configPath, keep }) {
  if (!Number.isInteger(keep) || keep < 0 || keep > 100) throw hostConfigError("AAS_ADAPTER_RETENTION_INVALID", "invalidInput");
  const backup = assertSafeDirectory(backupDirectory);
  if (process.platform !== "win32" && (backup.stat.mode & 0o077) !== 0) throw hostConfigError("AAS_ADAPTER_BACKUP_DIRECTORY_PERMISSIONS", "filesystem");
  const directory = backup.path;
  const absoluteConfig = assertExplicitAbsolutePath(configPath);
  const key = configKey(absoluteConfig);
  const names = (await fsp.readdir(directory)).filter((name) => name.startsWith(`${key}-`) && name.endsWith(".json")).sort().reverse();
  const records = [];
  for (const name of names) {
    const metadataPath = path.join(directory, name);
    const stat = await fsp.lstat(metadataPath);
    if (stat.isSymbolicLink() || !stat.isFile() || (process.platform !== "win32" && (stat.mode & 0o777) !== 0o600)) throw hostConfigError("AAS_ADAPTER_BACKUP_UNSAFE", "filesystem");
    assertOwned(stat, undefined, metadataPath);
    if (process.platform === "win32") assertWindowsPrivatePath(metadataPath);
    const bytes = await fsp.readFile(metadataPath);
    if (bytes.length > 32 * 1024) throw hostConfigError("AAS_ADAPTER_BACKUP_UNSAFE", "filesystem");
    let metadata;
    try { metadata = JSON.parse(bytes.toString("utf8")); } catch { throw hostConfigError("AAS_ADAPTER_BACKUP_UNSAFE", "filesystem"); }
    if (metadata.configKey !== key || typeof metadata.backupFile !== "string" || path.basename(metadata.backupFile) !== metadata.backupFile) {
      throw hostConfigError("AAS_ADAPTER_BACKUP_UNSAFE", "filesystem");
    }
    const backupPath = path.join(directory, metadata.backupFile);
    const backupStat = await fsp.lstat(backupPath);
    if (backupStat.isSymbolicLink() || !backupStat.isFile() || (process.platform !== "win32" && (backupStat.mode & 0o777) !== 0o600)) throw hostConfigError("AAS_ADAPTER_BACKUP_UNSAFE", "filesystem");
    assertOwned(backupStat, undefined, backupPath);
    if (process.platform === "win32") assertWindowsPrivatePath(backupPath);
    const backupBytes = await fsp.readFile(backupPath);
    if (digest(backupBytes) !== metadata.sourceDigest) throw hostConfigError("AAS_ADAPTER_BACKUP_UNSAFE", "filesystem");
    records.push({
      metadata,
      metadataPath,
      backupPath,
      approvalRecord: {
        metadataNameDigest: digest(Buffer.from(name)),
        backupNameDigest: digest(Buffer.from(metadata.backupFile)),
        metadataDigest: digest(bytes),
        backupDigest: digest(backupBytes),
      },
    });
  }
  const approvalPayload = {
    schemaVersion: 1,
    action: "mcp.backups.cleanup",
    backupDirectoryDigest: digest(Buffer.from(directory)),
    configPathDigest: digest(Buffer.from(absoluteConfig)),
    keep,
    records: records.map((record) => record.approvalRecord),
  };
  return { directory, key, records, approvalDigest: digest(Buffer.from(canonicalJson(approvalPayload))) };
}

async function previewBackupCleanup({ backupDirectory, configPath, keep } = {}) {
  const inspected = await readBackupRecords({ backupDirectory, configPath, keep });
  return Object.freeze({
    schemaVersion: 1,
    status: inspected.records.length > keep ? "changesProposed" : "nothingToClean",
    approvalDigest: inspected.approvalDigest,
    retained: Math.min(keep, inspected.records.length),
    removeCount: Math.max(0, inspected.records.length - keep),
  });
}

async function cleanupBackups({ backupDirectory, configPath, keep, approved = false, approvalDigest } = {}) {
  if (!approved && !approvalDigest) throw hostConfigError("AAS_ADAPTER_APPROVAL_REQUIRED", "policy");
  const preview = await readBackupRecords({ backupDirectory, configPath, keep });
  if (approvalDigest && approvalDigest !== preview.approvalDigest) throw hostConfigError("AAS_ADAPTER_APPROVAL_MISMATCH", "policy");
  const { directory, key } = preview;
  const lockPath = path.join(directory, `.cleanup-${key}.lock`);
  await acquireLock(lockPath, { schemaVersion: 1, pid: process.pid, configKey: key, createdAt: new Date().toISOString() });
  try {
    const locked = await readBackupRecords({ backupDirectory, configPath, keep });
    if (locked.approvalDigest !== preview.approvalDigest) throw hostConfigError("AAS_ADAPTER_BACKUP_CHANGED", "conflict");
    const removed = [];
    for (const record of locked.records.slice(keep)) {
      await fsp.unlink(record.backupPath);
      await fsp.unlink(record.metadataPath);
      removed.push(path.basename(record.backupPath));
    }
    await fsyncDirectory(directory);
    return Object.freeze({ status: "cleaned", retained: Math.min(keep, locked.records.length), removed: Object.freeze(removed) });
  } finally {
    await releaseLock(lockPath);
  }
}

module.exports = {
  HostConfigError,
  applyHostConfigPatch,
  buildPatch,
  cleanupBackups,
  inspectHostConfig,
  previewBackupCleanup,
  previewPatch,
};
