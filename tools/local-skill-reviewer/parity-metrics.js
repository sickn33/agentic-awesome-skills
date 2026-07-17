#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { aggregateScore, weightedJudgeScore } = require("./score");
const { DIMENSIONS } = require("./constants");

const KINDS = Object.freeze(["description", "content"]);
const DIMENSION_PATHS = Object.freeze(KINDS.flatMap((kind) => Object.keys(DIMENSIONS[kind]).map((name) => `${kind}.${name}`)));
const SCORE_BANDS = Object.freeze(["below_50", "50_to_74", "at_least_75"]);
const LEAKAGE_REASONING = /\b(?:tessl|gold(?:en)?|ground[ -]?truth|oracle|answer[ -]?key|reviewRunId|(?:expected|target|reference)\s+(?:total|score|label|level|rating)\s*(?:is|=|:)?\s*[0-9])\b/i;

function fail(message) { throw new Error(message); }
function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join("\0") !== wanted.join("\0")) fail(`${label} keys must be exactly: ${expected.join(", ")}`);
}
function finite(value, min, max, label, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`${label} must be ${integer ? "an integer " : ""}in [${min}, ${max}]`);
  return value;
}
function skillId(value, label) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/.test(value)) fail(`${label} must contain safe lowercase hyphenated POSIX segments`);
  return value;
}

function adaptGoldInput(input) {
  if (Array.isArray(input)) {
    if (!input.length || !Object.hasOwn(input[0], "skillId")) return input;
    return input.map((row, index) => {
      exactKeys(row, ["skillId", "reviewRunId", "score", "validation", "description", "content"], `gold[${index}]`);
      if (typeof row.reviewRunId !== "string" || !row.reviewRunId) fail(`gold[${index}].reviewRunId must be non-empty`);
      return { id: row.skillId, score: row.score, validation: row.validation, dimensions: { description: row.description, content: row.content } };
    });
  }
  exactKeys(input, ["schemaVersion", "kind", "split", "oracle", "items"], "gold envelope");
  if (input.schemaVersion !== 1 || input.kind !== "aas-tessl-parity-gold") fail("Unsupported gold envelope schema or kind");
  if (!["validation", "final_blind"].includes(input.split)) fail("gold envelope split must be validation or final_blind");
  exactKeys(input.oracle, ["plugin", "agent", "model"], "gold envelope oracle");
  if (input.oracle.plugin !== "tessl/default-skill-review@0.1.0" || input.oracle.agent !== "claude" || input.oracle.model !== "glm-5.2") fail("gold envelope oracle cohort does not match the frozen parity oracle");
  if (!Array.isArray(input.items)) fail("gold envelope items must be an array");
  return input.items.map((row, index) => {
    exactKeys(row, ["skillId", "reviewRunId", "score", "validation", "description", "content"], `gold.items[${index}]`);
    if (typeof row.reviewRunId !== "string" || !row.reviewRunId) fail(`gold.items[${index}].reviewRunId must be non-empty`);
    return { id: row.skillId, score: row.score, validation: row.validation, dimensions: { description: row.description, content: row.content } };
  });
}

