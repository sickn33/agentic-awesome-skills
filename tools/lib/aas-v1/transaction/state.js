"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { fsyncDirectorySync } = require("../durability");
const { canonicalJson, sha256 } = require("../canonical-json");
const { transactionError } = require("./errors");
const { validateInstance } = require("../schema-validator");

function compareStrings(left, right) {
  return left < right ? -1 : (left > right ? 1 : 0);
}

function publicEntries(entries) {
  return entries.map(({ skillId, treeDigest, catalogIntegrity }) => ({ skillId, treeDigest, catalogIntegrity }))
    .sort((left, right) => compareStrings(left.skillId, right.skillId));
}

function digestManagedEntries(entries) {
  return sha256(canonicalJson({ schemaVersion: 1, entries: publicEntries(entries) }));
}

function buildManagedState({ target, catalog, entries, completedPlanDigests }) {
  const normalizedEntries = entries.map((entry) => ({ ...entry }))
    .sort((left, right) => compareStrings(left.skillId, right.skillId));
  const state = {
    schemaVersion: 1,
    target: { ...target },
    catalog: { ...catalog },
    entries: normalizedEntries,
    completedPlanDigests: [...new Set(completedPlanDigests)].sort(compareStrings).slice(-256),
    stateDigest: digestManagedEntries(normalizedEntries),
  };
  return state;
}

function readManagedState(stateFile) {
  if (!fs.existsSync(stateFile)) return null;
  const stat = fs.lstatSync(stateFile);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1 || stat.size > 1024 * 1024) {
    throw transactionError("AAS_TRANSACTION_STATE_UNSAFE", "filesystem", {});
  }
  let state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch (cause) {
    throw transactionError("AAS_TRANSACTION_STATE_CORRUPT", "integrity", {}, cause);
  }
  if (!state || state.schemaVersion !== 1 || !Array.isArray(state.entries) || !Array.isArray(state.completedPlanDigests)) {
    throw transactionError("AAS_TRANSACTION_STATE_CORRUPT", "integrity", {});
  }
  validateInstance("managed-state.schema.json", state, "AAS_TRANSACTION_STATE_SCHEMA_INVALID");
  const ids = new Set();
  for (const entry of state.entries) {
    if (!entry || typeof entry.skillId !== "string" || ids.has(entry.skillId)
      || typeof entry.treeDigest !== "string" || typeof entry.catalogIntegrity !== "string"
      || typeof entry.installedByPlanDigest !== "string") {
      throw transactionError("AAS_TRANSACTION_STATE_CORRUPT", "integrity", {});
    }
    ids.add(entry.skillId);
  }
  if (state.stateDigest !== digestManagedEntries(state.entries)) {
    throw transactionError("AAS_TRANSACTION_STATE_DIGEST_MISMATCH", "integrity", {});
  }
  return state;
}

function fsyncDirectory(directory) {
  fsyncDirectorySync(directory);
}

function writeFileDurable(filePath, bytes, mode = 0o600) {
  const descriptor = fs.openSync(filePath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, mode);
  try {
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function atomicWriteManagedState(stateFile, state, transactionRoot) {
  const temporary = path.join(transactionRoot, "managed-state.next.json");
  if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  writeFileDurable(temporary, `${canonicalJson(state)}\n`);
  fs.renameSync(temporary, stateFile);
  fsyncDirectory(path.dirname(stateFile));
}

module.exports = {
  atomicWriteManagedState,
  buildManagedState,
  digestManagedEntries,
  fsyncDirectory,
  publicEntries,
  readManagedState,
  writeFileDurable,
};
