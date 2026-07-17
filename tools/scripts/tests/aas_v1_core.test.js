"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  canonicalJson,
  loadBundledCatalog,
  judgment,
  recommendStack,
  searchSkills,
  syntheticCatalog,
  notApplicable,
} = require("../../lib/aas-v1");

function skill(id, { tokens, capabilities, risk = "safe", setup = "none", codex = "supported", claude = "supported" }) {
  const evidence = [{ type: "maintainer-review", id: `review:${id}` }];
  return {
    id,
    name: id,
    description: "",
    category: "test",
    tags: [],
    triggers: [],
    searchTokens: tokens,
    recommendationTokens: tokens,
    metadata: {
      capabilities: capabilities ? judgment(capabilities, evidence) : judgment(null),
      risk: judgment(risk, evidence),
      source: judgment("community", evidence),
      license: judgment(null),
      targets: { codex: judgment(codex, evidence), claude: judgment(claude, evidence) },
      setup: judgment(setup, evidence),
      dependencies: judgment([], evidence),
      conflicts: judgment([], evidence),
      validation: judgment(true, evidence),
      tests: judgment(null),
      reviews: judgment(true, evidence),
    },
    untrustedContentPath: null,
  };
}

const input = {
  intent: "test-qa-automation",
  targets: [{ host: "codex", scope: "project" }],
  profile: { languages: ["TypeScript"], frameworks: ["React"] },
  criticalGoals: ["unit-testing"],
  nonCriticalGoals: ["coverage-reporting"],
  policy: { allowedRisk: ["none", "safe"], requireKnownSource: true, allowManualSetup: false },
};

test("canonical JSON is byte-stable across object insertion order", () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), canonicalJson({ a: { x: 3, y: 2 }, z: 1 }));
  assert.throws(() => canonicalJson({ invalid: Number.NaN }), /Non-finite/);
  assert.throws(() => canonicalJson({ invalid: undefined }), /Unsupported/);
});

test("recommendation input is schema-validated before normalization", () => {
  const catalog = syntheticCatalog([]);
  assert.throws(
    () => recommendStack(catalog, { ...input, policy: { ...input.policy, requireKnownSource: "true" } }),
    { code: "AAS_INPUT_SCHEMA_INVALID" },
  );
  assert.throws(
    () => recommendStack(catalog, { ...input, targets: [{ host: "unknown", scope: "project" }] }),
    { code: "AAS_INPUT_SCHEMA_INVALID" },
  );
  assert.throws(
    () => recommendStack(catalog, { ...input, unexpected: true }),
    { code: "AAS_INPUT_SCHEMA_INVALID" },
  );
});

test("recommendation is invariant to catalog order", () => {
  const entries = [
    skill("unit-skill", { tokens: ["unit", "testing", "typescript"], capabilities: ["unit-testing"] }),
    skill("coverage-skill", { tokens: ["coverage", "reporting"], capabilities: ["coverage-reporting"] }),
    skill("unknown-skill", { tokens: ["unit", "testing"], capabilities: null }),
  ];
  const first = recommendStack(syntheticCatalog(entries), input);
  const second = recommendStack(syntheticCatalog([...entries].reverse()), input);
  assert.equal(first.canonicalJson, second.canonicalJson);
  assert.deepEqual(first.proposedStack.sort(), ["coverage-skill", "unit-skill"]);
  assert.equal(first.status, "complete");
  assert.equal(first.measures.goalCoverage, 1000);
  assert.equal(first.discoveryCandidates[0].id, "unknown-skill");
});

test("recommendation is invariant to non-semantic skill ID permutations", () => {
  const makeEntries = (prefix) => [
    skill(`${prefix}-unit`, { tokens: ["unit", "testing", "typescript"], capabilities: ["unit-testing"] }),
    skill(`${prefix}-coverage`, { tokens: ["coverage", "reporting"], capabilities: ["coverage-reporting"] }),
  ];
  const first = recommendStack(syntheticCatalog(makeEntries("alpha")), input);
  const second = recommendStack(syntheticCatalog(makeEntries("omega")), input);
  const semanticProjection = (result) => ({
    status: result.status,
    factors: result.recommended.map((candidate) => candidate.factors),
    coveredGoals: result.coveredGoals,
    uncoveredGoals: result.uncoveredGoals,
    measures: result.measures,
  });
  assert.deepEqual(semanticProjection(first), semanticProjection(second));
});

test("recommendation factors ignore search-only ID tokens", () => {
  const firstSkill = skill("alpha-unit", { tokens: ["unit", "testing"], capabilities: ["unit-testing"] });
  const secondSkill = skill("omega-unit", { tokens: ["unit", "testing"], capabilities: ["unit-testing"] });
  firstSkill.searchTokens = ["alpha", ...firstSkill.searchTokens];
  secondSkill.searchTokens = ["omega", ...secondSkill.searchTokens];
  const first = recommendStack(syntheticCatalog([firstSkill]), input);
  const second = recommendStack(syntheticCatalog([secondSkill]), input);
  assert.deepEqual(first.recommended[0].factors, second.recommended[0].factors);
});

