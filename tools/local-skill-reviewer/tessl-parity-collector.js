#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { atomicWriteJson, canonicalJson } = require("./cache");
const { ensureOutputRoot, resolveOutputPath } = require("./output");
const { validateParityManifest } = require("./parity-benchmark");
const { artifactName, readBoundedRegular } = require("./safe-io");
const { discoverBundle, disposeSnapshot, materializeBundle, sha256, trackedFiles } = require("./safe-bundle");

const execFileAsync = promisify(execFile);
const WORKSPACE = "019f1c57-2d90-72cd-b477-f452fd852e62";
const ORG = "019f1c56-d131-702d-8f36-69ae1aa5555c";
const PLUGIN = "tessl/default-skill-review@0.1.0";
const EXPECTED_AGENT = "claude";
const EXPECTED_MODEL = "glm-5.2";
const EXPECTED_CLI_VERSION = "0.91.0";
const REVIEW_CREDIT_COST = 10;
const DIMENSIONS = Object.freeze({
  description: ["specificity", "trigger_term_quality", "completeness", "distinctiveness_conflict_risk"],
  content: ["conciseness", "actionability", "workflow_clarity", "progressive_disclosure"],
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) throw new Error(`${label} schema is not closed`);
}

function parseJson(text, label) {
  if (typeof text !== "string" || Buffer.byteLength(text) > 16 * 1024 * 1024) throw new Error(`${label} JSON exceeds boundary`);
  try { return JSON.parse(text); } catch { throw new Error(`${label} did not return valid JSON`); }
}

function readJson(filePath, label, max = 16 * 1024 * 1024) {
  return JSON.parse(readBoundedRegular(filePath, max, label).toString("utf8"));
}

function validatePredictions(value, manifest, expectedHash, bytes) {
  if (!/^[0-9a-f]{64}$/.test(expectedHash || "")) throw new Error("final_blind requires --predictions-sha256");
  if (sha256(bytes) !== expectedHash) throw new Error("Pre-reveal predictions hash mismatch");
  exactKeys(value, ["schemaVersion", "kind", "manifestSelectionSha256", "split", "predictions"], "Pre-reveal predictions");
  if (value.schemaVersion !== 1 || value.kind !== "aas-tessl-parity-pre-reveal-predictions" || value.split !== "final_blind" || value.manifestSelectionSha256 !== manifest.integrity.selectionSha256) throw new Error("Pre-reveal predictions provenance mismatch");
  exactKeys(value.predictions, manifest.splits.final_blind.map((item) => item.id), "Pre-reveal prediction IDs");
  for (const [id, prediction] of Object.entries(value.predictions)) {
    exactKeys(prediction, ["score", "description", "content"], `Prediction ${id}`);
    if (!Number.isInteger(prediction.score) || prediction.score < 0 || prediction.score > 100) throw new Error(`Prediction score invalid: ${id}`);
    for (const kind of Object.keys(DIMENSIONS)) if (!Array.isArray(prediction[kind]) || prediction[kind].length !== 4 || prediction[kind].some((score) => !Number.isInteger(score) || score < 1 || score > 3)) throw new Error(`Prediction labels invalid: ${id}/${kind}`);
  }
  return value;
}

function validateCredits(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !raw.data || typeof raw.data !== "object" || !raw.data.attributes || typeof raw.data.attributes !== "object") throw new Error("Credit response schema unsupported");
  const credits = raw.data.attributes.credits;
  exactKeys(credits, ["state", "limit", "used", "remaining", "windowStart", "overLimit", "blocked", "overageAllowed"], "Credits");
  if (typeof credits.state !== "string" || !Number.isFinite(credits.limit) || credits.limit < 0 || !Number.isFinite(credits.used) || credits.used < 0 || !Number.isFinite(credits.remaining) || credits.remaining < 0 || typeof credits.windowStart !== "string" || !Number.isFinite(Date.parse(credits.windowStart)) || [credits.overLimit, credits.blocked, credits.overageAllowed].some((item) => typeof item !== "boolean")) throw new Error("Credit values invalid");
  return credits;
}

function extractRunId(raw) {
  const id = raw?.reviewRunId || raw?.data?.id;
  if (!UUID.test(id || "")) throw new Error(`Submission JSON has unsupported keys: ${Object.keys(raw || {}).sort().join(",")}`);
  return id;
}

