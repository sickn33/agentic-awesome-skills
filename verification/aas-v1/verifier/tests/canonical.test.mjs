import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson, digestJson, parseCanonicalJson } from "../lib/canonical.mjs";

test("canonical JSON uses deterministic UTF-16 property ordering", () => {
  const value = { "\udfff": 1, "\ue000": 2, a: 3 };
  assert.equal(canonicalJson(value), '{"a":3,"\\udfff":1,"\ue000":2}');
  assert.equal(parseCanonicalJson(canonicalJson(value)).a, 3);
  assert.match(digestJson(value), /^sha256-[a-f0-9]{64}$/);
});

test("canonical JSON rejects values outside the JSON data model", () => {
  assert.throws(() => canonicalJson({ value: undefined }), /cannot encode/);
  assert.throws(() => canonicalJson(Number.NaN), /non-finite/);
});