function normalizeGold(input) {
  input = adaptGoldInput(input);
  if (!Array.isArray(input) || input.length === 0) fail("gold must be a non-empty array");
  const seen = new Set();
  return input.map((row, index) => {
    const label = `gold[${index}]`;
    exactKeys(row, ["id", "score", "validation", "dimensions"], label);
    const id = skillId(row.id, `${label}.id`);
    if (seen.has(id)) fail(`Duplicate gold ID: ${id}`);
    seen.add(id);
    finite(row.score, 0, 100, `${label}.score`, true);
    exactKeys(row.validation, ["normalized", "warnings", "errors", "totalChecks"], `${label}.validation`);
    const warnings = finite(row.validation.warnings, 0, Number.MAX_SAFE_INTEGER, `${label}.validation.warnings`, true);
    const errors = finite(row.validation.errors, 0, Number.MAX_SAFE_INTEGER, `${label}.validation.errors`, true);
    const totalChecks = finite(row.validation.totalChecks, 1, Number.MAX_SAFE_INTEGER, `${label}.validation.totalChecks`, true);
    const normalized = finite(row.validation.normalized, 0, 1, `${label}.validation.normalized`);
    if (errors + 0.5 * warnings > totalChecks) fail(`${label}.validation error and warning penalties exceed totalChecks`);
    const expectedValidation = (totalChecks - errors - 0.5 * warnings) / totalChecks;
    if (Math.abs(normalized - expectedValidation) > 1e-12) fail(`${label}.validation.normalized is inconsistent with check penalties`);
    exactKeys(row.dimensions, KINDS, `${label}.dimensions`);
    const dimensions = {};
    for (const kind of KINDS) {
      const names = Object.keys(DIMENSIONS[kind]);
      exactKeys(row.dimensions[kind], names, `${label}.dimensions.${kind}`);
      dimensions[kind] = Object.fromEntries(names.map((name) => [name, finite(row.dimensions[kind][name], 1, 3, `${label}.dimensions.${kind}.${name}`, true)]));
    }
    const computed = computeTesslScore(normalized, dimensions);
    if (computed !== row.score) fail(`${label}.score ${row.score} does not match public Tessl formula result ${computed}`);
    return { id, score: row.score, validation: { normalized, warnings, errors, totalChecks }, dimensions };
  });
}

function adaptJudgmentInput(input, judgeIndex) {
  let envelope = false;
  if (!Array.isArray(input)) {
    exactKeys(input, ["schemaVersion", "kind", "guideVersion", "split", "items"], `judgments[${judgeIndex}] envelope`);
    if (input.schemaVersion !== 1 || input.kind !== "aas-codex-tessl-level-judgments") fail(`Unsupported judgments[${judgeIndex}] envelope schema or kind`);
    if (typeof input.guideVersion !== "string" || !input.guideVersion || typeof input.split !== "string" || !input.split) fail(`judgments[${judgeIndex}] envelope guideVersion and split must be non-empty`);
    if (!Array.isArray(input.items)) fail(`judgments[${judgeIndex}] envelope items must be an array`);
    input = input.items;
    envelope = true;
  }
  if (!Array.isArray(input)) fail(`judgments[${judgeIndex}] must be an array or closed envelope`);
  if (!input.length || !Object.hasOwn(input[0], "skillId")) return input;
  return input.map((row, index) => {
    const keys = envelope ? ["skillId", "bundleHash", "description", "content"] : ["skillId", "description", "content"];
    exactKeys(row, keys, `judgments[${judgeIndex}]${envelope ? ".items" : ""}[${index}]`);
    if (envelope && (typeof row.bundleHash !== "string" || !/^[a-f0-9]{64}$/.test(row.bundleHash))) fail(`judgments[${judgeIndex}].items[${index}].bundleHash must be a lowercase SHA-256`);
    return { id: row.skillId, dimensions: { description: row.description, content: row.content } };
  });
}