function statusOf(raw) { return raw?.status || raw?.attributes?.status || raw?.review?.status || raw?.data?.attributes?.status || null; }

function metadataEntry(raw, runId) {
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : null;
  if (!rows) throw new Error("Review list JSON schema unsupported");
  const entry = rows.find((item) => (item?.reviewRunId || item?.id || item?.data?.id) === runId);
  if (!entry) throw new Error(`Review list is missing run ${runId}`);
  return entry;
}

function firstDefined(...values) { return values.find((value) => value !== undefined); }

function verifyMetadata(entry, { runId, label }) {
  const attrs = entry?.attributes || entry?.data?.attributes || entry;
  const config = attrs?.config || attrs?.reviewConfig || {};
  const metadata = attrs?.metadata || {};
  const reusedFrom = firstDefined(attrs?.reusedFromReviewRunId, metadata?.reusedFromReviewRunId);
  const observed = {
    runId: firstDefined(entry?.reviewRunId, entry?.id, entry?.data?.id),
    label: firstDefined(attrs?.label, metadata?.label, metadata?.pathLabel),
    status: firstDefined(attrs?.status, metadata?.status),
    agent: firstDefined(config?.agent, attrs?.agent, metadata?.agent),
    model: firstDefined(config?.model, attrs?.model, metadata?.model),
    plugin: firstDefined(config?.reviewPlugin, config?.["review-plugin"], config?.pluginRef, config?.reviewPluginName, attrs?.reviewPlugin, attrs?.["review-plugin"], metadata?.reviewPlugin),
    reusedFrom: reusedFrom === undefined ? null : reusedFrom,
  };
  if (observed.runId !== runId || observed.label !== label || observed.status !== "completed" || observed.agent !== EXPECTED_AGENT || observed.model !== EXPECTED_MODEL || observed.plugin !== PLUGIN || observed.reusedFrom !== null) throw new Error(`Review metadata mismatch: ${canonicalJson(observed)}`);
  return observed;
}

function normalize(raw, context, observed, listEntry) {
  const review = raw?.review || raw?.data?.attributes?.review;
  const judges = raw?.judges || review?.judges;
  const validation = raw?.validation || review?.validation;
  const reviewRunId = raw?.reviewRunId || raw?.data?.id;
  if (reviewRunId !== context.runId || raw?.["review-plugin"] !== PLUGIN || !review || !judges || !validation) throw new Error("Completed review JSON schema unsupported");
  const score = review.reviewScore;
  if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error("Review score invalid");
  const labels = {};
  for (const [kind, dimensions] of Object.entries(DIMENSIONS)) {
    const judge = judges[kind];
    if (!judge || judge.success !== true || !judge.evaluation?.scores) throw new Error(`Judge missing or failed: ${kind}`);
    exactKeys(judge.evaluation.scores, dimensions, `${kind} dimension scores`);
    labels[kind] = dimensions.map((dimension) => {
      const item = judge.evaluation.scores[dimension];
      if (!item || !Number.isInteger(item.score) || item.score < 1 || item.score > 3) throw new Error(`Dimension score invalid: ${kind}/${dimension}`);
      return item.score;
    });
  }
  const warnings = Array.isArray(validation.warnings) ? validation.warnings.length : firstDefined(validation.warningCount, validation.warnings, 0);
  const errors = Array.isArray(validation.errors) ? validation.errors.length : firstDefined(validation.errorCount, validation.errors, 0);
  const totalChecks = validation.checks?.length;
  if (!Number.isInteger(warnings) || warnings < 0 || !Number.isInteger(errors) || errors < 0 || !Number.isInteger(totalChecks) || totalChecks < 1 || warnings + errors > totalChecks) throw new Error("Validation counts invalid");
  const attrs = listEntry?.attributes || listEntry?.data?.attributes || listEntry;
  const component = attrs?.results?.scoring?.components?.find((item) => item?.id === "validation");
  const validationNormalized = (totalChecks - errors - (0.5 * warnings)) / totalChecks;
  if (typeof component?.normalized !== "number" || Math.abs(component.normalized - validationNormalized) > 1e-12) throw new Error("Validation normalized score mismatch");
  return {
    schemaVersion: 1, kind: "aas-tessl-parity-labels", split: context.split, skillId: context.skill.id,
    bundleHash: context.skill.bundleHash, repeat: context.repeat, reviewRunId, label: context.label,
    score, validationNormalized, warnings, errors, totalChecks, description: labels.description, content: labels.content,
    agent: observed.agent, model: observed.model, reviewPlugin: observed.plugin, reusedFrom: observed.reusedFrom,
  };
}

