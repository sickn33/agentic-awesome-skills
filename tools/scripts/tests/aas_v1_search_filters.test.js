"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { searchSkills, normalizeSearchInput } = require("../../lib/aas-v1/search");
const { normalizeToken, normalizeCategory } = require("../../lib/aas-v1/normalize");
const { loadBundledCatalog } = require("../../lib/aas-v1/catalog");
const { McpServer } = require("../../lib/aas-v1/mcp");
const core = require("../../lib/aas-v1");

const catalog = { skills: [
  { id: "a-migration", category: "frontend", searchTokens: ["migration", "react"], tags: ["migration"] },
  { id: "b-postgres", category: "databases", searchTokens: ["migration", "postgres"], tags: ["postgres", "migration"] },
  { id: "c-react", category: "front-end", searchTokens: ["react", "accessibility"], tags: ["react", "a11y"] },
  { id: "d-database", category: "database", searchTokens: ["postgres"], tags: ["postgres"] },
  { id: "e-unknown", category: "uncategorized", searchTokens: [], tags: [], risk: "unknown" },
].map((skill) => ({ name: skill.id, description: "", triggers: [], ...skill })) };

test("any preserves broad retrieval; all requires separate query terms without a fabricated phrase token", () => {
  assert.deepEqual(searchSkills(catalog, { query: "postgres migration" }).results.map((s) => s.id), ["a-migration", "b-postgres", "d-database"]);
  const all = searchSkills(catalog, { query: "postgres migration", matchMode: "all" });
  assert.deepEqual(all.queryTokens, ["migration", "postgres"]);
  assert.deepEqual(all.results.map((s) => s.id), ["b-postgres"]);
  assert.deepEqual(all.results[0].matchedTokens, ["migration", "postgres"]);
  assert.equal(all.results[0].matchReason, "tokens");
  assert.equal(searchSkills(catalog, { query: "!!!", matchMode: "all" }).totalMatches, 0);
  assert.equal(searchSkills(catalog, { query: "a-migr" }).results[0].matchReason, "id-prefix");
});

test("explicit required terms and normalized category/tag filters combine before stable pagination", () => {
  const first = searchSkills(catalog, { requiredTerms: ["postgres"], categories: ["database"], tags: ["postgres"], limit: 1 });
  assert.equal(first.totalMatches, 2);
  assert.deepEqual(first.results.map((s) => s.id), ["b-postgres"]);
  assert.deepEqual(first.results[0].matchedRequiredTerms, ["postgres"]);
  assert.equal(first.results[0].category, "databases");
  assert.equal(first.results[0].categoryFacet, "database");
  const next = searchSkills(catalog, { requiredTerms: ["postgres"], categories: ["databases"], tags: ["postgres"], limit: 1, cursor: first.nextCursor });
  assert.deepEqual(next.results.map((s) => s.id), ["d-database"]);
  assert.equal(next.nextCursor, null);
  assert.deepEqual(searchSkills(catalog, { categories: ["front-end"], tags: ["accessibility"] }).results.map((s) => s.id), ["c-react"]);
  assert.equal(searchSkills(catalog, { requiredTerms: ["migration"], query: "postgres" }).totalMatches, 1);
  assert.equal(searchSkills(catalog).totalMatches, catalog.skills.length);
});

test("filter inputs are bounded and do not access inherited object properties", () => {
  assert.equal(normalizeToken("constructor"), "constructor");
  assert.equal(normalizeCategory("constructor"), "constructor");
  for (const input of [{ matchMode: "best" }, { categories: "database" }, { requiredTerms: ["two words"] },
    { tags: Array(17).fill("react") }, { requiredTerms: ["*"] }, { tags: ["x".repeat(65)] }, { categories: [null] }]) {
    assert.throws(() => normalizeSearchInput(input));
  }
});

test("real audit queries can be narrowed without losing any canonical IDs", () => {
  const current = loadBundledCatalog();
  for (const query of ["postgres migration", "react accessibility"]) {
    const broad = searchSkills(current, { query, limit: 50 });
    const narrowed = searchSkills(current, { query, matchMode: "all", limit: 50 });
    assert.ok(narrowed.totalMatches > 0);
    assert.ok(narrowed.totalMatches < broad.totalMatches);
    for (const skill of narrowed.results) assert.deepEqual(skill.matchedTokens, narrowed.queryTokens);
  }
  const ids = [];
  let cursor = 0;
  do {
    const page = searchSkills(current, { matchMode: "all", cursor, limit: 50 });
    ids.push(...page.results.map((skill) => skill.id)); cursor = page.nextCursor;
  } while (cursor !== null);
  assert.deepEqual(ids, current.skills.map((skill) => skill.id));
});

test("MCP preserves explicit query options in server-owned evidence trace", async () => {
  const server = new McpServer();
  await server.handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
  await server.handle({ jsonrpc: "2.0", method: "notifications/initialized" });
  const args = { query: "react accessibility", matchMode: "all", requiredTerms: ["react"], categories: ["frontend"], tags: [] };
  const response = await server.handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_skills", arguments: args } });
  assert.equal(response.result.isError, false);
  const input = server.selectionTrace.at(-1).input;
  assert.deepEqual(input, { ...args, cursor: 0, limit: 20 });
  let callId = 10;
  const call = async (name, arguments_) => {
    const result = await server.handle({ jsonrpc: "2.0", id: callId++, method: "tools/call", params: { name, arguments: arguments_ } });
    assert.equal(result.result.isError, false, JSON.stringify(result.result.structuredContent));
    return result.result.structuredContent;
  };
  const skillIds = ["senior-frontend"];
  const { manifest, manifestDigest } = await call("compose_stack", { profile: { goals: ["test search evidence"] }, skillIds });
  await call("inspect_stack", { manifest });
  const descriptor = { schemaVersion: 1, files: [{ path: "fixture.txt", size: 7, sha256: core.sha256("fixture") }] };
  const { evidence } = await call("export_selection_evidence", {
    manifestDigest,
    project: { ...descriptor, fingerprint: core.sha256(core.canonicalJson(descriptor)) },
    dimensions: core.evidence.DIMENSION_IDS.map((id) => ({ id, status: id === "testing-quality" ? "applicable" : "not-applicable", capabilityIds: id === "testing-quality" ? ["search-evidence"] : [] })),
    capabilities: [{ id: "search-evidence", dimensionId: "testing-quality", status: "covered", evidence: [{ path: "fixture.txt", sha256: descriptor.files[0].sha256 }], selectedSkillIds: skillIds }],
  });
  assert.deepEqual(evidence.payload.processTrace.calls[0].input, input);
  assert.equal((await call("inspect_selection_evidence", { manifest, evidence })).status, "valid");
  const bad = await server.handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "search_skills", arguments: { tags: ["x".repeat(65)] } } });
  assert.equal(bad.result.isError, true);
  assert.deepEqual(server.selectionTrace.at(-1).input, { inputValid: false });
});
