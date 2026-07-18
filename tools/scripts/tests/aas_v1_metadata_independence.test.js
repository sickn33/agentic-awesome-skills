"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { canonicalJson, sha256 } = require("../../lib/aas-v1/canonical-json");
const { buildDocument } = require("../build-aas-v1-metadata-overrides");
const {
  buildLedger,
  normalizedCandidate,
  parsePairs,
  resolveReviewSource,
} = require("../import-aas-v1-metadata-reviews");

const ROOT = path.resolve(__dirname, "../../..");

function relativeRequireClosure(entryPaths) {
  const seen = new Set();
  const pending = entryPaths.map((entry) => path.resolve(ROOT, entry));
  while (pending.length) {
    const filePath = pending.pop();
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    const source = fs.readFileSync(filePath, "utf8");
    for (const match of source.matchAll(/require\(["'](\.{1,2}\/[^"']+)["']\)/g)) {
      let resolved = path.resolve(path.dirname(filePath), match[1]);
      if (!path.extname(resolved)) resolved += ".js";
      if (fs.existsSync(resolved)) pending.push(resolved);
    }
  }
  return [...seen];
}

test("metadata pipeline dependency paths exclude frozen verification, held-out, and gold inputs", () => {
  const closure = relativeRequireClosure([
    "tools/scripts/build-aas-v1-review-queue.js",
    "tools/scripts/import-aas-v1-metadata-reviews.js",
    "tools/scripts/build-aas-v1-metadata-overrides.js",
    "tools/scripts/build-aas-v1-offline-catalog.js",
    "tools/lib/aas-v1/catalog.js",
  ]);
  for (const filePath of closure) {
    const relative = path.relative(ROOT, filePath).split(path.sep).join("/");
    assert.doesNotMatch(relative, /(^|\/)(verification\/aas-v1|gold|held-?out)(\/|$)/i);
  }
});

test("metadata importer accepts only committed source files and rejects benchmark paths before reading them", () => {
  for (const hostile of [
    "/tmp/audit.json",
    "../audit.json",
    "verification/aas-v1/audit.json",
    "gold/audit.json",
    "heldout/audit.json",
    "held-out/audit.json",
  ]) assert.throws(() => resolveReviewSource(hostile));

  assert.throws(() => normalizedCandidate({
    id: "ai-agents-architect",
    intents: ["agent-mcp-development"],
    supportedCanonicalCapabilities: ["agent-boundaries"],
    contentEvidence: { path: "../../verification/aas-v1/gold.json", sha256: `sha256-${"0".repeat(64)}` },
    selectionProvenance: { ruleVersion: "fixture" },
  }, { ruleVersion: "fixture" }), /not canonical/);
});

test("committed review sources reproduce the ledger and bind every selection rule", () => {
  const parsed = parsePairs([]);
  const rebuilt = buildLedger(parsed.pairs);
  const stored = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/lib/aas-v1/metadata-reviews.v1.json"), "utf8"));
  assert.equal(canonicalJson(rebuilt), canonicalJson(stored));
  assert.equal(rebuilt.scope.reviewedSkillCount, 121);
  for (const audit of rebuilt.sourceAudits) {
    assert.equal(sha256(fs.readFileSync(path.join(ROOT, "tools/metadata-sources/aas-v1", audit.semanticPath))), audit.semanticDigest);
    assert.equal(sha256(fs.readFileSync(path.join(ROOT, "tools/metadata-sources/aas-v1", audit.fieldPath))), audit.fieldDigest);
    assert.match(audit.selectorDigest, /^sha256-[a-f0-9]{64}$/);
  }
  for (const review of Object.values(rebuilt.skills)) {
    for (const selection of review.selectionEvidence) {
      assert.equal(typeof selection.provenance.ruleVersion, "string");
      assert.match(selection.selectorDigest, /^sha256-[a-f0-9]{64}$/);
    }
  }
  assert.doesNotThrow(() => buildDocument());
});

test("catalog gate verifies the review ledger before building metadata and offline assets", () => {
  const command = require(path.join(ROOT, "package.json")).scripts["check:aas-v1-catalog"];
  const importIndex = command.indexOf("import-aas-v1-metadata-reviews.js --check");
  const overrideIndex = command.indexOf("build-aas-v1-metadata-overrides.js --check");
  assert.ok(importIndex >= 0 && overrideIndex > importIndex);
  assert.doesNotMatch(command, /run-aas-v1-tuning|verification\/aas-v1|held-?out|gold/i);
});
