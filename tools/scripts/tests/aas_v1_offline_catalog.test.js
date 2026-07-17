"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { buildArtifacts } = require("../build-aas-v1-offline-catalog");

const ROOT = path.resolve(__dirname, "../../..");

test("offline catalog assets are deterministic, complete, and content-addressed", () => {
  const first = buildArtifacts();
  const second = buildArtifacts();
  assert.equal(first.manifest.skillCount, 1965);
  assert.equal(first.catalogDigest, second.catalogDigest);
  for (const [relativePath, bytes] of first.generated) {
    assert.equal(fs.readFileSync(path.join(ROOT, ...relativePath.split("/"))).equals(bytes), true, relativePath);
  }
  const index = JSON.parse(first.generated.get("data/aas-v1/skill-content-index.v1.json"));
  assert.equal(Object.keys(index.entries).length, 1965);
  assert.ok(index.entries.android_ui_verification);
  assert.ok(index.entries["2d-games"]);
});