function normalizeJudgmentSet(input, goldIds, judgeIndex = 0) {
  input = adaptJudgmentInput(input, judgeIndex);
  if (!Array.isArray(input) || input.length === 0) fail(`judgments[${judgeIndex}] must be a non-empty array`);
  const seen = new Set();
  const rows = input.map((row, index) => {
    const label = `judgments[${judgeIndex}][${index}]`;
    exactKeys(row, ["id", "dimensions"], label);
    const id = skillId(row.id, `${label}.id`);
    if (seen.has(id)) fail(`Duplicate judgment ID in judge ${judgeIndex}: ${id}`);
    seen.add(id);
    exactKeys(row.dimensions, KINDS, `${label}.dimensions`);
    const dimensions = {};
    for (const kind of KINDS) {
      const names = Object.keys(DIMENSIONS[kind]);
      exactKeys(row.dimensions[kind], names, `${label}.dimensions.${kind}`);
      dimensions[kind] = {};
      for (const name of names) {
        const cell = row.dimensions[kind][name];
        exactKeys(cell, ["score", "reasoning"], `${label}.dimensions.${kind}.${name}`);
        const score = finite(cell.score, 1, 3, `${label}.dimensions.${kind}.${name}.score`, true);
        if (typeof cell.reasoning !== "string" || cell.reasoning.trim().length === 0) fail(`${label}.dimensions.${kind}.${name}.reasoning must be non-empty`);
        if (LEAKAGE_REASONING.test(cell.reasoning)) fail(`${label}.dimensions.${kind}.${name}.reasoning contains apparent gold leakage`);
        dimensions[kind][name] = { score, reasoning: cell.reasoning };
      }
    }
    return { id, dimensions };
  });
  const expected = [...goldIds].sort();
  const actual = [...seen].sort();
  const missing = expected.filter((id) => !seen.has(id));
  const extra = actual.filter((id) => !goldIds.has(id));
  if (missing.length || extra.length) fail(`Judge ${judgeIndex} ID mismatch; missing=[${missing.join(",")}], extra=[${extra.join(",")}]`);
  return rows;
}

function computeTesslScore(validationNormalized, dimensions) {
  const wrapped = (kind) => Object.fromEntries(Object.entries(dimensions[kind]).map(([name, value]) => [name, { score: typeof value === "number" ? value : value.score }]));
  return aggregateScore(validationNormalized, weightedJudgeScore("description", wrapped("description")), weightedJudgeScore("content", wrapped("content")));
}

function flattenDimensions(dimensions) {
  return Object.fromEntries(DIMENSION_PATHS.map((path) => {
    const [kind, name] = path.split(".");
    const value = dimensions[kind][name];
    return [path, typeof value === "number" ? value : value.score];
  }));
}

function ordinalMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function majorityThenOrdinalMedian(values) {
  const counts = new Map([1, 2, 3].map((level) => [level, values.filter((value) => value === level).length]));
  const majority = [...counts].find(([, count]) => count > values.length / 2);
  return majority ? majority[0] : ordinalMedian(values);
}

function aggregateJudgments(judgmentSets) {
  const maps = judgmentSets.map((rows) => new Map(rows.map((row) => [row.id, row])));
  return judgmentSets[0].map((row) => {
    const dimensions = {};
    for (const kind of KINDS) {
      dimensions[kind] = {};
      for (const name of Object.keys(DIMENSIONS[kind])) {
        const values = maps.map((map) => map.get(row.id).dimensions[kind][name].score);
        dimensions[kind][name] = { score: majorityThenOrdinalMedian(values), reasoning: `Strict majority, falling back to ordinal median, across ${values.length} closed judgments.` };
      }
    }
    return { id: row.id, dimensions };
  });
}

function confusion(goldValues, predictedValues) {
  const matrix = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let index = 0; index < goldValues.length; index += 1) matrix[goldValues[index] - 1][predictedValues[index] - 1] += 1;
  return matrix;
}

function f1FromConfusion(matrix) {
  return [0, 1, 2].map((level) => {
    const tp = matrix[level][level];
    const fp = matrix.reduce((sum, row, rowIndex) => sum + (rowIndex === level ? 0 : row[level]), 0);
    const fn = matrix[level].reduce((sum, value, columnIndex) => sum + (columnIndex === level ? 0 : value), 0);
    const denominator = 2 * tp + fp + fn;
    return denominator ? (2 * tp) / denominator : 0;
  });
}

