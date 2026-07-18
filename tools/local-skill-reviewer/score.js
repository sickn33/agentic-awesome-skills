"use strict";

const { COMPONENT_WEIGHTS, DIMENSIONS } = require("./constants");

function assertFiniteRange(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be finite and in [${min}, ${max}]`);
  }
}

function weightedJudgeScore(kind, dimensions) {
  const weights = DIMENSIONS[kind];
  if (!weights) throw new Error(`Unknown judge kind: ${kind}`);
  const expected = Object.keys(weights);
  const actual = Object.keys(dimensions || {}).sort();
  if (actual.join("\0") !== [...expected].sort().join("\0")) {
    throw new Error(`${kind} dimensions must be exactly: ${expected.join(", ")}`);
  }

  let weighted = 0;
  for (const [name, weight] of Object.entries(weights)) {
    const value = dimensions[name].score;
    assertFiniteRange(value, 1, 3, `${kind}.${name}.score`);
    weighted += value * weight;
  }
  return (weighted - 1) / 2;
}

function aggregateScore(validation, description, content) {
  assertFiniteRange(validation, 0, 1, "validation");
  assertFiniteRange(description, 0, 1, "description");
  assertFiniteRange(content, 0, 1, "content");
  // Frozen from 25 live Tessl runs: fractional totals, including x.75,
  // are truncated rather than rounded (all component inputs are nonnegative).
  return Math.floor(100 * (
    COMPONENT_WEIGHTS.validation * validation +
    COMPONENT_WEIGHTS.description * description +
    COMPONENT_WEIGHTS.content * content
  ));
}

module.exports = { aggregateScore, assertFiniteRange, weightedJudgeScore };
