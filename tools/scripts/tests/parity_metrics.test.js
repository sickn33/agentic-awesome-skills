#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { DIMENSIONS } = require("../../local-skill-reviewer/constants");
const {
  aggregateJudgments,
  computeTesslScore,
  evaluateParity,
  normalizeGold,
  normalizeJudgmentSet,
  ordinalMedian,
  quadraticWeightedKappa,
} = require("../../local-skill-reviewer/parity-metrics");

function dimensions(level) {
  return Object.fromEntries(Object.entries(DIMENSIONS).map(([kind, weights]) => [kind, Object.fromEntries(Object.keys(weights).map((name) => [name, level]))]));
}

function goldRow(id, level, warnings, errors = 0, totalChecks = 16) {
  const normalized = (totalChecks - errors - 0.5 * warnings) / totalChecks;
  const levels = dimensions(level);
  return { id, score: computeTesslScore(normalized, levels), validation: { normalized, warnings, errors, totalChecks }, dimensions: levels };
}

function judgmentRow(row) {
  return {
    id: row.id,
    dimensions: Object.fromEntries(Object.entries(row.dimensions).map(([kind, values]) => [kind, Object.fromEntries(Object.entries(values).map(([name, score]) => [name, { score, reasoning: `Independent assessment of ${kind}.${name}.` }]))])),
  };
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function close(actual, expected, epsilon = 1e-12) { assert(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`); }
function test(name, fn) { try { fn(); process.stdout.write(`ok - ${name}\n`); } catch (error) { process.stderr.write(`not ok - ${name}\n${error.stack}\n`); process.exitCode = 1; } }

const gold = [goldRow("skill-a", 1, 0), goldRow("skill-b", 2, 1), goldRow("skill-c", 3, 2)];
const judgeOne = gold.map(judgmentRow);
judgeOne[2].dimensions.description.specificity.score = 2;
const judgeTwo = gold.map(judgmentRow);
judgeTwo[1].dimensions.content.conciseness.score = 1;
const judgeThree = gold.map(judgmentRow);

test("public weights and truncation reproduce known Tessl totals", () => {
  assert.deepStrictEqual(gold.map((row) => row.score), [20, 59, 98]);
  assert.strictEqual(gold[1].validation.normalized, 0.96875);
  assert.strictEqual(gold[2].validation.normalized, 0.9375);
  const withError = goldRow("with-error", 2, 2, 1, 16);
  assert.strictEqual(withError.validation.normalized, 0.875);
  assert.strictEqual(computeTesslScore(0.9875, dimensions(1)), 19, "19.75 must truncate to 19");
  const mixed = dimensions(2);
  mixed.description.specificity = 3;
  assert.strictEqual(computeTesslScore(0.95, mixed), 63);
  const increments = {
    "description.specificity": 4,
    "description.trigger_term_quality": 6,
    "description.completeness": 7,
    "description.distinctiveness_conflict_risk": 3,
    "content.conciseness": 6,
    "content.actionability": 6,
    "content.workflow_clarity": 5,
    "content.progressive_disclosure": 3,
  };
  for (const [dimension, increment] of Object.entries(increments)) {
    const asymmetric = dimensions(2);
    const [kind, name] = dimension.split(".");
    asymmetric[kind][name] = 3;
    assert.strictEqual(computeTesslScore(0, asymmetric), 40 + increment, `weight drift for ${dimension}`);
  }
  assert.deepStrictEqual(normalizeGold(gold), gold);
});

test("single-judge metrics match hand-computed fixture", () => {
  const output = evaluateParity({ gold, judgments: [judgeOne], bootstrapIterations: 40, seed: "known" });
  const metrics = output.singleJudges[0].metrics;
  close(metrics.exactMacroAgreement, 23 / 24);
  close(metrics.perDimension["description.specificity"].exactAgreement, 2 / 3);
  assert.deepStrictEqual(metrics.confusionMatrix, [[8, 0, 0], [0, 8, 0], [0, 1, 7]]);
  close(metrics.macroF1, (1 + 16 / 17 + 14 / 15) / 3);
  close(metrics.score.mae, 4 / 3);
  close(metrics.score.rmse, Math.sqrt(16 / 3));
  assert.strictEqual(metrics.score.bandAgreement, 1);
  assert.deepStrictEqual(metrics.score.rows.map((row) => row.predicted), [20, 59, 94]);
});

test("quadratic weighted kappa uses the ordinal 1-3 distance", () => {
  close(quadraticWeightedKappa([[8, 0, 0], [0, 8, 0], [0, 1, 7]]), 30 / 31);
  assert.strictEqual(quadraticWeightedKappa([[3, 0, 0], [0, 0, 0], [0, 0, 0]]), 1);
  assert.strictEqual(quadraticWeightedKappa([[0, 0, 0], [0, 0, 0], [0, 0, 0]]), null);
});

test("ordinal median ensemble is deterministic and majority-resilient", () => {
  assert.strictEqual(ordinalMedian([1, 3]), 2);
  assert.strictEqual(ordinalMedian([3, 1, 2]), 2);
  const normalized = [judgeOne, judgeTwo, judgeThree].map((rows, index) => normalizeJudgmentSet(rows, new Set(gold.map((row) => row.id)), index));
  const ensemble = aggregateJudgments(normalized);
  assert.strictEqual(ensemble[2].dimensions.description.specificity.score, 3);
  assert.strictEqual(ensemble[1].dimensions.content.conciseness.score, 2);
  const output = evaluateParity({ gold, judgments: [judgeOne, judgeTwo, judgeThree], bootstrapIterations: 30 });
  assert.strictEqual(output.ensemble.metrics.exactMacroAgreement, 1);
  assert.strictEqual(output.ensemble.metrics.score.mae, 0);
  assert.strictEqual(output.ensemble.judges, 3);
  assert.strictEqual(output.ensemble.method, "strict-majority-then-ordinal-median");
});

test("majority-level baseline and score bands are reported independently", () => {
  const output = evaluateParity({ gold, judgments: [judgeThree], bootstrapIterations: 10 });
  assert.strictEqual(output.majorityLevelBaseline.exactMacroAgreement, 1 / 3);
  assert.strictEqual(output.majorityLevelBaseline.macroF1, 1 / 6);
  assert.strictEqual(output.majorityLevelBaseline.quadraticWeightedKappa, 0);
  assert(Number.isFinite(output.majorityLevelBaseline.scoreRmse));
  assert.strictEqual(output.singleJudges[0].metrics.score.bandAgreement, 1);
  assert.deepStrictEqual(output.scoreBands, ["below_50", "50_to_74", "at_least_75"]);
});

test("clustered bootstrap is fixed-seed deterministic", () => {
  const first = evaluateParity({ gold, judgments: [judgeOne], bootstrapIterations: 100, seed: "fixed-seed" });
  const second = evaluateParity({ gold, judgments: [judgeOne], bootstrapIterations: 100, seed: "fixed-seed" });
  assert.deepStrictEqual(first.singleJudges[0].bootstrap, second.singleJudges[0].bootstrap);
  assert.strictEqual(first.singleJudges[0].bootstrap.method, "clustered-by-skill-percentile");
  assert.strictEqual(first.singleJudges[0].bootstrap.confidence, 0.95);
  const interval = first.singleJudges[0].bootstrap.intervals.exactMacroAgreement;
  assert(interval.lower <= 23 / 24 && interval.upper >= 23 / 24);
});

test("optional primary and overlay strata produce closed subset metrics", () => {
  const strata = [
    { id: "skill-a", primaryStratum: "short", overlays: { risky: false, bundled: false } },
    { id: "skill-b", primaryStratum: "long", overlays: { risky: true, bundled: false } },
    { id: "skill-c", primaryStratum: "long", overlays: { risky: false, bundled: true } },
  ];
  const output = evaluateParity({ gold, judgments: [judgeOne], strata, bootstrapIterations: 5 });
  assert.strictEqual(output.singleJudges[0].strata["primary:short"].skills, 1);
  assert.strictEqual(output.singleJudges[0].strata["primary:long"].skills, 2);
  assert.strictEqual(output.singleJudges[0].strata["overlay:risky"].skills, 1);
  assert.strictEqual(output.singleJudges[0].strata["overlay:bundled"].skills, 1);
  assert.throws(() => evaluateParity({ gold, judgments: [judgeOne], strata: strata.slice(1), bootstrapIterations: 5 }), /missing gold IDs/);
});

test("judgments reject ID drift, missing dimensions, and gold leakage", () => {
  const ids = new Set(gold.map((row) => row.id));
  const missing = judgeOne.slice(1);
  assert.throws(() => normalizeJudgmentSet(missing, ids), /ID mismatch/);
  const extra = clone(judgeOne);
  extra.push({ ...clone(judgeOne[0]), id: "skill-extra" });
  assert.throws(() => normalizeJudgmentSet(extra, ids), /ID mismatch/);
  const missingDimension = clone(judgeOne);
  delete missingDimension[0].dimensions.content.actionability;
  assert.throws(() => normalizeJudgmentSet(missingDimension, ids), /keys must be exactly/);
  for (const leakedField of ["gold", "tesslScore", "validation", "expected", "label"]) {
    const leaked = clone(judgeOne);
    leaked[0][leakedField] = 100;
    assert.throws(() => normalizeJudgmentSet(leaked, ids), /keys must be exactly/);
  }
  const leakedCell = clone(judgeOne);
  leakedCell[0].dimensions.description.specificity.goldScore = 3;
  assert.throws(() => normalizeJudgmentSet(leakedCell, ids), /keys must be exactly/);
  for (const reasoning of ["Gold score 3 says this is correct.", "ground truth is level 3", "Tessl score=3", "Tessl gave this a 3.", "expected level: 3", "oracle result"]) {
    const leakedReasoning = clone(judgeOne);
    leakedReasoning[0].dimensions.description.specificity.reasoning = reasoning;
    assert.throws(() => normalizeJudgmentSet(leakedReasoning, ids), /gold leakage/);
  }
});

test("gold rejects inconsistent validation and score labels", () => {
  const badValidation = clone(gold);
  badValidation[0].validation.normalized = 0.95;
  assert.throws(() => normalizeGold(badValidation), /inconsistent/);
  const impossibleCounts = clone(gold);
  impossibleCounts[0].validation = { normalized: 0, warnings: 2, errors: 16, totalChecks: 16 };
  assert.throws(() => normalizeGold(impossibleCounts), /exceed totalChecks/);
  const badScore = clone(gold);
  badScore[0].score = 21;
  assert.throws(() => normalizeGold(badScore), /does not match/);
  const extraField = clone(gold);
  extraField[0].reviewRunId = "secret-oracle-provenance";
  assert.throws(() => normalizeGold(extraField), /keys must be exactly/);
});

test("nested canonical IDs are accepted while unsafe paths fail closed", () => {
  const nestedGold = clone(gold);
  const nestedJudge = clone(judgeOne);
  nestedGold[0].id = "agent-squad/rex";
  nestedJudge[0].id = "agent-squad/rex";
  assert.strictEqual(evaluateParity({ gold: nestedGold, judgments: [nestedJudge], bootstrapIterations: 2 }).primary.metrics.skills, 3);
  for (const unsafe of ["../rex", "agent/../rex", "agent//rex", "agent\\rex", "agent\nrex", "/agent/rex", "agent/rex/"]) {
    const invalid = clone(nestedGold);
    invalid[0].id = unsafe;
    assert.throws(() => normalizeGold(invalid), /safe lowercase hyphenated POSIX segments/);
  }
});

test("CLI accepts one or more judge files and fails closed", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aas-parity-metrics-"));
  const goldPath = path.join(directory, "gold.json");
  const judgePath = path.join(directory, "judge.json");
  fs.writeFileSync(goldPath, JSON.stringify(gold));
  fs.writeFileSync(judgePath, JSON.stringify(judgeOne));
  const cli = path.resolve(__dirname, "../../local-skill-reviewer/parity-metrics.js");
  const output = JSON.parse(execFileSync(process.execPath, [cli, goldPath, judgePath, "--bootstrap", "5", "--seed", "cli"], { encoding: "utf8" }));
  assert.strictEqual(output.singleJudges.length, 1);
  assert.strictEqual(output.singleJudges[0].metrics.labels, 24);
  const failed = spawnSync(process.execPath, [cli, goldPath], { encoding: "utf8" });
  assert.notStrictEqual(failed.status, 0);
  assert.match(failed.stderr, /judgment file/);
});

test("strict flat and envelope adapters match the normalized contract", () => {
  const flatGoldItems = gold.map((row, index) => ({ skillId: row.id, reviewRunId: `run-${index}`, score: row.score, validation: row.validation, description: row.dimensions.description, content: row.dimensions.content }));
  const goldEnvelope = { schemaVersion: 1, kind: "aas-tessl-parity-gold", split: "validation", oracle: { plugin: "tessl/default-skill-review@0.1.0", agent: "claude", model: "glm-5.2" }, items: flatGoldItems };
  assert.deepStrictEqual(normalizeGold(goldEnvelope), gold);
  assert.throws(() => normalizeGold({ ...goldEnvelope, oracle: { ...goldEnvelope.oracle, model: "drifted" } }), /oracle cohort/);
  assert.throws(() => normalizeGold(flatGoldItems.map((row, index) => index ? row : { ...row, reviewRunId: 17 })), /reviewRunId/);
  const flatJudge = judgeOne.map((row) => ({ skillId: row.id, description: row.dimensions.description, content: row.dimensions.content }));
  const ids = new Set(gold.map((row) => row.id));
  assert.deepStrictEqual(normalizeJudgmentSet(flatJudge, ids), judgeOne);
  const envelope = { schemaVersion: 1, kind: "aas-codex-tessl-level-judgments", guideVersion: "guide-v1", split: "validation", items: flatJudge.map((row) => ({ ...row, bundleHash: "a".repeat(64) })) };
  assert.deepStrictEqual(normalizeJudgmentSet(envelope, ids), judgeOne);
  assert.throws(() => normalizeJudgmentSet({ ...envelope, leaked: true }, ids), /keys must be exactly/);
  const directStrataWithExtra = gold.map((row) => ({ id: row.id, primaryStratum: "x", overlays: {} })).concat({ id: "extra-skill", primaryStratum: "x", overlays: {} });
  assert.throws(() => evaluateParity({ gold, judgments: [judgeOne], strata: directStrataWithExtra, bootstrapIterations: 2 }), /extra IDs/);
  assert.strictEqual(evaluateParity({ gold, judgments: [judgeOne], bootstrapIterations: 2 }).primary.method, "single-primary-judge");
});
