#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { discoverBundle, listCanonicalSkillIds, sha256, trackedFiles } = require("./safe-bundle");

const DEFAULT_SEED = "aas-tessl-parity-v1";
const SPLIT_SIZES = Object.freeze({ validation: 14, final_blind: 18 });
const EXPANDED_SPLIT_SIZES = Object.freeze({ validation: 25, final_blind: 35 });
const STABILITY_PANEL_SIZE = 4;
const EXPANDED_STABILITY_PANEL_SIZE = 15;
const EXPANSION_RULE = Object.freeze({
  kind: "cost-derived-frozen-reserve-prefix-v1",
  selectionBasis: "observed-cost-only-no-label-use",
  reviewCostCredits: 10,
  authorizedCredits: 750,
  observedCallsBeforeExpansion: 1,
  appendValidation: 11,
  appendFinalBlind: 17,
  totalUniqueReviews: 60,
  stabilityRepeats: 15,
  plannedTotalCalls: 75,
  projectedCredits: 750,
});
const OVERLAY_MINIMUMS = Object.freeze({
  validation: Object.freeze({ nonEnglish: 1, riskSecurity: 2, nested: 1, codeHeavy: 2, alias: 1, reference: 1, script: 1, asset: 1 }),
  final_blind: Object.freeze({ nonEnglish: 2, riskSecurity: 3, nested: 2, codeHeavy: 3, alias: 1, reference: 2, script: 1, asset: 1 }),
});
const CALIBRATION_PATH = "tools/config/local-skill-review-calibration.json";
const DEFAULT_PLUGIN_PATH = path.join(os.homedir(), ".tessl/plugins/tessl/default-skill-review/.tessl-plugin/plugin.json");
const DEFAULT_RUBRIC_PATH = path.join(os.homedir(), ".tessl/plugins/tessl/default-skill-review/skills/skill-reviewer/SKILL.md");

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function hashObject(value) { return sha256(Buffer.from(canonicalJson(value))); }

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) {
    throw new Error(`${label} schema is not closed`);
  }
}

function readChecksum(filePath, supplied, label) {
  if (supplied !== undefined) {
    if (!/^[0-9a-f]{64}$/.test(supplied)) throw new Error(`${label} checksum must be lowercase SHA-256`);
    return { sha256: supplied, source: "supplied" };
  }
  const absolute = path.resolve(filePath);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular non-symlink file`);
  return { sha256: sha256(fs.readFileSync(absolute)), source: path.basename(absolute) };
}

function calibrationExclusions(repoRoot) {
  const value = JSON.parse(fs.readFileSync(path.join(repoRoot, CALIBRATION_PATH), "utf8"));
  const ids = [...(value.tuning || []), ...(value.holdout || [])].map((item) => item.id);
  if (ids.length !== 12 || new Set(ids).size !== 12 || ids.some((id) => typeof id !== "string" || !id)) {
    throw new Error("Calibration manifest must identify exactly 12 unique reviewed skills");
  }
  return ids.sort();
}

function normalizedContent(text) {
  const withoutFrontmatter = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  return withoutFrontmatter
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/```[^\n]*\n/g, "```")
    .replace(/https?:\/\/\S+/g, " url ")
    .replace(/\b\d+(?:\.\d+)*\b/g, " number ")
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .trim();
}

function simhash64(text) {
  const counts = new Map();
  for (const token of text.split(/\s+/).filter(Boolean)) counts.set(token, (counts.get(token) || 0) + 1);
  const weights = Array(64).fill(0);
  for (const [token, weight] of counts) {
    const digest = crypto.createHash("sha256").update(token).digest();
    for (let bit = 0; bit < 64; bit += 1) weights[bit] += ((digest[Math.floor(bit / 8)] >> (bit % 8)) & 1) ? weight : -weight;
  }
  let result = 0n;
  for (let bit = 0; bit < 64; bit += 1) if (weights[bit] >= 0) result |= 1n << BigInt(bit);
  return result;
}

function hammingAtMost(left, right, limit) {
  let value = left ^ right;
  let count = 0;
  while (value && count <= limit) {
    value &= value - 1n;
    count += 1;
  }
  return count <= limit;
}

class UnionFind {
  constructor(size) { this.parent = Array.from({ length: size }, (_, index) => index); }
  find(index) {
    let root = index;
    while (this.parent[root] !== root) root = this.parent[root];
    while (this.parent[index] !== index) { const next = this.parent[index]; this.parent[index] = root; index = next; }
    return root;
  }
  union(left, right) {
    const a = this.find(left); const b = this.find(right);
    if (a !== b) this.parent[Math.max(a, b)] = Math.min(a, b);
  }
}