test("composition includes eligible dependencies and refuses conflicts", () => {
  const base = skill("base", { tokens: ["typescript"], capabilities: [] });
  const dependent = skill("dependent", { tokens: ["unit", "testing"], capabilities: ["unit-testing"] });
  dependent.metadata.dependencies = judgment(["base"], [{ type: "maintainer-review", id: "review:dependent" }]);
  const conflict = skill("conflict", { tokens: ["coverage", "reporting"], capabilities: ["coverage-reporting"] });
  conflict.metadata.conflicts = judgment(["base"], [{ type: "maintainer-review", id: "review:conflict" }]);
  const result = recommendStack(syntheticCatalog([base, dependent, conflict]), input);
  assert.deepEqual(result.proposedStack, ["base", "dependent"]);
  assert.equal(result.status, "partial");
  assert.deepEqual(result.uncoveredGoals, ["coverage-reporting"]);
});

test("composition is coverage-first even when a partial candidate has a much larger lexical score", () => {
  const complete = skill("complete", {
    tokens: ["rare"],
    capabilities: ["unit-testing", "coverage-reporting"],
  });
  const partial = skill("partial", {
    tokens: ["test", "qa", "automation", "typescript", "react", "unit", "coverage", "reporting"],
    capabilities: ["unit-testing"],
  });
  const result = recommendStack(syntheticCatalog([partial, complete]), input);
  assert.deepEqual(result.proposedStack, ["complete"]);
  assert.equal(result.status, "complete");
});

test("composition abstains instead of adding non-critical-only skills while critical goals remain uncovered", () => {
  const result = recommendStack(syntheticCatalog([
    skill("coverage-only", { tokens: ["coverage", "reporting"], capabilities: ["coverage-reporting"] }),
  ]), input);
  assert.deepEqual(result.proposedStack, []);
  assert.equal(result.status, "insufficientCoverage");
  assert.deepEqual(result.uncoveredGoals, ["coverage-reporting", "unit-testing"]);
});

test("goal matching requires an exact versioned capability rather than a shared token", () => {
  const result = recommendStack(syntheticCatalog([
    skill("generic", { tokens: ["unit", "testing"], capabilities: ["testing"] }),
  ]), input);
  assert.equal(result.status, "insufficientCoverage");
  assert.deepEqual(result.coveredGoals, []);
});

test("unknown metadata is discovery, while proven policy violations are excluded", () => {
  const catalog = syntheticCatalog([
    skill("unknown", { tokens: ["unit", "testing"], capabilities: null }),
    skill("offensive", { tokens: ["unit", "testing"], capabilities: ["unit-testing"], risk: "offensive" }),
    skill("manual", { tokens: ["unit", "testing"], capabilities: ["unit-testing"], setup: "manual" }),
  ]);
  const result = recommendStack(catalog, input);
  assert.equal(result.status, "insufficientCoverage");
  assert.deepEqual(result.proposedStack, []);
  assert.deepEqual(result.discoveryCandidates.map((entry) => entry.id), ["unknown"]);
  assert.deepEqual(result.exclusions.map((entry) => entry.id).sort(), ["manual", "offensive"]);
});

test("reviewed known-empty capabilities are excluded instead of presented as unknown discovery", () => {
  const unsupported = skill("unsupported", { tokens: ["unit", "testing"], capabilities: [] });
  unsupported.metadata.capabilities = notApplicable([{ type: "maintainer-review", id: "review:unsupported" }]);
  const result = recommendStack(syntheticCatalog([unsupported]), input);
  assert.deepEqual(result.discoveryCandidates, []);
  assert.deepEqual(result.exclusions, [{
    id: "unsupported",
    reasonCodes: ["AAS_ELIGIBILITY_CAPABILITY_NOT_SUPPORTED"],
  }]);
});

test("profile rejects raw repository data fields", () => {
  assert.throws(
    () => recommendStack(syntheticCatalog([]), { ...input, profile: { rawFiles: [{ path: "secret" }] } }),
    (error) => error.code === "AAS_INPUT_PROFILE_FIELD_FORBIDDEN",
  );
});

test("search is bounded and stable", () => {
  const catalog = syntheticCatalog([
    skill("beta-test", { tokens: ["react", "testing"], capabilities: null }),
    skill("alpha-test", { tokens: ["react", "testing"], capabilities: null }),
  ]);
  assert.deepEqual(searchSkills(catalog, { query: "react", limit: 2 }).results.map((entry) => entry.id), ["alpha-test", "beta-test"]);
  assert.doesNotThrow(() => canonicalJson(searchSkills(catalog, { query: "react", limit: 2 })));
  assert.throws(() => searchSkills(catalog, { query: "x", limit: 51 }), (error) => error.code === "AAS_INPUT_LIMIT_INVALID");
});

test("bundled catalog exposes every canonical registry ID exactly once", () => {
  const catalog = loadBundledCatalog();
  assert.equal(catalog.skills.length, 1965);
  assert.equal(new Set(catalog.skills.map((entry) => entry.id)).size, 1965);
  assert.ok(catalog.skills.some((entry) => entry.id === "2d-games"));
  assert.ok(!catalog.skills.some((entry) => entry.id === "game-development/2d-games"));
});
