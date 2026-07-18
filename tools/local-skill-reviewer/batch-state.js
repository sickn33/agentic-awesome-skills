"use strict";

const crypto = require("crypto");
const fs = require("fs");
const { atomicWriteJson, canonicalJson } = require("./cache");
const { resolveOutputPath } = require("./output");
const { readBoundedRegular } = require("./safe-io");
const { secretLike } = require("./secret");

const STATUSES = new Set(["pending", "running", "completed", "failed"]);

function manifestIdentity(manifest) {
  return crypto.createHash("sha256").update(canonicalJson({ manifestVersion: manifest.manifestVersion, skills: manifest.skills.map((item) => ({ id: item.id, bundleHash: item.bundleHash || null })) })).digest("hex");
}

function freshState(manifest) {
  return {
    schemaVersion: 2,
    manifestVersion: manifest.manifestVersion,
    manifestIdentity: manifestIdentity(manifest),
    stopState: "ready",
    items: Object.fromEntries(manifest.skills.map(({ id }) => [id, { status: "pending", attempts: 0 }])),
  };
}

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !allowed.has(key))) throw new Error(`${label} schema invalid`);
}

function validateStateItem(item) {
  exactKeys(item, new Set(["status", "attempts", "cacheKey", "bundleHash", "error"]), "Batch state item");
  if (!STATUSES.has(item.status) || !Number.isInteger(item.attempts) || item.attempts < 0) throw new Error("Batch state item invalid");
  for (const field of ["cacheKey", "bundleHash"]) if (item[field] !== undefined && !/^[0-9a-f]{64}$/.test(item[field])) throw new Error(`Batch state ${field} invalid`);
  if (item.error !== undefined && (typeof item.error !== "string" || !item.error || Buffer.byteLength(item.error, "utf8") > 500 || secretLike(item.error))) throw new Error("Batch state error invalid");
  if (item.status === "completed" && (!item.cacheKey || !item.bundleHash || item.error !== undefined)) throw new Error("Completed batch state item binding invalid");
  if (item.status === "failed" && !item.error) throw new Error("Failed batch state item error missing");
  if (["pending", "running"].includes(item.status) && (item.cacheKey !== undefined || item.bundleHash !== undefined || item.error !== undefined)) throw new Error("Incomplete batch state item contains terminal data");
  return true;
}

function validateState(state, manifest) {
  exactKeys(state, new Set(["schemaVersion", "manifestVersion", "manifestIdentity", "stopState", "items"]), "Batch state");
  if (!state || state.schemaVersion !== 2 || state.manifestVersion !== manifest.manifestVersion || state.manifestIdentity !== manifestIdentity(manifest)) throw new Error("Batch state manifest mismatch");
  if (!new Set(["ready", "running", "completed", "failed", "interrupted"]).has(state.stopState)) throw new Error("Batch state stop state invalid");
  const expected = manifest.skills.map((item) => item.id).sort();
  if (Object.keys(state.items || {}).sort().join("\0") !== expected.join("\0")) throw new Error("Batch state item set mismatch");
  for (const item of Object.values(state.items)) validateStateItem(item);
  return true;
}

function loadOrCreateState(outputRoot, relativePath, manifest) {
  let state;
  try {
    const target = resolveOutputPath(outputRoot, relativePath);
    state = JSON.parse(readBoundedRegular(target, 4 * 1024 * 1024, "Batch state").toString("utf8"));
    validateState(state, manifest);
  } catch (error) {
    if (error.code !== "ENOENT" && !/Unexpected end of JSON input/.test(error.message)) throw error;
    state = freshState(manifest);
  }
  for (const item of Object.values(state.items)) if (item.status === "running") item.status = "pending";
  state.stopState = "running";
  atomicWriteJson(outputRoot, relativePath, state);
  return state;
}

function transition(outputRoot, relativePath, state, skillId, next, details = {}) {
  const current = state.items[skillId];
  const allowed = { pending: new Set(["running"]), running: new Set(["completed", "failed"]), failed: new Set(["running"]), completed: new Set(["running"]) };
  if (!current || !allowed[current.status]?.has(next)) throw new Error(`Invalid batch transition: ${current?.status} -> ${next}`);
  if (Object.keys(details).some((key) => !new Set(["cacheKey", "bundleHash", "error"]).has(key))) throw new Error("Batch transition details invalid");
  const attempts = next === "running" ? current.attempts + 1 : current.attempts;
  state.items[skillId] = next === "running" ? { status: next, attempts } : { ...details, status: next, attempts };
  validateStateItem(state.items[skillId]);
  atomicWriteJson(outputRoot, relativePath, state);
}

function setStopState(outputRoot, relativePath, state, stopState) {
  if (!["running", "completed", "failed", "interrupted"].includes(stopState)) throw new Error("Invalid stop state");
  state.stopState = stopState;
  atomicWriteJson(outputRoot, relativePath, state);
}

function summary(state) {
  const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
  for (const item of Object.values(state.items)) counts[item.status] += 1;
  return counts;
}

module.exports = { freshState, loadOrCreateState, manifestIdentity, setStopState, summary, transition, validateState, validateStateItem };