function duplicateGroups(records) {
  const union = new UnionFind(records.length);
  const exact = new Map();
  for (let index = 0; index < records.length; index += 1) {
    const prior = exact.get(records[index].contentHash);
    if (prior !== undefined) union.union(prior, index);
    else exact.set(records[index].contentHash, index);
  }
  for (let left = 0; left < records.length; left += 1) {
    for (let right = left + 1; right < records.length; right += 1) {
      const ratio = Math.min(records[left].tokenCount, records[right].tokenCount) / Math.max(1, records[left].tokenCount, records[right].tokenCount);
      if (ratio >= 0.85 && hammingAtMost(records[left].simhash, records[right].simhash, 3)) union.union(left, right);
    }
  }
  const members = new Map();
  for (let index = 0; index < records.length; index += 1) {
    const root = union.find(index);
    if (!members.has(root)) members.set(root, []);
    members.get(root).push(records[index].id);
  }
  return records.map((record, index) => hashObject(members.get(union.find(index)).slice().sort()));
}

function languageOverlay(normalized) {
  const words = normalized.split(/\s+/).filter(Boolean);
  const english = new Set(["the", "and", "to", "of", "a", "in", "for", "is", "with", "when", "use", "you", "this"]);
  const other = new Set(["de", "la", "le", "el", "los", "las", "que", "para", "con", "una", "un", "en", "di", "il", "per", "che", "com", "não", "não", "uma"]);
  let en = 0; let foreign = 0;
  for (const word of words) { if (english.has(word)) en += 1; if (other.has(word)) foreign += 1; }
  return foreign >= 4 && foreign > en;
}

