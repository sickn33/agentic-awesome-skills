"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateInstance } = require("../../lib/aas-v1/schema-validator");
const {
  canonicalJson,
  loadBundledCatalog,
  judgment,
  recommendStack,
  searchSkills,
  syntheticCatalog,
  notApplicable,
} = require("../../lib/aas-v1");
const expectedSkillCount = require("../../../skills_index.json").length;

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
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.deepEqual(first.proposedStack.sort(), ["coverage-skill", "unit-skill"]);
  assert.equal(first.status, "complete");
  assert.equal(first.measures.goalCoverage, 1000);
  assert.equal(first.discoveryCandidates[0].id, "unknown-skill");
  assert.equal(first.recommended[0].metadata.targets.status, "known");
  assert.equal(first.recommended[0].metadata.targets.value.codex.value, "supported");
  assert.equal(validateInstance("recommendation-output.schema.json", first), first);
});

test("natural project goals expand into a multi-lane stack deterministically", () => {
  const entries = [
    skill("extension-lane", {
      tokens: ["chrome", "extension", "manifest-v3"],
      capabilities: [
        "browser-extension-architecture",
        "browser-extension-permissions",
        "extension-context-messaging",
        "manifest-v3-development",
      ],
    }),
    skill("build-lane", { tokens: ["build", "ci"], capabilities: ["pipeline-design", "reproducible-ci"] }),
    skill("unit-lane", { tokens: ["test", "unit", "coverage"], capabilities: ["coverage-reporting", "unit-test-runner"] }),
    skill("browser-lane", {
      tokens: ["test", "browser", "e2e"],
      capabilities: ["critical-browser-journeys", "cross-browser-execution", "failure-diagnostics"],
    }),
    skill("accessibility-lane", { tokens: ["test", "accessibility"], capabilities: ["accessibility-audit"] }),
    skill("security-lane", {
      tokens: ["security", "hardening"],
      capabilities: ["dependency-risk-review", "security-requirements", "trust-boundary-review"],
    }),
    skill("release-lane", { tokens: ["release"], capabilities: ["post-release-verification", "release-procedure"] }),
  ];
  const naturalInput = {
    ...input,
    intent: "web-application-delivery",
    profile: {
      projectType: "Manifest V3 browser extension",
      languages: ["JavaScript"],
      frameworks: ["Vitest", "JSDOM"],
    },
    criticalGoals: ["build", "test", "security", "release"],
    nonCriticalGoals: [],
    maxSkills: 8,
  };
  const first = recommendStack(syntheticCatalog(entries), naturalInput);
  const second = recommendStack(syntheticCatalog([...entries].reverse()), naturalInput);
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(first.status, "complete");
  assert.deepEqual(first.proposedStack.slice().sort(), entries.map((entry) => entry.id).sort());
  assert.equal(first.proposedStack[0], "extension-lane");
  assert.equal(first.proposedStack.length, 7);
  assert.deepEqual(first.normalizedInput.criticalGoals, [
    "accessibility-audit",
    "browser-extension-architecture",
    "browser-extension-permissions",
    "coverage-reporting",
    "critical-browser-journeys",
    "cross-browser-execution",
    "dependency-risk-review",
    "extension-context-messaging",
    "failure-diagnostics",
    "pipeline-design",
    "post-release-verification",
    "release-procedure",
    "reproducible-ci",
    "security-requirements",
    "trust-boundary-review",
    "unit-test-runner",
    "manifest-v3-development",
  ].sort());
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
  assert.doesNotThrow(() => searchSkills(catalog, { query: "c++ node.js api/v1", limit: 2 }));
  assert.throws(() => searchSkills(catalog, { query: "^(a+)+$", limit: 2 }), { code: "AAS_INPUT_QUERY_INVALID" });
  assert.doesNotThrow(() => canonicalJson(searchSkills(catalog, { query: "react", limit: 2 })));
  assert.throws(() => searchSkills(catalog, { query: "x", limit: 51 }), (error) => error.code === "AAS_INPUT_LIMIT_INVALID");
});

test("bundled catalog exposes every canonical registry ID exactly once", () => {
  const catalog = loadBundledCatalog();
  assert.equal(catalog.skills.length, expectedSkillCount);
  assert.equal(new Set(catalog.skills.map((entry) => entry.id)).size, expectedSkillCount);
  assert.ok(catalog.skills.some((entry) => entry.id === "2d-games"));
  assert.ok(!catalog.skills.some((entry) => entry.id === "game-development/2d-games"));
});

test("bundled catalog composes a domain-first VibePalette browser-extension stack", () => {
  const result = recommendStack(loadBundledCatalog(), {
    intent: "web-application-delivery",
    targets: [{ host: "codex", scope: "project" }],
    profile: {
      projectType: "Manifest V3 browser extension for Chrome and Edge",
      languages: ["JavaScript", "HTML", "CSS"],
      frameworks: ["Vitest", "JSDOM"],
      context: "Privacy-first extension with popup UI, browser smoke tests, deterministic zip packaging and GitHub release",
      constraints: ["vanilla-js", "minimal-permissions", "offline-first"],
      request: "Build, test, harden, package and release the extension",
    },
    criticalGoals: ["build", "test", "security", "release"],
    nonCriticalGoals: [],
    minimumNonCriticalGoalCoverage: 0.8,
    policy: { allowedRisk: ["none", "safe", "unknown"], requireKnownSource: false, allowManualSetup: true },
    maxSkills: 8,
  });
  assert.equal(result.status, "partial");
  assert.ok(result.proposedStack.length >= 5 && result.proposedStack.length <= 8);
  assert.equal(result.proposedStack[0], "chrome-extension-developer");
  assert.ok(result.proposedStack.includes("chrome-extension-developer"));
  for (const goal of [
    "browser-extension-architecture",
    "browser-extension-permissions",
    "extension-context-messaging",
    "manifest-v3-development",
    "accessibility-audit",
    "unit-test-runner",
    "critical-browser-journeys",
    "security-requirements",
    "post-release-verification",
  ]) {
    assert.ok(result.coveredGoals.includes(goal), `expected VibePalette stack to cover ${goal}`);
  }
  assert.ok(result.discoveryCandidates.some((candidate) => candidate.id === "browser-extension-builder"));
  assert.equal(validateInstance("recommendation-output.schema.json", result), result);
});
