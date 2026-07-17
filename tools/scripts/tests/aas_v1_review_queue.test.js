"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { canonicalJson } = require("../../lib/aas-v1/canonical-json");
const { buildReviewQueue } = require("../build-aas-v1-review-queue");

const ROOT = path.resolve(__dirname, "../../..");

test("public metadata review queue is deterministic, catalog-wide, and benchmark-independent", () => {
  const built = buildReviewQueue();
  const stored = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/lib/aas-v1/review-queue.v1.json"), "utf8"));
  assert.equal(canonicalJson(built), canonicalJson(stored));
  assert.equal(built.queues.length, 120);
  assert.ok(built.queues.every((queue) => queue.candidates.length <= 25));
  assert.ok(new Set(built.queues.flatMap((queue) => queue.candidates.map((candidate) => candidate.id))).size > 100);
  const source = fs.readFileSync(path.join(ROOT, "tools/scripts/build-aas-v1-review-queue.js"), "utf8");
  assert.doesNotMatch(source, /verification\/aas-v1|held-out|\/gold\//i);
});