function overlaysFor(id, text, bundle) {
  const normalized = normalizedContent(text);
  const lines = text.split(/\r?\n/);
  let codeLines = 0; let fenced = false;
  for (const line of lines) { if (/^\s*```/.test(line)) fenced = !fenced; else if (fenced) codeLines += 1; }
  const supplements = bundle.files.slice(1).map((file) => file.path.slice(`skills/${id}/`.length));
  return {
    nonEnglish: languageOverlay(normalized),
    riskSecurity: /\b(?:security|secure|vulnerab|exploit|attack|penetration|red[ -]?team|credential|secret|malware|injection|auth)\w*/i.test(text),
    nested: id.includes("/"),
    codeHeavy: codeLines / Math.max(1, lines.length) >= 0.2,
    alias: lines.length <= 60 && /\b(?:see|use|refer(?: to)?|delegate to|invoke)\b/i.test(text) && /(?:skills?\/|\[[^\]]+\]\([^)]+\)|`[^`]+`)/.test(text),
    reference: supplements.some((item) => item.startsWith("references/")),
    script: supplements.some((item) => item.startsWith("scripts/")),
    asset: supplements.some((item) => item.startsWith("assets/")),
  };
}

function sextileBoundaries(records) {
  const lengths = records.map((item) => item.lineCount).sort((a, b) => a - b);
  return [1, 2, 3, 4, 5].map((part) => lengths[Math.ceil((lengths.length * part) / 6) - 1]);
}

function sextileFor(length, boundaries) {
  let index = 0;
  while (index < boundaries.length && length > boundaries[index]) index += 1;
  return index + 1;
}

function ranked(seed, scope, values) {
  return values.slice().sort((left, right) => {
    const a = sha256(Buffer.from(`${seed}\0${scope}\0${left.groupHash}\0${left.id}`));
    const b = sha256(Buffer.from(`${seed}\0${scope}\0${right.groupHash}\0${right.id}`));
    return a.localeCompare(b) || left.id.localeCompare(right.id);
  });
}

function allocate(capacities, total) {
  const keys = Object.keys(capacities).sort();
  const available = keys.reduce((sum, key) => sum + capacities[key], 0);
  if (available < total) throw new Error(`Cohort requires ${total} duplicate-independent candidates, found ${available}`);
  const raw = Object.fromEntries(keys.map((key) => [key, (capacities[key] * total) / available]));
  const result = Object.fromEntries(keys.map((key) => [key, Math.min(capacities[key], Math.floor(raw[key]))]));
  let remaining = total - Object.values(result).reduce((sum, value) => sum + value, 0);
  const order = keys.slice().sort((a, b) => (raw[b] - Math.floor(raw[b])) - (raw[a] - Math.floor(raw[a])) || a.localeCompare(b));
  while (remaining > 0) {
    let progressed = false;
    for (const key of order) {
      if (result[key] < capacities[key] && remaining > 0) { result[key] += 1; remaining -= 1; progressed = true; }
    }
    if (!progressed) throw new Error("Unable to allocate stratified cohort");
  }
  return result;
}

function chooseCoveredSplit(candidates, seed, split, size, minima) {
  const capacities = countsBy(candidates, (item) => item.primaryStratum);
  const targets = allocate(capacities, size);
  for (const [overlay, minimum] of Object.entries(minima)) {
    if (candidates.filter((item) => item.overlays[overlay]).length < minimum) throw new Error(`${split} overlay minimum infeasible: ${overlay}`);
  }
  const available = candidates.slice();
  const chosen = [];
  const selectedStrata = {};
  const observed = Object.fromEntries(Object.keys(minima).map((key) => [key, 0]));
  const stableRank = new Map(ranked(seed, `${split}:coverage`, candidates).map((item, index) => [item.id, index]));
  const take = (item) => {
    chosen.push(item);
    selectedStrata[item.primaryStratum] = (selectedStrata[item.primaryStratum] || 0) + 1;
    for (const key of Object.keys(observed)) if (item.overlays[key]) observed[key] += 1;
    available.splice(available.findIndex((candidate) => candidate.id === item.id), 1);
  };
  while (Object.entries(minima).some(([key, minimum]) => observed[key] < minimum)) {
    if (chosen.length >= size) throw new Error(`${split} overlay minima cannot fit in split cardinality`);
    const scored = available.map((item) => ({
      item,
      gain: Object.entries(minima).reduce((sum, [key, minimum]) => sum + (observed[key] < minimum && item.overlays[key] ? 1 : 0), 0),
      stratumDeficit: (targets[item.primaryStratum] || 0) - (selectedStrata[item.primaryStratum] || 0),
    })).filter((entry) => entry.gain > 0).sort((left, right) => right.gain - left.gain || right.stratumDeficit - left.stratumDeficit || stableRank.get(left.item.id) - stableRank.get(right.item.id));
    if (!scored.length) throw new Error(`${split} overlay minimum infeasible after deterministic selection`);
    take(scored[0].item);
  }
  while (chosen.length < size) {
    const ordered = available.slice().sort((left, right) => {
      const leftDeficit = (targets[left.primaryStratum] || 0) - (selectedStrata[left.primaryStratum] || 0);
      const rightDeficit = (targets[right.primaryStratum] || 0) - (selectedStrata[right.primaryStratum] || 0);
      return rightDeficit - leftDeficit || stableRank.get(left.id) - stableRank.get(right.id);
    });
    if (!ordered.length) throw new Error(`${split} lacks enough duplicate-independent candidates`);
    take(ordered[0]);
  }
  for (const [overlay, minimum] of Object.entries(minima)) if (observed[overlay] < minimum) throw new Error(`${split} overlay minimum not met: ${overlay}`);
  const chosenIds = new Set(chosen.map((item) => item.id));
  return { chosen: ranked(seed, split, chosen), remaining: candidates.filter((item) => !chosenIds.has(item.id)) };
}

function selectSplits(records, seed) {
  const byGroup = new Map();
  for (const record of records) {
    if (!byGroup.has(record.groupHash)) byGroup.set(record.groupHash, []);
    byGroup.get(record.groupHash).push(record);
  }
  const representatives = [...byGroup.entries()].map(([groupHash, values]) => ranked(seed, "representative", values.map((value) => ({ ...value, groupHash })))[0]);
  const splits = {};
  let remaining = representatives;
  for (const [split, size] of Object.entries(SPLIT_SIZES)) {
    const selection = chooseCoveredSplit(remaining, seed, split, size, OVERLAY_MINIMUMS[split]);
    splits[split] = selection.chosen;
    remaining = selection.remaining;
  }
  const reserve = ranked(seed, "reserve", remaining);
  return { splits, reserve };
}

function publicSnapshot(item) {
  return {
    id: item.id,
    skillPath: item.skillPath,
    skillSha256: item.skillSha256,
    bundleHash: item.bundleHash,
    lineCount: item.lineCount,
    byteCount: item.byteCount,
    primaryStratum: item.primaryStratum,
    duplicateGroupSha256: item.groupHash,
    overlays: item.overlays,
  };
}

function countsBy(items, field) {
  const result = {};
  for (const item of items) { const key = field(item); result[key] = (result[key] || 0) + 1; }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function coverage(items) {
  const overlayKeys = ["nonEnglish", "riskSecurity", "nested", "codeHeavy", "alias", "reference", "script", "asset"];
  return {
    primaryStrata: countsBy(items, (item) => item.primaryStratum),
    overlays: Object.fromEntries(overlayKeys.map((key) => [key, items.filter((item) => item.overlays[key]).length])),
  };
}

function parityInventory(repoRoot) {
  const tracked = trackedFiles(repoRoot);
  const excludedIds = calibrationExclusions(repoRoot);
  const excluded = new Set(excludedIds);
  const records = [];
  for (const id of listCanonicalSkillIds(repoRoot, tracked)) {
    if (excluded.has(id)) continue;
    const bundle = discoverBundle(repoRoot, id, tracked);
    const primary = bundle.files[0];
    const normalized = normalizedContent(primary.text);
    records.push({
      id, skillPath: bundle.skillPath, skillSha256: primary.sha256, bundleHash: bundle.bundleHash,
      lineCount: primary.text.split(/\r?\n/).length, byteCount: primary.size, bundlePresent: bundle.files.length > 1,
      overlays: overlaysFor(id, primary.text, bundle), contentHash: sha256(Buffer.from(normalized)),
      tokenCount: normalized ? normalized.split(/\s+/).length : 0, simhash: simhash64(normalized),
    });
  }
  const boundaries = sextileBoundaries(records);
  const groups = duplicateGroups(records);
  records.forEach((record, index) => { record.groupHash = groups[index]; record.primaryStratum = `length-s${sextileFor(record.lineCount, boundaries)}:${record.bundlePresent ? "bundle" : "no-bundle"}`; });
  const corpusIndex = records.map((item) => ({ id: item.id, skillSha256: item.skillSha256, bundleHash: item.bundleHash, duplicateGroupSha256: item.groupHash })).sort((a, b) => a.id.localeCompare(b.id));
  return { excludedIds, records, boundaries, corpusIndex, corpusIndexSha256: hashObject(corpusIndex) };
}

function buildParityManifest({ repoRoot, seed = DEFAULT_SEED, pluginChecksum, rubricChecksum, pluginPath = DEFAULT_PLUGIN_PATH, rubricPath = DEFAULT_RUBRIC_PATH } = {}) {
  if (!repoRoot) throw new Error("repoRoot is required");
  if (typeof seed !== "string" || !seed || seed.length > 200) throw new Error("Seed must be a non-empty string of at most 200 characters");
  const { excludedIds, records, boundaries, corpusIndexSha256 } = parityInventory(repoRoot);
  const selected = selectSplits(records, seed);
  const splits = Object.fromEntries(Object.entries(selected.splits).map(([key, values]) => [key, values.map(publicSnapshot)]));
  const stabilityPanel = splits.validation.slice(0, STABILITY_PANEL_SIZE).map((item) => item.id);
  const reserveOrder = selected.reserve.map((item) => item.id);
  const all = Object.values(splits).flat();
  const ids = all.map((item) => item.id);
  const groupIds = all.map((item) => item.duplicateGroupSha256);
  const integrity = {
    algorithm: "sha256-canonical-json-v1",
    corpusIndexSha256,
    selectionSha256: hashObject(splits),
    reserveOrderSha256: hashObject(reserveOrder),
    cardinality: all.length,
    uniqueIds: new Set(ids).size,
    uniqueDuplicateGroups: new Set(groupIds).size,
    splitsDisjoint: new Set(ids).size === all.length,
    duplicateGroupsDisjoint: new Set(groupIds).size === all.length,
    excludedIdsAbsent: ids.every((id) => !excludedIds.includes(id)),
  };
  const manifest = {
    schemaVersion: 1,
    kind: "aas-tessl-parity-benchmark",
    manifestVersion: 1,
    frozenSource: "git-index-blobs",
    seed,
    sizes: { ...SPLIT_SIZES },
    overlayMinimums: OVERLAY_MINIMUMS,
    excludedCalibrationIds: excludedIds,
    checksums: {
      plugin: readChecksum(pluginPath, pluginChecksum, "Plugin"),
      rubric: readChecksum(rubricPath, rubricChecksum, "Rubric"),
    },
    stratification: { primary: "skill-line-length-sextile-x-bundle-present", lengthSextileUpperBounds: boundaries },
    coverage: Object.fromEntries(Object.entries(splits).map(([key, values]) => [key, coverage(values)])),
    splits,
    stabilityPanel,
    reserveOrder,
    integrity,
  };
  validateParityManifest(manifest);
  return manifest;
}

function expansionIdentity(parentManifestOrSha256, expanded) {
  const parentManifestSha256 = typeof parentManifestOrSha256 === "string" ? parentManifestOrSha256 : hashObject(parentManifestOrSha256);
  return hashObject({
    parentManifestSha256,
    parentSelectionSha256: expanded.parentSelectionSha256,
    expansionRule: expanded.expansionRule,
    splits: expanded.splits,
    stabilityPanel: expanded.stabilityPanel,
    reserveOrder: expanded.reserveOrder,
  });
}

function validateParityExpansion(parentManifest, expanded) {
  validateParityManifest(parentManifest);
  validateParityManifest(expanded);
  if (parentManifest.manifestVersion !== 1 || expanded.manifestVersion !== 2) throw new Error("Parity expansion requires v1 parent and v2 child");
  if (expanded.parentSelectionSha256 !== parentManifest.integrity.selectionSha256) throw new Error("Expansion parent selection mismatch");
  if (expanded.integrity.parentManifestSha256 !== hashObject(parentManifest)) throw new Error("Expansion parent manifest hash mismatch");
  if (hashObject(expanded.expansionRule) !== hashObject(EXPANSION_RULE)) throw new Error("Expansion rule mismatch");
  const expectedValidationAppend = parentManifest.reserveOrder.slice(0, EXPANSION_RULE.appendValidation);
  const expectedBlindAppend = parentManifest.reserveOrder.slice(EXPANSION_RULE.appendValidation, EXPANSION_RULE.appendValidation + EXPANSION_RULE.appendFinalBlind);
  const validationIds = expanded.splits.validation.map((item) => item.id);
  const blindIds = expanded.splits.final_blind.map((item) => item.id);
  if (hashObject(validationIds.slice(0, SPLIT_SIZES.validation)) !== hashObject(parentManifest.splits.validation.map((item) => item.id)) || hashObject(validationIds.slice(SPLIT_SIZES.validation)) !== hashObject(expectedValidationAppend)) throw new Error("Expansion validation prefix rule violated");
  if (hashObject(blindIds.slice(0, SPLIT_SIZES.final_blind)) !== hashObject(parentManifest.splits.final_blind.map((item) => item.id)) || hashObject(blindIds.slice(SPLIT_SIZES.final_blind)) !== hashObject(expectedBlindAppend)) throw new Error("Expansion final-blind prefix rule violated");
  if (hashObject(expanded.reserveOrder) !== hashObject(parentManifest.reserveOrder.slice(EXPANSION_RULE.appendValidation + EXPANSION_RULE.appendFinalBlind))) throw new Error("Expansion reserve prefix consumption violated");
  const expectedPanel = [...parentManifest.stabilityPanel];
  for (const id of validationIds) if (!expectedPanel.includes(id) && expectedPanel.length < EXPANDED_STABILITY_PANEL_SIZE) expectedPanel.push(id);
  if (hashObject(expanded.stabilityPanel) !== hashObject(expectedPanel)) throw new Error("Expanded stability panel rule violated");
  if (expanded.integrity.expansionSha256 !== expansionIdentity(parentManifest, expanded)) throw new Error("Expansion integrity hash mismatch");
  return expanded;
}

function expandParityManifest({ repoRoot, parentManifest } = {}) {
  if (!repoRoot) throw new Error("repoRoot is required");
  validateParityManifest(parentManifest);
  if (parentManifest.manifestVersion !== 1) throw new Error("Only a v1 parity manifest can be expanded");
  const inventory = parityInventory(repoRoot);
  if (inventory.corpusIndexSha256 !== parentManifest.integrity.corpusIndexSha256) throw new Error("Frozen corpus differs from v1 parent");
  const byId = new Map(inventory.records.map((item) => [item.id, item]));
  for (const snapshot of Object.values(parentManifest.splits).flat()) {
    const current = byId.get(snapshot.id);
    if (!current || hashObject(publicSnapshot(current)) !== hashObject(snapshot)) throw new Error(`Frozen parent snapshot mismatch: ${snapshot.id}`);
  }
  const consumed = parentManifest.reserveOrder.slice(0, EXPANSION_RULE.appendValidation + EXPANSION_RULE.appendFinalBlind);
  if (consumed.length !== EXPANSION_RULE.appendValidation + EXPANSION_RULE.appendFinalBlind) throw new Error("V1 reserve is too short for expansion");
  const materialize = (id) => {
    const record = byId.get(id);
    if (!record) throw new Error(`Frozen reserve snapshot missing: ${id}`);
    return publicSnapshot(record);
  };
  const splits = {
    validation: [...parentManifest.splits.validation, ...consumed.slice(0, EXPANSION_RULE.appendValidation).map(materialize)],
    final_blind: [...parentManifest.splits.final_blind, ...consumed.slice(EXPANSION_RULE.appendValidation).map(materialize)],
  };
  const all = Object.values(splits).flat();
  const ids = all.map((item) => item.id); const groups = all.map((item) => item.duplicateGroupSha256);
  if (new Set(ids).size !== ids.length || new Set(groups).size !== groups.length) throw new Error("Expanded snapshots violate ID or duplicate-group disjointness");
  const stabilityPanel = [...parentManifest.stabilityPanel];
  for (const item of splits.validation) if (!stabilityPanel.includes(item.id) && stabilityPanel.length < EXPANDED_STABILITY_PANEL_SIZE) stabilityPanel.push(item.id);
  const reserveOrder = parentManifest.reserveOrder.slice(consumed.length);
  const expanded = {
    schemaVersion: 1,
    kind: parentManifest.kind,
    manifestVersion: 2,
    frozenSource: parentManifest.frozenSource,
    seed: parentManifest.seed,
    sizes: { ...EXPANDED_SPLIT_SIZES },
    overlayMinimums: parentManifest.overlayMinimums,
    excludedCalibrationIds: parentManifest.excludedCalibrationIds,
    checksums: parentManifest.checksums,
    stratification: parentManifest.stratification,
    coverage: Object.fromEntries(Object.entries(splits).map(([key, values]) => [key, coverage(values)])),
    splits,
    stabilityPanel,
    reserveOrder,
    parentSelectionSha256: parentManifest.integrity.selectionSha256,
    expansionRule: EXPANSION_RULE,
    integrity: {
      algorithm: "sha256-canonical-json-v1",
      corpusIndexSha256: inventory.corpusIndexSha256,
      selectionSha256: hashObject(splits),
      reserveOrderSha256: hashObject(reserveOrder),
      parentManifestSha256: hashObject(parentManifest),
      expansionSha256: "pending",
      cardinality: all.length,
      uniqueIds: new Set(ids).size,
      uniqueDuplicateGroups: new Set(groups).size,
      splitsDisjoint: new Set(ids).size === all.length,
      duplicateGroupsDisjoint: new Set(groups).size === all.length,
      excludedIdsAbsent: ids.every((id) => !parentManifest.excludedCalibrationIds.includes(id)),
    },
  };
  expanded.integrity.expansionSha256 = expansionIdentity(parentManifest, expanded);
  validateParityExpansion(parentManifest, expanded);
  return expanded;
}

function validateSnapshot(item) {
  exactKeys(item, ["id", "skillPath", "skillSha256", "bundleHash", "lineCount", "byteCount", "primaryStratum", "duplicateGroupSha256", "overlays"], "Snapshot");
  exactKeys(item.overlays, ["nonEnglish", "riskSecurity", "nested", "codeHeavy", "alias", "reference", "script", "asset"], "Snapshot overlays");
  if (!item.id || item.skillPath !== `skills/${item.id}/SKILL.md` || ![item.skillSha256, item.bundleHash, item.duplicateGroupSha256].every((value) => /^[0-9a-f]{64}$/.test(value))) throw new Error("Snapshot identity invalid");
  if (!Number.isSafeInteger(item.lineCount) || item.lineCount < 1 || !Number.isSafeInteger(item.byteCount) || item.byteCount < 1 || !/^length-s[1-6]:(?:bundle|no-bundle)$/.test(item.primaryStratum)) throw new Error("Snapshot features invalid");
  if (Object.values(item.overlays).some((value) => typeof value !== "boolean")) throw new Error("Snapshot overlay invalid");
}

function validateParityManifest(manifest) {
  const expanded = manifest?.manifestVersion === 2;
  const splitSizes = expanded ? EXPANDED_SPLIT_SIZES : SPLIT_SIZES;
  const cardinality = Object.values(splitSizes).reduce((sum, value) => sum + value, 0);
  const stabilitySize = expanded ? EXPANDED_STABILITY_PANEL_SIZE : STABILITY_PANEL_SIZE;
  const topKeys = ["schemaVersion", "kind", "manifestVersion", "frozenSource", "seed", "sizes", "overlayMinimums", "excludedCalibrationIds", "checksums", "stratification", "coverage", "splits", "stabilityPanel", "reserveOrder", "integrity"];
  if (expanded) topKeys.push("parentSelectionSha256", "expansionRule");
  exactKeys(manifest, topKeys, "Parity manifest");
  exactKeys(manifest.sizes, Object.keys(splitSizes), "Split sizes");
  exactKeys(manifest.overlayMinimums, Object.keys(splitSizes), "Overlay minimums");
  exactKeys(manifest.splits, Object.keys(splitSizes), "Splits");
  exactKeys(manifest.checksums, ["plugin", "rubric"], "Checksums");
  exactKeys(manifest.checksums.plugin, ["sha256", "source"], "Plugin checksum");
  exactKeys(manifest.checksums.rubric, ["sha256", "source"], "Rubric checksum");
  exactKeys(manifest.stratification, ["primary", "lengthSextileUpperBounds"], "Stratification");
  const integrityKeys = ["algorithm", "corpusIndexSha256", "selectionSha256", "reserveOrderSha256", "cardinality", "uniqueIds", "uniqueDuplicateGroups", "splitsDisjoint", "duplicateGroupsDisjoint", "excludedIdsAbsent"];
  if (expanded) integrityKeys.push("parentManifestSha256", "expansionSha256");
  exactKeys(manifest.integrity, integrityKeys, "Integrity proof");
  exactKeys(manifest.coverage, Object.keys(splitSizes), "Coverage");
  if (manifest.schemaVersion !== 1 || manifest.kind !== "aas-tessl-parity-benchmark" || ![1, 2].includes(manifest.manifestVersion) || manifest.frozenSource !== "git-index-blobs") throw new Error("Parity manifest provenance invalid");
  if (expanded) {
    exactKeys(manifest.expansionRule, Object.keys(EXPANSION_RULE), "Expansion rule");
    if (!/^[0-9a-f]{64}$/.test(manifest.parentSelectionSha256) || hashObject(manifest.expansionRule) !== hashObject(EXPANSION_RULE)) throw new Error("Expansion contract invalid");
  }
  if (typeof manifest.seed !== "string" || !manifest.seed || manifest.seed.length > 200) throw new Error("Parity manifest seed invalid");
  if (!Array.isArray(manifest.excludedCalibrationIds) || manifest.excludedCalibrationIds.length !== 12 || new Set(manifest.excludedCalibrationIds).size !== 12 || manifest.excludedCalibrationIds.some((id) => typeof id !== "string" || !id)) throw new Error("Parity exclusions invalid");
  for (const checksum of [manifest.checksums.plugin, manifest.checksums.rubric]) if (!/^[0-9a-f]{64}$/.test(checksum.sha256) || typeof checksum.source !== "string" || !checksum.source) throw new Error("Parity checksum invalid");
  if (manifest.stratification.primary !== "skill-line-length-sextile-x-bundle-present" || !Array.isArray(manifest.stratification.lengthSextileUpperBounds) || manifest.stratification.lengthSextileUpperBounds.length !== 5 || manifest.stratification.lengthSextileUpperBounds.some((value, index, all) => !Number.isSafeInteger(value) || value < 1 || (index && value < all[index - 1]))) throw new Error("Parity stratification invalid");
  const all = [];
  for (const [split, size] of Object.entries(splitSizes)) {
    exactKeys(manifest.overlayMinimums[split], Object.keys(OVERLAY_MINIMUMS[split]), `${split} overlay minimums`);
    if (hashObject(manifest.overlayMinimums[split]) !== hashObject(OVERLAY_MINIMUMS[split])) throw new Error(`${split} overlay minimum contract invalid`);
    if (manifest.sizes[split] !== size || !Array.isArray(manifest.splits[split]) || manifest.splits[split].length !== size) throw new Error(`Split cardinality invalid: ${split}`);
    manifest.splits[split].forEach(validateSnapshot); all.push(...manifest.splits[split]);
    exactKeys(manifest.coverage[split], ["primaryStrata", "overlays"], `${split} coverage`);
    exactKeys(manifest.coverage[split].overlays, ["nonEnglish", "riskSecurity", "nested", "codeHeavy", "alias", "reference", "script", "asset"], `${split} overlay coverage`);
    if (Object.entries(manifest.coverage[split].primaryStrata).some(([key, value]) => !/^length-s[1-6]:(?:bundle|no-bundle)$/.test(key) || !Number.isSafeInteger(value) || value < 1)) throw new Error(`${split} primary coverage invalid`);
    if (Object.values(manifest.coverage[split].overlays).some((value) => !Number.isSafeInteger(value) || value < 0 || value > size)) throw new Error(`${split} overlay coverage invalid`);
    for (const [overlay, minimum] of Object.entries(manifest.overlayMinimums[split])) if (manifest.coverage[split].overlays[overlay] < minimum) throw new Error(`${split} overlay coverage minimum not met: ${overlay}`);
    if (hashObject(manifest.coverage[split]) !== hashObject(coverage(manifest.splits[split]))) throw new Error(`${split} coverage counts invalid`);
  }
  const ids = all.map((item) => item.id); const groups = all.map((item) => item.duplicateGroupSha256);
  if (new Set(ids).size !== cardinality || new Set(groups).size !== cardinality || ids.some((id) => manifest.excludedCalibrationIds.includes(id))) throw new Error("Split leakage or exclusion failure");
  if (!Array.isArray(manifest.stabilityPanel) || manifest.stabilityPanel.length !== stabilitySize || new Set(manifest.stabilityPanel).size !== stabilitySize || hashObject(manifest.stabilityPanel) !== hashObject(manifest.splits.validation.slice(0, stabilitySize).map((item) => item.id))) throw new Error("Stability panel invalid");
  if (!Array.isArray(manifest.reserveOrder) || new Set(manifest.reserveOrder).size !== manifest.reserveOrder.length || manifest.reserveOrder.some((id) => typeof id !== "string" || !id || ids.includes(id) || manifest.excludedCalibrationIds.includes(id))) throw new Error("Reserve order invalid");
  if (manifest.integrity.algorithm !== "sha256-canonical-json-v1" || !/^[0-9a-f]{64}$/.test(manifest.integrity.corpusIndexSha256) || manifest.integrity.selectionSha256 !== hashObject(manifest.splits) || manifest.integrity.reserveOrderSha256 !== hashObject(manifest.reserveOrder) || manifest.integrity.cardinality !== cardinality || manifest.integrity.uniqueIds !== cardinality || manifest.integrity.uniqueDuplicateGroups !== cardinality || !manifest.integrity.splitsDisjoint || !manifest.integrity.duplicateGroupsDisjoint || !manifest.integrity.excludedIdsAbsent) throw new Error("Integrity proof invalid");
  if (expanded && (!/^[0-9a-f]{64}$/.test(manifest.integrity.parentManifestSha256) || manifest.integrity.expansionSha256 !== expansionIdentity(manifest.integrity.parentManifestSha256, manifest))) throw new Error("Expansion integrity proof invalid");
  return manifest;
}

function parseArgs(argv) {
  const value = (name, fallback) => {
    const index = argv.indexOf(name);
    if (index < 0) return fallback;
    const result = argv[index + 1];
    if (!result || result.startsWith("--")) throw new Error(`${name} requires a value`);
    return result;
  };
  return { seed: value("--seed", DEFAULT_SEED), output: value("--output", null), expand: value("--expand", null), pluginPath: value("--plugin-file", DEFAULT_PLUGIN_PATH), rubricPath: value("--rubric-file", DEFAULT_RUBRIC_PATH) };
}

function readManifestInput(filePath) {
  const absolute = path.resolve(filePath);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 5 * 1024 * 1024) throw new Error("Expansion input must be a regular non-symlink JSON file under 5 MiB");
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "../..");
  const manifest = args.expand
    ? expandParityManifest({ repoRoot, parentManifest: readManifestInput(args.expand) })
    : buildParityManifest({ repoRoot, seed: args.seed, pluginPath: args.pluginPath, rubricPath: args.rubricPath });
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  if (args.output) fs.writeFileSync(path.resolve(args.output), output, { flag: "wx", mode: 0o600 });
  else process.stdout.write(output);
}

module.exports = { DEFAULT_SEED, SPLIT_SIZES, EXPANDED_SPLIT_SIZES, STABILITY_PANEL_SIZE, EXPANDED_STABILITY_PANEL_SIZE, EXPANSION_RULE, OVERLAY_MINIMUMS, buildParityManifest, duplicateGroups, expandParityManifest, normalizedContent, validateParityExpansion, validateParityManifest };
