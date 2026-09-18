"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const core = require("../../lib/aas-v1");
const { validateInstance } = require("../../lib/aas-v1/schema-validator");

const canonicalSkillIds = require("../../../skills_index.json")
  .map((entry) => entry.id)
  .sort();

function selection(skillIds) {
  return {
    name: "agent-selected-stack",
    targets: [
      { host: "codex", scope: "project" },
      { host: "claude", scope: "project" },
    ],
    profile: {
      goals: ["exercise the selected skill"],
      projectType: "catalog calibration",
      languages: [],
      frameworks: [],
      constraints: [],
    },
    skillIds,
  };
}

function assertDoesNotContainKeys(value, forbiddenKeys) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!forbiddenKeys.has(key), `unexpected retired field: ${key}`);
    assertDoesNotContainKeys(child, forbiddenKeys);
  }
}

test("canonical JSON is byte-stable across object insertion order", () => {
  assert.equal(
    core.canonicalJson({ z: 1, a: { y: 2, x: 3 } }),
    core.canonicalJson({ a: { x: 3, y: 2 }, z: 1 }),
  );
  assert.throws(() => core.canonicalJson({ invalid: Number.NaN }), /Non-finite/);
  assert.throws(() => core.canonicalJson({ invalid: undefined }), /Unsupported/);
});

test("empty-query pagination enumerates the complete canonical catalog exactly once", () => {
  const catalog = core.loadBundledCatalog();
  const enumerated = [];
  let cursor = 0;

  do {
    const page = core.searchSkills(catalog, { cursor, limit: 50 });
    assert.equal(page.cursor, cursor);
    assert.equal(page.totalMatches, canonicalSkillIds.length);
    assert.equal(page.resultCount, page.results.length);
    enumerated.push(...page.results.map((entry) => entry.id));
    cursor = page.nextCursor;
  } while (cursor !== null);

  assert.deepEqual(enumerated, canonicalSkillIds);
  assert.equal(new Set(enumerated).size, canonicalSkillIds.length);
  assert.equal(catalog.skills.length, canonicalSkillIds.length);
});

test("search retrieval preserves catalog order without scores or relevance ranking", () => {
  const catalog = {
    skills: [
      { id: "z-first", name: "Z first", category: "test", searchTokens: ["alpha"], description: "", tags: [], triggers: [] },
      { id: "a-many", name: "A many", category: "test", searchTokens: ["alpha", "beta"], description: "", tags: [], triggers: [] },
      { id: "m-second", name: "M second", category: "test", searchTokens: ["beta", "many"], description: "", tags: [], triggers: [] },
      { id: "unrelated", name: "Unrelated", category: "test", searchTokens: ["gamma"], description: "", tags: [], triggers: [] },
    ],
  };

  const firstPage = core.searchSkills(catalog, { query: "alpha beta", cursor: 0, limit: 2 });
  const secondPage = core.searchSkills(catalog, { query: "alpha beta", cursor: firstPage.nextCursor, limit: 2 });
  assert.deepEqual(firstPage.results.map((entry) => entry.id), ["z-first", "a-many"]);
  assert.deepEqual(secondPage.results.map((entry) => entry.id), ["m-second"]);
  assert.equal(firstPage.totalMatches, 3);
  assert.equal(secondPage.nextCursor, null);
  for (const result of [...firstPage.results, ...secondPage.results]) {
    assert.equal(Object.hasOwn(result, "score"), false);
    assert.equal(Object.hasOwn(result, "rank"), false);
  }

  const exact = core.searchSkills(catalog, { query: "a-many", limit: 50 });
  assert.deepEqual(exact.results.map((entry) => entry.id), ["a-many", "m-second"]);
});

test("every canonical skill is directly gettable and agent-composable", () => {
  const catalog = core.loadBundledCatalog();

  for (const id of canonicalSkillIds) {
    const skill = core.getSkill(catalog, id);
    assert.equal(skill.id, id);

    const composed = core.composeStack(catalog, selection([id]));
    assert.equal(composed.ok, true);
    assert.equal(composed.status, "composed");
    assert.equal(composed.selectionSource, "agent");
    assert.deepEqual(composed.selectedSkills.map((entry) => entry.id), [id]);
    assert.deepEqual(composed.manifest.skills, [{ id }]);
    assert.equal(validateInstance("stack-manifest.schema.json", composed.manifest), composed.manifest);
  }
});

test("composition rejects unknown, malformed, and duplicate skill IDs", () => {
  const catalog = core.loadBundledCatalog();
  const knownId = canonicalSkillIds[0];

  assert.throws(
    () => core.composeStack(catalog, selection(["skill-that-is-not-in-the-catalog"])),
    { code: "AAS_SKILL_NOT_FOUND" },
  );
  assert.throws(
    () => core.composeStack(catalog, selection(["../unsafe-skill"])),
    { code: "AAS_SELECTION_INPUT_INVALID" },
  );
  assert.throws(
    () => core.composeStack(catalog, selection([knownId, knownId])),
    { code: "AAS_SELECTION_INPUT_INVALID" },
  );
});

test("Core exposes descriptive catalog data and agent selections without policy or recommendation fields", () => {
  const catalog = core.loadBundledCatalog();
  const composed = core.composeStack(catalog, selection(canonicalSkillIds.slice(0, 3)));
  const search = core.searchSkills(catalog, { query: canonicalSkillIds[0], limit: 3 });
  const forbiddenKeys = new Set([
    "policy",
    "metadata",
    "recommendationTokens",
    "recommended",
    "recommendations",
    "proposedStack",
    "discoveryCandidates",
    "exclusions",
    "score",
    "rank",
  ]);

  assert.equal(core.recommendStack, undefined);
  assert.equal(core.judgment, undefined);
  assert.equal(core.notApplicable, undefined);
  assertDoesNotContainKeys(catalog.skills[0], forbiddenKeys);
  assertDoesNotContainKeys(search, forbiddenKeys);
  assertDoesNotContainKeys(composed, forbiddenKeys);
  assert.deepEqual(Object.keys(composed.manifest.profile).sort(), [
    "constraints",
    "frameworks",
    "goals",
    "languages",
    "projectType",
  ]);
});
