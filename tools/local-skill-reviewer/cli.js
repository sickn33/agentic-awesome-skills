#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadOrCreateState, setStopState, summary, transition } = require("./batch-state");
const { atomicWriteJson, canonicalJson } = require("./cache");
const { runConformance } = require("./conformance");
const { ensureOutputRoot, atomicWrite } = require("./output");
const { assertRubricComplete } = require("./packet");
const { readCompletedResult, reviewSkill } = require("./reviewer");
const { discoverBundle, listCanonicalSkillIds, trackedFiles } = require("./safe-bundle");
const { artifactName } = require("./safe-io");
const { secretLike } = require("./secret");
const { buildSemanticPacket, importSemanticJudgment, prepareSemanticPackets, readSemanticPacket, verifyStoredSemanticReview, writeSemanticPacket } = require("./semantic-review");
const { expectedVersions } = require("./schema");
const { compareTriage, productionTriage } = require("./triage");

function repoRoot() { return path.resolve(__dirname, "../.."); }

function usage() {
  process.stderr.write("Usage: local-skill-reviewer <review|scan|semantic-prepare|semantic-packet|semantic-import|semantic-verify|fixtures> [skill-id] [--result-dir DIR] [--input FILE] [--max-skills N] [--concurrency N] [--resume] [--merge-gate]\n");
}

function flag(args, name) { return args.includes(name); }