function quadraticWeightedKappa(matrix) {
  const count = matrix.flat().reduce((sum, value) => sum + value, 0);
  if (!count) return null;
  const rows = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const columns = [0, 1, 2].map((column) => matrix.reduce((sum, row) => sum + row[column], 0));
  let observed = 0;
  let expected = 0;
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const weight = ((row - column) ** 2) / 4;
      observed += weight * matrix[row][column] / count;
      expected += weight * rows[row] * columns[column] / (count * count);
    }
  }
  if (expected === 0) return observed === 0 ? 1 : 0;
  return 1 - observed / expected;
}

function band(score) { return score < 50 ? SCORE_BANDS[0] : score < 75 ? SCORE_BANDS[1] : SCORE_BANDS[2]; }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }

function metricsForPredictions(gold, predictions) {
  const predictionMap = new Map(predictions.map((row) => [row.id, row]));
  const dimensionPairs = Object.fromEntries(DIMENSION_PATHS.map((path) => [path, { gold: [], predicted: [] }]));
  const scoreRows = [];
  for (const item of gold) {
    const prediction = predictionMap.get(item.id);
    const goldFlat = flattenDimensions(item.dimensions);
    const predictedFlat = flattenDimensions(prediction.dimensions);
    for (const path of DIMENSION_PATHS) {
      dimensionPairs[path].gold.push(goldFlat[path]);
      dimensionPairs[path].predicted.push(predictedFlat[path]);
    }
    const predictedScore = computeTesslScore(item.validation.normalized, prediction.dimensions);
    scoreRows.push({ id: item.id, gold: item.score, predicted: predictedScore, error: predictedScore - item.score, goldBand: band(item.score), predictedBand: band(predictedScore) });
  }
  const perDimension = {};
  const combinedGold = [];
  const combinedPredicted = [];
  for (const path of DIMENSION_PATHS) {
    const pair = dimensionPairs[path];
    const matrix = confusion(pair.gold, pair.predicted);
    combinedGold.push(...pair.gold);
    combinedPredicted.push(...pair.predicted);
    perDimension[path] = {
      exactAgreement: mean(pair.gold.map((value, index) => Number(value === pair.predicted[index]))),
      macroF1: mean(f1FromConfusion(matrix)),
      quadraticWeightedKappa: quadraticWeightedKappa(matrix),
      confusionMatrix: matrix,
    };
  }
  const combinedMatrix = confusion(combinedGold, combinedPredicted);
  const absoluteErrors = scoreRows.map((row) => Math.abs(row.error));
  const squaredErrors = scoreRows.map((row) => row.error ** 2);
  return {
    skills: gold.length,
    labels: combinedGold.length,
    exactMacroAgreement: mean(Object.values(perDimension).map((item) => item.exactAgreement)),
    perDimension,
    macroF1: mean(f1FromConfusion(combinedMatrix)),
    quadraticWeightedKappa: quadraticWeightedKappa(combinedMatrix),
    confusionMatrix: combinedMatrix,
    score: { mae: mean(absoluteErrors), rmse: Math.sqrt(mean(squaredErrors)), bandAgreement: mean(scoreRows.map((row) => Number(row.goldBand === row.predictedBand))), rows: scoreRows },
  };
}

