#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { buildParityManifest, duplicateGroups, EXPANSION_RULE, expandParityManifest, OVERLAY_MINIMUMS, validateParityExpansion, validateParityManifest } = require("../../local-skill-reviewer/parity-benchmark");

const repoRoot = path.resolve(__dirname, "../../..");
const options = {
  repoRoot,
  seed: "parity-benchmark-test-seed",
  pluginChecksum: "1".repeat(64),
  rubricChecksum: "2".repeat(64),
};

const first = buildParityManifest(options);
const second = buildParityManifest(options);
assert.deepStrictEqual(second, first, "same frozen Git index and seed must produce the same manifest");
assert.strictEqual(validateParityManifest(first), first);

assert.deepStrictEqual(first.sizes, { validation: 14, final_blind: 18 });
assert.strictEqual(first.splits.validation.length, 14);
assert.strictEqual(first.splits.final_blind.length, 18);

const splitIds = Object.fromEntries(Object.entries(first.splits).map(([split, items]) => [split, new Set(items.map((item) => item.id))]));
const allIds = Object.values(splitIds).flatMap((ids) => [...ids]);
assert.strictEqual(new Set(allIds).size, 32, "skill IDs must be unique and splits disjoint");
const calibration = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools/config/local-skill-review-calibration.json"), "utf8"));
const reviewedIds = [...calibration.tuning, ...calibration.holdout].map((item) => item.id).sort();
assert.deepStrictEqual(first.excludedCalibrationIds, reviewedIds, "exclusions must come from the reviewed calibration manifest");
for (const id of reviewedIds) assert(!allIds.includes(id), `reviewed calibration skill leaked into parity cohort: ${id}`);

const splitGroups = Object.fromEntries(Object.entries(first.splits).map(([split, items]) => [split, new Set(items.map((item) => item.duplicateGroupSha256))]));
const allGroups = Object.values(splitGroups).flatMap((groups) => [...groups]);
assert.strictEqual(new Set(allGroups).size, 32, "no exact/near-duplicate group may cross or repeat within splits");
assert.deepStrictEqual(first.stabilityPanel, first.splits.validation.slice(0, 4).map((item) => item.id), "stability panel must be an ordered validation subset");
assert.strictEqual(new Set(first.reserveOrder).size, first.reserveOrder.length, "reserve order must be unique");
assert(first.reserveOrder.every((id) => !allIds.includes(id) && !reviewedIds.includes(id)), "reserve must exclude selected and reviewed skills");

const grouped = duplicateGroups([
  { id: "exact-a", contentHash: "a", tokenCount: 100, simhash: 0n },
  { id: "exact-b", contentHash: "a", tokenCount: 100, simhash: ~0n },
  { id: "near", contentHash: "b", tokenCount: 95, simhash: 3n },
  { id: "different", contentHash: "c", tokenCount: 100, simhash: 0xffffn },
]);
assert.strictEqual(grouped[0], grouped[1], "exact normalized content must group");
assert.strictEqual(grouped[0], grouped[2], "near content signature must group transitively");
assert.notStrictEqual(grouped[0], grouped[3], "materially different content must stay separate");

for (const split of Object.keys(first.splits)) {
  const primaryTotal = Object.values(first.coverage[split].primaryStrata).reduce((sum, value) => sum + value, 0);
  assert.strictEqual(primaryTotal, first.sizes[split], `${split} primary strata counts must cover its whole split`);
  assert(Object.keys(first.coverage[split].primaryStrata).every((key) => /^length-s[1-6]:(?:bundle|no-bundle)$/.test(key)));
  for (const [overlay, minimum] of Object.entries(OVERLAY_MINIMUMS[split])) {
    assert(first.coverage[split].overlays[overlay] >= minimum, `${split} must cover ${overlay} at least ${minimum} time(s)`);
  }
}

const tampered = JSON.parse(JSON.stringify(first));
tampered.unexpected = true;
assert.throws(() => validateParityManifest(tampered), /schema is not closed/);
const belowMinimum = JSON.parse(JSON.stringify(first));
belowMinimum.coverage.validation.overlays.nonEnglish = 0;
assert.throws(() => validateParityManifest(belowMinimum), /overlay coverage minimum not met/);

const expanded = expandParityManifest({ repoRoot, parentManifest: first });
const expandedAgain = expandParityManifest({ repoRoot, parentManifest: first });
assert.deepStrictEqual(expandedAgain, expanded, "v2 expansion must be deterministic from the frozen v1 reserve");
assert.strictEqual(validateParityManifest(expanded), expanded);
assert.strictEqual(validateParityExpansion(first, expanded), expanded);
assert.strictEqual(expanded.manifestVersion, 2);
assert.deepStrictEqual(expanded.sizes, { validation: 25, final_blind: 35 });
assert.deepStrictEqual(expanded.expansionRule, EXPANSION_RULE);
assert.strictEqual(expanded.parentSelectionSha256, first.integrity.selectionSha256);
assert.deepStrictEqual(expanded.splits.validation.slice(0, 14), first.splits.validation, "v2 must preserve the v1 validation prefix");
assert.deepStrictEqual(expanded.splits.validation.slice(14).map((item) => item.id), first.reserveOrder.slice(0, 11), "validation must consume the first 11 reserve IDs");
assert.deepStrictEqual(expanded.splits.final_blind.slice(0, 18), first.splits.final_blind, "v2 must preserve the v1 final-blind prefix");
assert.deepStrictEqual(expanded.splits.final_blind.slice(18).map((item) => item.id), first.reserveOrder.slice(11, 28), "final blind must consume the next 17 reserve IDs");
assert.deepStrictEqual(expanded.reserveOrder, first.reserveOrder.slice(28), "v2 reserve must remove exactly the consumed prefix");
assert.deepStrictEqual(expanded.stabilityPanel.slice(0, 4), first.stabilityPanel, "v2 stability panel must preserve the original four first");
assert.deepStrictEqual(expanded.stabilityPanel, expanded.splits.validation.slice(0, 15).map((item) => item.id));
assert.strictEqual(new Set(Object.values(expanded.splits).flat().map((item) => item.duplicateGroupSha256)).size, 60);
assert(/^[0-9a-f]{64}$/.test(expanded.integrity.parentManifestSha256));
assert(/^[0-9a-f]{64}$/.test(expanded.integrity.expansionSha256));

const prefixTamper = JSON.parse(JSON.stringify(expanded));
[prefixTamper.splits.validation[14], prefixTamper.splits.validation[15]] = [prefixTamper.splits.validation[15], prefixTamper.splits.validation[14]];
assert.throws(() => validateParityExpansion(first, prefixTamper), /invalid|integrity|prefix/i, "reordered reserve-prefix expansion must be rejected");
const expandedUnknownKey = JSON.parse(JSON.stringify(expanded));
expandedUnknownKey.expansionRule.unexpected = true;
assert.throws(() => validateParityManifest(expandedUnknownKey), /schema is not closed/);

process.stdout.write("parity benchmark tests passed\n");