function validateNormalized(value, context) {
  exactKeys(value, ["schemaVersion", "kind", "split", "skillId", "bundleHash", "repeat", "reviewRunId", "label", "score", "validationNormalized", "warnings", "errors", "totalChecks", "description", "content", "agent", "model", "reviewPlugin", "reusedFrom"], "Normalized labels");
  if (value.schemaVersion !== 1 || value.kind !== "aas-tessl-parity-labels" || value.split !== context.split || value.skillId !== context.skill.id || value.bundleHash !== context.skill.bundleHash || value.repeat !== context.repeat || value.label !== context.label || !UUID.test(value.reviewRunId) || value.agent !== EXPECTED_AGENT || value.model !== EXPECTED_MODEL || value.reviewPlugin !== PLUGIN || value.reusedFrom !== null) throw new Error("Normalized label binding mismatch");
  if (!Number.isInteger(value.score) || value.score < 0 || value.score > 100 || typeof value.validationNormalized !== "number" || value.validationNormalized < 0 || value.validationNormalized > 1 || !Number.isInteger(value.warnings) || value.warnings < 0 || !Number.isInteger(value.errors) || value.errors < 0 || !Number.isInteger(value.totalChecks) || value.totalChecks < 1 || value.warnings + value.errors > value.totalChecks || Math.abs(value.validationNormalized - ((value.totalChecks - value.errors - (0.5 * value.warnings)) / value.totalChecks)) > 1e-12) throw new Error("Normalized scalar invalid");
  for (const kind of Object.keys(DIMENSIONS)) if (!Array.isArray(value[kind]) || value[kind].length !== 4 || value[kind].some((score) => !Number.isInteger(score) || score < 1 || score > 3)) throw new Error("Normalized dimensions invalid");
  return value;
}