function option(args, name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  if (index + 1 >= args.length || args[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
  return args[index + 1];
}

function integerOption(args, name, fallback, min, max) {
  const value = Number.parseInt(option(args, name, String(fallback)), 10);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} is invalid`);
  return value;
}

function aggregate(results, elapsedMs, stopState) {
  const scores = results.map((item) => item.local_quality_score).sort((a, b) => a - b);
  const confidence = {};
  for (const kind of ["description", "content"]) confidence[kind] = results.length ? results.reduce((sum, item) => sum + item.confidence[kind], 0) / results.length : null;
  const confidenceDistribution = Object.fromEntries(["description", "content"].map((kind) => {
    const values = results.map((item) => item.confidence[kind]).sort((a, b) => a - b);
    return [kind, { min: values[0] ?? null, median: values.length ? values[Math.floor(values.length / 2)] : null, max: values.at(-1) ?? null }];
  }));
  const nextActions = [];
  if (stopState !== "completed") nextActions.push("Resume the batch after resolving recorded failures.");
  const triaged = results.filter((item) => item.triage);
  const manual = triaged.filter((item) => item.triage.reviewStatus === "manual-review-required");
  if (manual.length) nextActions.push(`Interpret ${manual.length} manual-review-required skill(s) in Codex before correction or merge decisions.`);
  if (!nextActions.length) nextActions.push("No deterministic follow-up is required; semantic interpretation remains separate.");
  const priorityDistribution = Object.fromEntries(["P0", "P1", "P2", "P3"].map((priority) => [priority, triaged.filter((item) => item.triage.priority === priority).length]));
  const triageReasons = {};
  for (const item of manual) for (const code of item.triage.reasonCodes) triageReasons[code] = (triageReasons[code] || 0) + 1;
  return {
    completed: results.length,
    cacheHits: results.filter((item) => item.cacheHit).length,
    recomputed: results.filter((item) => !item.cacheHit).length,
    elapsedMs,
    stopState,
    scoreDistribution: { min: scores[0] ?? null, median: scores.length ? scores[Math.floor(scores.length / 2)] : null, max: scores.at(-1) ?? null, below50: scores.filter((value) => value < 50).length, from50to74: scores.filter((value) => value >= 50 && value < 75).length, atLeast75: scores.filter((value) => value >= 75).length },
    meanConfidence: confidence,
    confidenceDistribution,
    triage: { manualReviewRequired: manual.length, pass: triaged.length - manual.length, priorityDistribution, reasons: Object.fromEntries(Object.entries(triageReasons).sort()), topPriorities: manual.slice().sort(compareTriage).slice(0, 25).map((item) => ({ skillId: item.skillId, localQualityScore: item.local_quality_score, priority: item.triage.priority, reasonCodes: item.triage.reasonCodes })) },
    versions: expectedVersions(),
    nextActions,
  };
}

async function runBatch({ root, outputRoot, manifest, tracked, stateName, concurrency, review = reviewSkill, loadCompleted = readCompletedResult }) {
  if (new Set(manifest.skills.map((item) => artifactName(item.id))).size !== manifest.skills.length) throw new Error("Manifest artifact-name collision");
  const started = Date.now();
  const state = loadOrCreateState(outputRoot, stateName, manifest);
  const results = [];
  const failures = [];
  let cursor = 0;
  let interrupted = false;
  const onSignal = () => { interrupted = true; };
  process.once("SIGINT", onSignal);
  async function worker() {
    while (!interrupted && cursor < manifest.skills.length) {
      const item = manifest.skills[cursor++];
      const alreadyCompleted = state.items[item.id].status === "completed";
      if (!alreadyCompleted) transition(outputRoot, stateName, state, item.id, "running");
      try {
        const result = await (alreadyCompleted ? loadCompleted : review)({ repoRoot: root, skillId: item.id, outputRoot, tracked });
        if (item.bundleHash && result.bundleHash !== item.bundleHash) throw new Error("Frozen bundle hash mismatch");
        results.push(result);
        if (alreadyCompleted) {
          state.items[item.id] = { status: "completed", attempts: state.items[item.id].attempts, cacheKey: result.cacheKey, bundleHash: result.bundleHash };
          atomicWriteJson(outputRoot, stateName, state);
        } else transition(outputRoot, stateName, state, item.id, "completed", { cacheKey: result.cacheKey, bundleHash: result.bundleHash });
      } catch (error) {
        const rawError = String(error.message || error).slice(0, 500);
        const safeError = secretLike(rawError) ? "redacted-sensitive-error" : rawError;
        failures.push({ skillId: item.id, error: safeError });
        if (alreadyCompleted) {
          state.items[item.id] = { status: "failed", attempts: state.items[item.id].attempts, error: failures.at(-1).error };
          atomicWriteJson(outputRoot, stateName, state);
        } else transition(outputRoot, stateName, state, item.id, "failed", { error: failures.at(-1).error });
      }
    }
  }
  try { await Promise.all(Array.from({ length: concurrency }, () => worker())); }
  finally { process.removeListener("SIGINT", onSignal); }
  const counts = summary(state);
  const stopState = interrupted ? "interrupted" : failures.length || counts.failed ? "failed" : counts.completed === manifest.skills.length ? "completed" : "interrupted";
  setStopState(outputRoot, stateName, state, stopState);
  const report = { manifestVersion: manifest.manifestVersion, selected: manifest.skills.length, ...aggregate(results, Date.now() - started, stopState), state: counts, failures };
  atomicWriteJson(outputRoot, stateName.replace(/state\.json$/, "summary.json"), report);
  atomicWrite(outputRoot, stateName.replace(/state\.json$/, "results.jsonl"), Buffer.from(results.sort((a, b) => a.skillId.localeCompare(b.skillId)).map((item) => canonicalJson(item)).join("\n") + "\n", "utf8"));
  if (stopState !== "completed") throw new Error(`Batch incomplete: ${canonicalJson(report)}`);
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const root = repoRoot();
  const defaultId = require("crypto").createHash("sha256").update(root).digest("hex").slice(0, 12);
  const resultDir = path.resolve(option(args, "--result-dir", path.join(os.tmpdir(), "aas-local-skill-review", defaultId)));
  const outputRoot = ensureOutputRoot(resultDir, root);
  const tracked = trackedFiles(root);

  if (command === "review") {
    if (!args[1] || args[1].startsWith("--")) throw new Error("review requires a skill id");
    const result = await reviewSkill({ repoRoot: root, skillId: args[1], outputRoot, tracked });
    if (flag(args, "--merge-gate")) {
      result.triage = productionTriage(result, { mergeGate: true });
      atomicWriteJson(outputRoot, `merge-gate-results/${artifactName(args[1])}.json`, result);
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "semantic-packet") {
    const skillId = args[1];
    if (!skillId || skillId.startsWith("--")) throw new Error("semantic-packet requires a skill id");
    const packet = buildSemanticPacket({ repoRoot: root, skillId, tracked });
    process.stdout.write(`${JSON.stringify({ skillId, ...writeSemanticPacket({ outputRoot, packet }) }, null, 2)}\n`);
    return;
  }
  if (command === "semantic-prepare") {
    const discovered = listCanonicalSkillIds(root, tracked);
    const maxSkills = integerOption(args, "--max-skills", discovered.length, 1, discovered.length);
    const prepared = prepareSemanticPackets({ repoRoot: root, outputRoot, tracked, skillIds: discovered.slice(0, maxSkills) });
    process.stdout.write(`${JSON.stringify({ count: prepared.count, guideSha256: prepared.guideSha256, manifestHash: prepared.manifestHash, manifestPath: "semantic-packets/manifest.json" }, null, 2)}\n`);
    return;
  }
  if (command === "semantic-import") {
    const skillId = args[1];
    const inputOption = option(args, "--input", "");
    if (!skillId || skillId.startsWith("--") || !inputOption) throw new Error("semantic-import requires a skill id and --input JSON");
    const inputPath = path.resolve(inputOption);
    const packet = readSemanticPacket({ outputRoot, repoRoot: root, skillId, tracked });
    process.stdout.write(`${JSON.stringify(importSemanticJudgment({ outputRoot, packet, inputPath }), null, 2)}\n`);
    return;
  }
  if (command === "semantic-verify") {
    const skillId = args[1];
    if (!skillId || skillId.startsWith("--")) throw new Error("semantic-verify requires a skill id");
    const packet = readSemanticPacket({ outputRoot, repoRoot: root, skillId, tracked });
    process.stdout.write(`${JSON.stringify(verifyStoredSemanticReview({ outputRoot, packet }), null, 2)}\n`);
    return;
  }
  if (command === "scan") {
    const discovered = listCanonicalSkillIds(root, tracked);
    const maxSkills = integerOption(args, "--max-skills", discovered.length, 1, discovered.length);
    const skills = discovered.slice(0, maxSkills).map((id) => ({ id, bundleHash: discoverBundle(root, id, tracked).bundleHash }));
    const manifest = { schemaVersion: 1, kind: "aas-local-skill-review-batch-manifest", manifestVersion: `scan-v3-${maxSkills}`, skills };
    if (fs.existsSync(path.join(resultDir, "scan-state.json")) && !flag(args, "--resume")) throw new Error("Existing scan state requires --resume");
    const report = await runBatch({ root, outputRoot, manifest, tracked, stateName: "scan-state.json", concurrency: integerOption(args, "--concurrency", 4, 1, 8) });
    process.stdout.write(`${JSON.stringify({ discovered: discovered.length, ...report }, null, 2)}\n`);
    return;
  }
  if (command === "fixtures") {
    assertRubricComplete();
    const executed = runConformance();
    process.stdout.write(`${JSON.stringify({ ...executed, declaredDimensions: Object.keys(executed.dimensions).length, levels: 3, cases: executed.cases.length }, null, 2)}\n`);
    return;
  }
  usage();
  process.exitCode = 2;
}

if (require.main === module) main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ status: "failed", error: String(error.message || error).slice(0, 1000) })}\n`);
  process.exitCode = 1;
});

module.exports = { aggregate, main, runBatch };