function majorityLevelBaseline(gold) {
  const levels = {};
  for (const path of DIMENSION_PATHS) {
    const counts = [1, 2, 3].map((level) => gold.filter((row) => flattenDimensions(row.dimensions)[path] === level).length);
    const maximum = Math.max(...counts);
    levels[path] = counts.indexOf(maximum) + 1;
  }
  const predictions = gold.map((row) => ({ id: row.id, dimensions: Object.fromEntries(KINDS.map((kind) => [kind, Object.fromEntries(Object.keys(DIMENSIONS[kind]).map((name) => [name, { score: levels[`${kind}.${name}`] }]))])) }));
  const metrics = metricsForPredictions(gold, predictions);
  return { levels, exactMacroAgreement: metrics.exactMacroAgreement, macroF1: metrics.macroF1, quadraticWeightedKappa: metrics.quadraticWeightedKappa, scoreMae: metrics.score.mae, scoreRmse: metrics.score.rmse, scoreBandAgreement: metrics.score.bandAgreement };
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let value = state; value = Math.imul(value ^ value >>> 15, value | 1); value ^= value + Math.imul(value ^ value >>> 7, value | 61); return ((value ^ value >>> 14) >>> 0) / 4294967296; };
}
function hashSeed(value) {
  let hash = 2166136261;
  for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function percentile(values, probability) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.floor((sorted.length - 1) * probability)];
}
function bootstrapConfidenceIntervals(gold, predictions, { iterations = 1000, seed = "aas-parity-bootstrap-v1" } = {}) {
  finite(iterations, 1, 100000, "bootstrap iterations", true);
  const random = mulberry32(hashSeed(seed));
  const predictionMap = new Map(predictions.map((row) => [row.id, row]));
  const samples = { exactMacroAgreement: [], macroF1: [], quadraticWeightedKappa: [], scoreMae: [], scoreRmse: [], scoreBandAgreement: [] };
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sampledGold = [];
    const sampledPredictions = [];
    for (let index = 0; index < gold.length; index += 1) {
      const selected = gold[Math.floor(random() * gold.length)];
      const bootstrapId = `${selected.id}-${index}`;
      sampledGold.push({ ...selected, id: bootstrapId });
      sampledPredictions.push({ ...predictionMap.get(selected.id), id: bootstrapId });
    }
    const metrics = metricsForPredictions(sampledGold, sampledPredictions);
    samples.exactMacroAgreement.push(metrics.exactMacroAgreement);
    samples.macroF1.push(metrics.macroF1);
    samples.quadraticWeightedKappa.push(metrics.quadraticWeightedKappa);
    samples.scoreMae.push(metrics.score.mae);
    samples.scoreRmse.push(metrics.score.rmse);
    samples.scoreBandAgreement.push(metrics.score.bandAgreement);
  }
  return { method: "clustered-by-skill-percentile", iterations, seed: String(seed), confidence: 0.95, intervals: Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, { lower: percentile(values, 0.025), upper: percentile(values, 0.975) }])) };
}

function normalizeStrata(manifest, goldIds) {
  if (manifest === undefined || manifest === null) return null;
  let rows;
  const direct = Array.isArray(manifest);
  if (direct) rows = manifest;
  else if (manifest && manifest.splits && typeof manifest.splits === "object") rows = Object.values(manifest.splits).flat();
  else fail("strata manifest must be an array or contain split arrays");
  const selected = rows.filter((row) => goldIds.has(row.id));
  const seen = new Set(selected.map((row) => row.id));
  if (seen.size !== selected.length) fail("Strata manifest contains duplicate gold IDs");
  const missing = [...goldIds].filter((id) => !seen.has(id));
  if (missing.length) fail(`Strata manifest missing gold IDs: ${missing.join(",")}`);
  if (direct) {
    const extra = rows.filter((row) => !goldIds.has(row.id)).map((row) => row.id);
    if (extra.length) fail(`Strata manifest has extra IDs: ${extra.join(",")}`);
  }
  for (const row of selected) {
    if (typeof row.primaryStratum !== "string" || !row.primaryStratum) fail(`Strata row ${row.id} lacks primaryStratum`);
    if (row.overlays !== undefined && (!row.overlays || typeof row.overlays !== "object" || Array.isArray(row.overlays) || Object.values(row.overlays).some((value) => typeof value !== "boolean"))) fail(`Strata row ${row.id} has invalid overlays`);
  }
  return selected;
}

