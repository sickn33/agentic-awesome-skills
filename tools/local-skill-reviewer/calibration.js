"use strict";

const fs = require("fs");
const path = require("path");
const { reviewSkill } = require("./reviewer");

const { discoverBundle } = require("./safe-bundle");

async function calibrationMetrics({ repoRoot, resultDir, outputRoot, tracked, split = "tuning" }) {
  const goldPath = path.join(repoRoot, "tools/config/local-skill-review-calibration-gold.json");
  const goldFile = JSON.parse(fs.readFileSync(goldPath, "utf8"));
  const gold = goldFile[split];
  if (!gold || typeof gold !== "object") throw new Error(`Calibration split unavailable: ${split}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/config/local-skill-review-calibration.json"), "utf8"));
  const frozen = manifest[split];
  if (!Array.isArray(frozen) || frozen.length !== Object.keys(gold).length) throw new Error("Calibration manifest mismatch");
  for (const item of frozen) if (discoverBundle(repoRoot, item.id, tracked).bundleHash !== item.bundleHash) throw new Error(`Calibration snapshot mismatch: ${item.id}`);
  let dimensionMatches = 0;
  let dimensionCount = 0;
  let absoluteScoreError = 0;
  const rows = [];
  for (const [skillId, expected] of Object.entries(gold)) {
    const actual = await reviewSkill({ repoRoot, skillId, resultDir, outputRoot, tracked });
    const actualDescription = goldFile.dimensionOrder.description.map((name) => actual.judgments.description.dimensions[name].score);
    const actualContent = goldFile.dimensionOrder.content.map((name) => actual.judgments.content.dimensions[name].score);
    const actualDimensions = [...actualDescription, ...actualContent];
    const expectedDimensions = [...expected.description, ...expected.content];
    const matches = actualDimensions.filter((value, index) => value === expectedDimensions[index]).length;
    dimensionMatches += matches;
    dimensionCount += expectedDimensions.length;
    const scoreError = Math.abs(actual.local_quality_score - expected.score);
    absoluteScoreError += scoreError;
    rows.push({ skillId, tessl: expected.score, local: actual.local_quality_score, scoreError, dimensionMatches: matches, dimensions: expectedDimensions.length });
  }
  return {
    split,
    skills: rows.length,
    dimensionAgreement: dimensionMatches / dimensionCount,
    scoreMae: absoluteScoreError / rows.length,
    rows,
  };
}

module.exports = { calibrationMetrics };
