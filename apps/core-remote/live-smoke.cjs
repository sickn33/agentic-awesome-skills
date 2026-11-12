const assert = require("node:assert/strict");
const { assertToolContract } = require("./tool-contract.cjs");
const endpoint =
  process.env.AAS_MCP_URL || "https://aas-core.aas-core-remote.workers.dev/mcp";
let sid;
const checks = [];
async function call(method, params = {}, notification = false) {
  const r = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(sid ? { "mcp-session-id": sid } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      ...(notification ? {} : { id: checks.length + 1 }),
      method,
      params,
    }),
  });
  const txt = await r.text();
  let body;
  try {
    body = txt ? JSON.parse(txt) : null;
  } catch {
    throw Error(`HTTP ${r.status}: ${txt.slice(0, 200)}`);
  }
  assert.ok(r.ok, `HTTP ${r.status}: ${txt.slice(0, 200)}`);
  return { r, body };
}
(async () => {
  const init = await call("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "AAS deployed smoke", version: "0.1.0" },
  });
  sid = init.r.headers.get("mcp-session-id");
  assert.ok(sid);
  checks.push("initialize");
  await call("notifications/initialized", {}, true);
  checks.push("initialized");
  const tools = (await call("tools/list")).body.result.tools;
  assertToolContract(tools);
  for (const t of tools)
    for (const k of ["readOnlyHint", "openWorldHint", "destructiveHint"])
      assert.equal(typeof t.annotations[k], "boolean");
  checks.push("nine tools and annotations");
  async function tool(name, args, expectedError = false) {
    const x = (await call("tools/call", { name, arguments: args })).body;
    assert.equal(
      x.result?.isError,
      expectedError,
      JSON.stringify(x).slice(0, 400),
    );
    checks.push(name + (expectedError ? " expected rejection" : ""));
    return x.result.structuredContent || JSON.parse(x.result.content[0].text);
  }
  await tool("search_skills", { query: "python", limit: 3 });
  await tool("get_skill", { id: "python-pro", includeContent: true });
  await tool("list_skill_files", { id: "python-pro" });
  await tool("read_skill_file", { id: "python-pro", path: "SKILL.md" });
  const result = await tool("compose_stack", {
    profile: { goals: ["Build a Python API"] },
    skillIds: ["python-pro"],
  });
  await tool("inspect_stack", { manifest: result.manifest });
  await tool("diff_stack", {
    stack: result.manifest,
    toCatalogDigest: result.manifest.catalog.integrity,
  });
  const core = require("../../tools/lib/aas-v1");
  const descriptor = {
    schemaVersion: 1,
    files: [
      { path: "package.json", size: 2, sha256: core.sha256(Buffer.from("{}")) },
    ],
  };
  const project = {
    ...descriptor,
    fingerprint: core.sha256(core.canonicalJson(descriptor)),
  };
  const dimensions = core.evidence.DIMENSION_IDS.map((id) => ({
    id,
    status: id === "architecture-runtime" ? "applicable" : "not-applicable",
    capabilityIds: id === "architecture-runtime" ? ["api-runtime"] : [],
  }));
  const capabilities = [
    {
      id: "api-runtime",
      dimensionId: "architecture-runtime",
      status: "covered",
      evidence: [{ path: "package.json", sha256: descriptor.files[0].sha256 }],
      selectedSkillIds: ["python-pro"],
    },
  ];
  const exported = await tool("export_selection_evidence", {
    manifestDigest: result.manifestDigest,
    project,
    dimensions,
    capabilities,
  });
  await tool("inspect_selection_evidence", {
    evidence: exported.evidence,
    manifest: result.manifest,
  });

  await tool("get_skill", { id: "zz-aas-nonexistent-fixture-20261029" }, true);
  await tool(
    "read_skill_file",
    { id: "python-pro", path: "../../package.json" },
    true,
  );
  const invalid = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
  });
  assert.equal(invalid.status, 400);
  checks.push("missing session rejected");
  const deleted = await fetch(endpoint, {
    method: "DELETE",
    headers: { "mcp-session-id": sid },
  });
  assert.equal(deleted.status, 204);
  checks.push("delete session");
  console.log(JSON.stringify({ endpoint, checks, status: "passed" }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
