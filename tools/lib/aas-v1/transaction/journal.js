"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { canonicalJson, canonicalize, sha256 } = require("../canonical-json");
const { fsyncDirectory, writeFileDurable } = require("./state");
const { transactionError } = require("./errors");
const { validateInstance } = require("../schema-validator");

const MAX_JOURNAL_BYTES = 4 * 1024 * 1024;

function recoveryIdFor(planDigest, identityDigest) {
  return `recovery-${sha256(`${planDigest}:${identityDigest}`).slice(7, 55)}`;
}

function journalPath(layoutRoot, recoveryId) {
  if (!/^recovery-[a-f0-9]{32,64}$/.test(recoveryId)) {
    throw transactionError("AAS_TRANSACTION_JOURNAL_ID_INVALID", "invalidInput", {});
  }
  return path.join(layoutRoot, `.aas-transaction-${recoveryId}.wal`);
}

function digestRecords(records) {
  return sha256(canonicalJson(records));
}

function appendRecord(context, event, details = {}) {
  if (context.tornTailDigest) {
    throw transactionError("AAS_TRANSACTION_JOURNAL_TORN_TAIL", "recovery", {});
  }
  const previous = context.records.at(-1) || null;
  const body = canonicalize({
    schemaVersion: 1,
    recoveryId: context.recoveryId,
    sequence: context.records.length,
    event,
    planDigest: context.planDigest,
    targetIdentityDigest: context.targetIdentityDigest,
    details,
    previousRecordDigest: previous ? previous.recordDigest : null,
  });
  const record = { ...body, recordDigest: sha256(canonicalJson(body)) };
  const bytes = `${canonicalJson(record)}\n`;
  const descriptor = fs.openSync(context.path, fs.constants.O_APPEND | fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  context.records.push(record);
  context.validBytes += Buffer.byteLength(bytes);
  context.validBytesDigest = sha256(fs.readFileSync(context.path).subarray(0, context.validBytes));
  context.digest = digestRecords(context.records);
  return record;
}

function createJournal(layoutRoot, recoveryId, planDigest, targetIdentityDigest) {
  const target = journalPath(layoutRoot, recoveryId);
  const temporary = `${target}.pending-${crypto.randomBytes(16).toString("hex")}`;
  if (fs.existsSync(target)) throw transactionError("AAS_TRANSACTION_RECOVERY_REQUIRED", "recovery", { recoveryId });
  const context = {
    recoveryId,
    planDigest,
    targetIdentityDigest,
    path: temporary,
    records: [],
    validBytes: 0,
    validBytesDigest: sha256(Buffer.alloc(0)),
    tornTailDigest: null,
  };
  try {
    writeFileDurable(temporary, "", 0o600);
    appendRecord(context, "started", {});
    fs.renameSync(temporary, target);
    fsyncDirectory(layoutRoot);
    context.path = target;
    return context;
  } catch (cause) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
    throw cause;
  }
}

function readJournalFile(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.size > MAX_JOURNAL_BYTES) {
    throw transactionError("AAS_TRANSACTION_JOURNAL_UNSAFE", "filesystem", {});
  }
  const bytes = fs.readFileSync(target);
  const finalNewline = bytes.length > 0 && bytes.at(-1) === 0x0a;
  const lastNewline = bytes.lastIndexOf(0x0a);
  const validBytes = finalNewline ? bytes.length : (lastNewline < 0 ? 0 : lastNewline + 1);
  const validText = bytes.subarray(0, validBytes).toString("utf8");
  let records;
  try {
    records = validText.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch (cause) {
    throw transactionError("AAS_TRANSACTION_JOURNAL_CORRUPT", "integrity", {}, cause);
  }
  if (!records.length) throw transactionError("AAS_TRANSACTION_JOURNAL_CORRUPT", "integrity", {});
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    validateInstance("journal.schema.json", record, "AAS_TRANSACTION_JOURNAL_SCHEMA_INVALID");
    const { recordDigest, ...body } = record || {};
    if (record.sequence !== index || record.previousRecordDigest !== (index ? records[index - 1].recordDigest : null)
      || recordDigest !== sha256(canonicalJson(body)) || record.recoveryId !== records[0].recoveryId
      || record.planDigest !== records[0].planDigest || record.targetIdentityDigest !== records[0].targetIdentityDigest) {
      throw transactionError("AAS_TRANSACTION_JOURNAL_CORRUPT", "integrity", {});
    }
  }
  const tornTail = bytes.subarray(validBytes);
  return {
    recoveryId: records[0].recoveryId,
    planDigest: records[0].planDigest,
    targetIdentityDigest: records[0].targetIdentityDigest,
    path: target,
    records,
    digest: digestRecords(records),
    validBytes,
    validBytesDigest: sha256(bytes.subarray(0, validBytes)),
    tornTailDigest: tornTail.length ? sha256(tornTail) : null,
  };
}