async function defaultCommand(tesslPath, args) {
  const result = await execFileAsync(tesslPath, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  return parseJson(result.stdout, `tessl ${args.slice(0, 3).join(" ")}`);
}

async function defaultVersionCommand(tesslPath) {
  const result = await execFileAsync(tesslPath, ["--version"], { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 60 * 1000 });
  return result.stdout.trim();
}

function makeLabel(split, id, repeat) { return repeat === 0 ? `aas-parity-v1:${split}:${id}` : `aas-parity-v1:${split}:${id}:repeat-${repeat}`; }

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function collectParity({ repoRoot, manifestPath, split, resultDir, predictionsPath, predictionsSha256, adoptRuns = {}, concurrency = 2, stabilityRepeats = 0, pollMs = 3000, tesslPath = "tessl", command = defaultCommand, versionCommand = defaultVersionCommand }) {
  if (!repoRoot || !manifestPath || !resultDir) throw new Error("repoRoot, manifestPath, and resultDir are required");
  if (!Object.hasOwn({ validation: true, final_blind: true }, split)) throw new Error("Split must be validation or final_blind");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4 || !Number.isInteger(stabilityRepeats) || stabilityRepeats < 0 || stabilityRepeats > 3 || !Number.isInteger(pollMs) || pollMs < 0 || pollMs > 60000) throw new Error("Collector limits invalid");
  if (split === "final_blind" && stabilityRepeats !== 0) throw new Error("Stability repeats are validation-only");
  const manifest = validateParityManifest(readJson(path.resolve(manifestPath), "Parity manifest"));
  if (split === "final_blind") {
    if (!predictionsPath) throw new Error("final_blind requires --predictions-file");
    const bytes = readBoundedRegular(path.resolve(predictionsPath), 1024 * 1024, "Pre-reveal predictions");
    validatePredictions(JSON.parse(bytes.toString("utf8")), manifest, predictionsSha256, bytes);
  }
  const tracked = trackedFiles(repoRoot);
  const selected = manifest.splits[split];
  if (!adoptRuns || typeof adoptRuns !== "object" || Array.isArray(adoptRuns)) throw new Error("Adopted runs must be a skill-to-run map");
  const selectedIds = new Set(selected.map((item) => item.id));
  for (const [skillId, runId] of Object.entries(adoptRuns)) if (!selectedIds.has(skillId) || !UUID.test(runId || "")) throw new Error(`Adopted run is outside the selected split or invalid: ${skillId}`);
  for (const item of selected) {
    const bundle = discoverBundle(repoRoot, item.id, tracked);
    if (bundle.bundleHash !== item.bundleHash || bundle.files[0].sha256 !== item.skillSha256) throw new Error(`Frozen bundle hash mismatch: ${item.id}`);
  }
  const outputRoot = ensureOutputRoot(path.resolve(resultDir), repoRoot);
  const calls = (args) => command(tesslPath, args);
  const credits = () => calls(["api", `/v1/orgs/${ORG}/credits`]).then(validateCredits);
  let exhausted = false;

  async function one(skill, repeat) {
    const label = makeLabel(split, skill.id, repeat);
    const context = { split, skill, repeat, label };
    const suffix = repeat === 0 ? "unique" : `repeat-${repeat}`;
    const normalizedPath = `normalized/${artifactName(skill.id)}.${suffix}.json`;
    const submissionPath = `submissions/${artifactName(skill.id)}.${suffix}.json`;
    const intentPath = `submissions/${artifactName(skill.id)}.${suffix}.intent.json`;
    const rawPath = `raw/${artifactName(skill.id)}.${suffix}.json`;
    try {
      const existing = readJson(resolveOutputPath(outputRoot, normalizedPath), "Existing normalized labels", 1024 * 1024);
      return validateNormalized(existing, context);
    } catch (error) {
      if (fs.existsSync(resolveOutputPath(outputRoot, normalizedPath))) throw error;
    }
    try {
      const completed = readJson(resolveOutputPath(outputRoot, rawPath), "Completed raw review");
      exactKeys(completed, ["origin", "submission", "view", "listEntry"], "Completed raw review");
      if (!["submitted", "adopted"].includes(completed.origin) || (completed.origin === "submitted" && !completed.submission) || (completed.origin === "adopted" && completed.submission !== null)) throw new Error("Completed raw review origin invalid");
      const runId = extractRunId(completed.view);
      const observed = verifyMetadata(completed.listEntry, { runId, label });
      const normalized = normalize(completed.view, { ...context, runId }, observed, completed.listEntry);
      atomicWriteJson(outputRoot, normalizedPath, normalized);
      return normalized;
    } catch (error) {
      if (fs.existsSync(resolveOutputPath(outputRoot, rawPath))) throw error;
    }
    const adoptedRunId = repeat === 0 ? adoptRuns[skill.id] : undefined;
    if (adoptedRunId) {
      const list = await calls(["review", "list", "--json", "--limit", "100", "--workspace", WORKSPACE]);
      const entry = metadataEntry(list, adoptedRunId);
      if (statusOf(entry) !== "completed") throw new Error(`Adopted review is not completed: ${skill.id}`);
      const view = await calls(["review", "view", "--json", adoptedRunId]);
      atomicWriteJson(outputRoot, rawPath, { origin: "adopted", submission: null, view, listEntry: entry });
      const observed = verifyMetadata(entry, { runId: adoptedRunId, label });
      const normalized = normalize(view, { ...context, runId: adoptedRunId }, observed, entry);
      atomicWriteJson(outputRoot, normalizedPath, normalized);
      return normalized;
    }
    const bundle = discoverBundle(repoRoot, skill.id, tracked);
    let submitted;
    try {
      const raw = readJson(resolveOutputPath(outputRoot, submissionPath), "Stored submission", 1024 * 1024);
      submitted = { raw, runId: extractRunId(raw) };
    } catch (error) {
      if (fs.existsSync(resolveOutputPath(outputRoot, submissionPath))) throw error;
      if (fs.existsSync(resolveOutputPath(outputRoot, intentPath))) throw new Error(`Ambiguous prior submission intent; refusing paid retry: ${skill.id}/${suffix}`);
      let snapshot;
      try {
        snapshot = materializeBundle(bundle);
        submitted = await (async () => {
          atomicWriteJson(outputRoot, intentPath, { schemaVersion: 1, skillId: skill.id, bundleHash: skill.bundleHash, split, repeat, label });
          // The free plan rejects an explicit --review-plugin as a custom-plugin
          // request. Tessl's implicit quality-review default is verified against
          // PLUGIN in the completed run metadata before labels are accepted.
          const raw = await calls(["review", "run", "quality", path.join(snapshot.root, ...skill.skillPath.split("/").slice(0, -1)), "--json", "--workspace", WORKSPACE, "--threshold", "1", "--force", "--label", label]);
          atomicWriteJson(outputRoot, submissionPath, raw);
          return { raw, runId: extractRunId(raw) };
        })();
      } finally { if (snapshot) disposeSnapshot(snapshot); }
    }
    let entry;
    for (;;) {
      const list = await calls(["review", "list", "--json", "--limit", "100", "--workspace", WORKSPACE]);
      entry = metadataEntry(list, submitted.runId);
      const status = statusOf(entry);
      if (status === "completed") break;
      if (status === "failed" || status === "cancelled") throw new Error(`Tessl review ended with ${status}`);
      if (status !== "pending" && status !== "in_progress" && status !== "running") throw new Error(`Unsupported Tessl review status: ${status}`);
      await sleep(pollMs);
    }
    const view = submitted.raw?.judges && submitted.raw?.review ? submitted.raw : await calls(["review", "view", "--json", submitted.runId]);
    atomicWriteJson(outputRoot, rawPath, { origin: "submitted", submission: submitted.raw, view, listEntry: entry });
    const observed = verifyMetadata(entry, { runId: submitted.runId, label });
    const normalized = normalize(view, { ...context, runId: submitted.runId }, observed, entry);
    atomicWriteJson(outputRoot, normalizedPath, normalized);
    return normalized;
  }

  function requiresNewSubmission({ skill, repeat }) {
    const suffix = repeat === 0 ? "unique" : `repeat-${repeat}`;
    const stem = artifactName(skill.id);
    if (fs.existsSync(resolveOutputPath(outputRoot, `normalized/${stem}.${suffix}.json`)) || fs.existsSync(resolveOutputPath(outputRoot, `raw/${stem}.${suffix}.json`)) || fs.existsSync(resolveOutputPath(outputRoot, `submissions/${stem}.${suffix}.json`))) return false;
    if (repeat === 0 && adoptRuns[skill.id]) return false;
    if (fs.existsSync(resolveOutputPath(outputRoot, `submissions/${stem}.${suffix}.intent.json`))) throw new Error(`Ambiguous prior submission intent; refusing paid retry: ${skill.id}/${suffix}`);
    return true;
  }

  async function wave(items) {
    const newSubmissions = items.filter(requiresNewSubmission).length;
    let before;
    if (newSubmissions) {
      before = await credits();
      if (before.blocked || before.overLimit || before.remaining < newSubmissions * REVIEW_CREDIT_COST) throw new Error(`Insufficient Tessl credits for wave: need ${newSubmissions * REVIEW_CREDIT_COST}, have ${before.remaining}`);
    }
    const settled = await Promise.allSettled(items.map((item) => one(item.skill, item.repeat)));
    if (newSubmissions) {
      const after = await credits();
      atomicWriteJson(outputRoot, `credits/wave-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.json`, { newSubmissions, expectedCost: newSubmissions * REVIEW_CREDIT_COST, before, after });
      const delta = before.remaining - after.remaining;
      if (delta !== newSubmissions * REVIEW_CREDIT_COST) throw new Error(`Tessl credit cost mismatch: expected ${newSubmissions * REVIEW_CREDIT_COST}, observed ${delta}`);
      if (after.remaining <= 0 || after.blocked || after.overLimit) exhausted = true;
    }
    const failed = settled.find((item) => item.status === "rejected");
    if (failed) throw failed.reason;
    return settled.map((item) => item.value);
  }

  async function batch(items) {
    const results = [];
    for (let index = 0; index < items.length; index += concurrency) results.push(...await wave(items.slice(index, index + concurrency)));
    return results;
  }
  const uniquePlan = selected.map((skill) => ({ skill, repeat: 0 }));
  const byId = new Map(selected.map((skill) => [skill.id, skill]));
  const repeatPlan = [];
  if (split === "validation" && stabilityRepeats) for (let repeat = 1; repeat <= stabilityRepeats; repeat += 1) repeatPlan.push(...manifest.stabilityPanel.map((id) => ({ skill: byId.get(id), repeat })));
  const initiallyMissing = [...uniquePlan, ...repeatPlan].filter(requiresNewSubmission).length;
  if (initiallyMissing) {
    const cliVersion = await versionCommand(tesslPath);
    if (cliVersion !== EXPECTED_CLI_VERSION) throw new Error(`Tessl CLI version mismatch: expected ${EXPECTED_CLI_VERSION}, observed ${cliVersion || "<empty>"}`);
    const preflight = await credits();
    const required = initiallyMissing * REVIEW_CREDIT_COST;
    if (preflight.blocked || preflight.overLimit || preflight.remaining < required) throw new Error(`Insufficient Tessl credits for batch: need ${required}, have ${preflight.remaining}`);
    atomicWriteJson(outputRoot, "credits/preflight.json", { missing: initiallyMissing, unitCost: REVIEW_CREDIT_COST, required, credits: preflight });
  }
  const unique = await batch(uniquePlan);
  const repeats = [];
  if (repeatPlan.length) repeats.push(...await batch(repeatPlan));
  const goldItems = unique.slice().sort((a, b) => a.skillId.localeCompare(b.skillId)).map((item) => ({
    skillId: item.skillId, reviewRunId: item.reviewRunId, score: item.score,
    validation: { normalized: item.validationNormalized, warnings: item.warnings, errors: item.errors, totalChecks: item.totalChecks },
    description: Object.fromEntries(DIMENSIONS.description.map((id, index) => [id, item.description[index]])),
    content: Object.fromEntries(DIMENSIONS.content.map((id, index) => [id, item.content[index]])),
  }));
  const gold = { schemaVersion: 1, kind: "aas-tessl-parity-gold", split, oracle: { plugin: PLUGIN, agent: EXPECTED_AGENT, model: EXPECTED_MODEL }, items: goldItems };
  atomicWriteJson(outputRoot, "gold.json", gold);
  const summary = { schemaVersion: 1, kind: "aas-tessl-parity-collection", split, unique: unique.length, repeats: repeats.length, exhausted, results: [...unique, ...repeats].map((item) => ({ skillId: item.skillId, repeat: item.repeat, reviewRunId: item.reviewRunId, score: item.score })) };
  atomicWriteJson(outputRoot, "summary.json", summary);
  return summary;
}