function stratumMetrics(gold, predictions, strata) {
  if (!strata) return null;
  const groups = {};
  for (const row of strata) {
    (groups[`primary:${row.primaryStratum}`] ||= []).push(row.id);
    for (const [name, enabled] of Object.entries(row.overlays || {})) if (enabled) (groups[`overlay:${name}`] ||= []).push(row.id);
  }
  const predictionMap = new Map(predictions.map((row) => [row.id, row]));
  const goldMap = new Map(gold.map((row) => [row.id, row]));
  return Object.fromEntries(Object.entries(groups).sort().map(([name, ids]) => [name, metricsForPredictions(ids.map((id) => goldMap.get(id)), ids.map((id) => predictionMap.get(id)))]));
}

function evaluateParity({ gold, judgments, strata, bootstrapIterations = 1000, seed = "aas-parity-bootstrap-v1" }) {
  const normalizedGold = normalizeGold(gold);
  if (!Array.isArray(judgments) || judgments.length === 0) fail("judgments must contain one or more judge arrays");
  const goldIds = new Set(normalizedGold.map((row) => row.id));
  const normalizedJudgments = judgments.map((rows, index) => normalizeJudgmentSet(rows, goldIds, index));
  const normalizedStrata = normalizeStrata(strata, goldIds);
  const singleJudges = normalizedJudgments.map((rows, index) => {
    const metrics = metricsForPredictions(normalizedGold, rows);
    return { judge: index, metrics, bootstrap: bootstrapConfidenceIntervals(normalizedGold, rows, { iterations: bootstrapIterations, seed: `${seed}:judge:${index}` }), strata: stratumMetrics(normalizedGold, rows, normalizedStrata) };
  });
  const ensembleRows = aggregateJudgments(normalizedJudgments);
  const ensembleMetrics = metricsForPredictions(normalizedGold, ensembleRows);
  return {
    schemaVersion: 1,
    dimensionOrder: DIMENSION_PATHS,
    scoreBands: SCORE_BANDS,
    majorityLevelBaseline: majorityLevelBaseline(normalizedGold),
    primary: { method: "single-primary-judge", judge: 0, ...singleJudges[0] },
    singleJudges,
    ensemble: { role: "diagnostic-only", method: "strict-majority-then-ordinal-median", judges: normalizedJudgments.length, metrics: ensembleMetrics, bootstrap: bootstrapConfidenceIntervals(normalizedGold, ensembleRows, { iterations: bootstrapIterations, seed: `${seed}:ensemble` }), strata: stratumMetrics(normalizedGold, ensembleRows, normalizedStrata) },
  };
}

function main(argv) {
  const args = [...argv];
  const goldPath = args.shift();
  if (!goldPath) fail("Usage: parity-metrics.js GOLD.json JUDGE.json [JUDGE.json ...] [--strata FILE] [--bootstrap N] [--seed VALUE]");
  const judgePaths = [];
  let strataPath;
  let bootstrapIterations = 1000;
  let seed = "aas-parity-bootstrap-v1";
  while (args.length) {
    const token = args.shift();
    if (token === "--strata") strataPath = args.shift() || fail("--strata requires a file");
    else if (token === "--bootstrap") bootstrapIterations = Number(args.shift());
    else if (token === "--seed") seed = args.shift() || fail("--seed requires a value");
    else if (token.startsWith("--")) fail(`Unknown option: ${token}`);
    else judgePaths.push(token);
  }
  if (!judgePaths.length) fail("At least one judgment file is required");
  const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  process.stdout.write(`${JSON.stringify(evaluateParity({ gold: read(goldPath), judgments: judgePaths.map(read), strata: strataPath ? read(strataPath) : undefined, bootstrapIterations, seed }), null, 2)}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

module.exports = { DIMENSION_PATHS, adaptGoldInput, adaptJudgmentInput, aggregateJudgments, bootstrapConfidenceIntervals, computeTesslScore, evaluateParity, majorityLevelBaseline, majorityThenOrdinalMedian, metricsForPredictions, normalizeGold, normalizeJudgmentSet, ordinalMedian, quadraticWeightedKappa };