function readJournal(layoutRoot, recoveryId) {
  return readJournalFile(journalPath(layoutRoot, recoveryId));
}

function journalCheckpoint(journal) {
  return canonicalize({
    recordCount: journal.records.length,
    recordsDigest: journal.digest,
    validBytes: journal.validBytes,
    validBytesDigest: journal.validBytesDigest,
    tornTailDigest: journal.tornTailDigest,
  });
}

function verifyCheckpoint(journal, checkpoint) {
  if (!checkpoint || !Number.isSafeInteger(checkpoint.recordCount) || checkpoint.recordCount < 1
    || !Number.isSafeInteger(checkpoint.validBytes) || checkpoint.validBytes < 1
    || journal.records.length < checkpoint.recordCount || journal.validBytes < checkpoint.validBytes) {
    throw transactionError("AAS_RECOVERY_JOURNAL_DRIFT", "drift", {});
  }
  const prefix = journal.records.slice(0, checkpoint.recordCount);
  const raw = fs.readFileSync(journal.path).subarray(0, checkpoint.validBytes);
  if (digestRecords(prefix) !== checkpoint.recordsDigest || sha256(raw) !== checkpoint.validBytesDigest) {
    throw transactionError("AAS_RECOVERY_JOURNAL_DRIFT", "drift", {});
  }
  if (journal.records.length === checkpoint.recordCount && journal.tornTailDigest !== (checkpoint.tornTailDigest || null)) {
    throw transactionError("AAS_RECOVERY_JOURNAL_DRIFT", "drift", {});
  }
  return true;
}

function repairTornTail(journal, checkpoint) {
  verifyCheckpoint(journal, checkpoint);
  if (!journal.tornTailDigest) return journal;
  if (journal.records.length !== checkpoint.recordCount) {
    throw transactionError("AAS_RECOVERY_JOURNAL_DRIFT", "drift", {});
  }
  const descriptor = fs.openSync(journal.path, fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    fs.ftruncateSync(descriptor, checkpoint.validBytes);
    fs.fsyncSync(descriptor);
  } finally { fs.closeSync(descriptor); }
  fsyncDirectory(path.dirname(journal.path));
  return readJournalFile(journal.path);
}

function truncateTornTail(journal) {
  if (!journal.tornTailDigest) return journal;
  const descriptor = fs.openSync(journal.path, fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    fs.ftruncateSync(descriptor, journal.validBytes);
    fs.fsyncSync(descriptor);
  } finally { fs.closeSync(descriptor); }
  fsyncDirectory(path.dirname(journal.path));
  return readJournalFile(journal.path);
}

function removeJournal(journal) {
  const observed = readJournalFile(journal.path);
  if (observed.recoveryId !== journal.recoveryId || observed.planDigest !== journal.planDigest) {
    throw transactionError("AAS_TRANSACTION_JOURNAL_DRIFT", "drift", {});
  }
  fs.unlinkSync(journal.path);
  fsyncDirectory(path.dirname(journal.path));
}

function listJournalIds(layoutRoot) {
  return fs.readdirSync(layoutRoot)
    .map((name) => /^\.aas-transaction-(recovery-[a-f0-9]{32,64})\.wal$/.exec(name))
    .filter(Boolean)
    .map((match) => match[1])
    .sort();
}

function journalEvents(journal) {
  return new Set(journal.records.map((record) => record.event));
}

module.exports = {
  appendRecord,
  createJournal,
  journalCheckpoint,
  journalEvents,
  journalPath,
  listJournalIds,
  readJournal,
  readJournalFile,
  recoveryIdFor,
  removeJournal,
  repairTornTail,
  truncateTornTail,
  verifyCheckpoint,
};