function option(args, name, fallback) { const index = args.indexOf(name); if (index < 0) return fallback; if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} requires a value`); return args[index + 1]; }

function mappingOptions(args, name) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith("--") || value.indexOf("=") < 1) throw new Error(`${name} requires skillId=runId`);
    const separator = value.indexOf("="); const skillId = value.slice(0, separator); const runId = value.slice(separator + 1);
    if (Object.hasOwn(result, skillId)) throw new Error(`Duplicate ${name} skill: ${skillId}`);
    result[skillId] = runId;
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const repoRoot = path.resolve(__dirname, "../..");
  const value = await collectParity({
    repoRoot, manifestPath: option(args, "--manifest", path.join(repoRoot, "tools/config/local-skill-review-parity-benchmark.json")),
    split: option(args, "--split"), resultDir: option(args, "--result-dir", path.join(os.tmpdir(), "aas-tessl-parity")),
    predictionsPath: option(args, "--predictions-file"), predictionsSha256: option(args, "--predictions-sha256"),
    adoptRuns: mappingOptions(args, "--adopt-run"),
    concurrency: Number(option(args, "--concurrency", "2")), stabilityRepeats: Number(option(args, "--stability-repeats", "0")), pollMs: Number(option(args, "--poll-ms", "3000")),
    tesslPath: option(args, "--tessl-path", "tessl"),
  });
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

if (require.main === module) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });

module.exports = { DIMENSIONS, EXPECTED_CLI_VERSION, ORG, PLUGIN, REVIEW_CREDIT_COST, WORKSPACE, collectParity, defaultVersionCommand, extractRunId, makeLabel, mappingOptions, normalize, validateCredits, validateNormalized, validatePredictions, verifyMetadata };
