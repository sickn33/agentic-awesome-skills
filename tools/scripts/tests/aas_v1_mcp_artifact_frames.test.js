"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");
const readline = require("node:readline");
const { PassThrough } = require("node:stream");
const test = require("node:test");
const core = require("../../lib/aas-v1");
const { parseMcpRequestLine, runStdio, MAX_LINE_BYTES } = require("../../lib/aas-v1/mcp");

const ROOT = path.resolve(__dirname, "../../..");
const frame = (name, args, extra = {}) => Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args, ...extra } }));

test("only bounded artifact arguments and Codex metadata may exceed the ordinary request limit", () => {
  for (const name of ["compose_stack", "inspect_stack", "diff_stack", "export_selection_evidence", "inspect_selection_evidence"]) {
    assert.doesNotThrow(() => parseMcpRequestLine(frame(name, { payload: "x".repeat(8192) })));
    assert.throws(() => parseMcpRequestLine(frame(name, { payload: "x".repeat(MAX_LINE_BYTES) })), { code: "AAS_MCP_LINE_TOO_LARGE" });
    assert.throws(() => parseMcpRequestLine(frame(name, {}, { _meta: { arbitrary: "x".repeat(8192) } })), { code: "AAS_MCP_LINE_TOO_LARGE" });
    assert.throws(() => parseMcpRequestLine(Buffer.concat([frame(name, { payload: "x".repeat(8192) }), Buffer.alloc(65, 32)])), { code: "AAS_MCP_LINE_TOO_LARGE" });
  }
  for (const name of ["search_skills", "get_skill", "list_skill_files", "read_skill_file", "unknown_tool"]) {
    assert.throws(() => parseMcpRequestLine(frame(name, { payload: "x".repeat(8192) })), { code: "AAS_MCP_LINE_TOO_LARGE" });
  }
  const combined = frame("inspect_stack", { payload: "x".repeat(8192) }, { _meta: { "x-codex-turn-metadata": { pad: "x".repeat(8192) } } });
  assert.doesNotThrow(() => parseMcpRequestLine(combined));
});

test("parsed request-size failures keep a bounded request ID and do not answer notifications", async () => {
  const input = new PassThrough(), output = new PassThrough();
  const chunks = [];
  output.on("data", (chunk) => chunks.push(chunk));
  const runner = runStdio({ handle: async () => { throw new Error("Oversized ordinary request reached server"); } }, { input, output, diagnostics: new PassThrough() });
  const base = JSON.parse(frame("search_skills", { query: "x".repeat(8192) }));
  input.write(`${JSON.stringify({ ...base, id: "bounded-request" })}\n`);
  const notification = { ...base }; delete notification.id;
  input.write(`${JSON.stringify(notification)}\n`);
  input.write(`${JSON.stringify({ ...base, id: "x".repeat(8192) })}\n`);
  input.write('{"id":1,"id":2}\n');
  input.end(); await runner.completed();
  const messages = Buffer.concat(chunks).toString().trim().split("\n").map(JSON.parse);
  assert.equal(messages.length, 3);
  assert.equal(messages[0].id, "bounded-request");
  assert.equal(messages[0].error.code, -32602);
  assert.equal(messages[0].error.data.code, "AAS_MCP_LINE_TOO_LARGE");
  assert.equal(messages[1].id, null);
  assert.equal(messages[2].id, null);
  assert.equal(messages[2].error.data.code, "AAS_MCP_JSON_DUPLICATE_KEY");
});

test("real stdio round trip composes, inspects, exports and validates artifacts above 4 KiB", { timeout: 30000 }, async (t) => {
  const child = spawn(process.execPath, [path.join(ROOT, "tools/bin/aas-mcp.js")], { cwd: ROOT, env: { PATH: process.env.PATH }, stdio: ["pipe", "pipe", "pipe"] });
  const closed = once(child, "close");
  t.after(() => { child.kill(); });
  const pending = new Map();
  let nextId = 0, stderr = "";
  child.stderr.on("data", (data) => { stderr += data; });
  const lines = readline.createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    const response = JSON.parse(line);
    const waiter = pending.get(response.id);
    if (!waiter) return;
    pending.delete(response.id); clearTimeout(waiter.timer);
    if (response.error) waiter.reject(new Error(JSON.stringify(response.error)));
    else waiter.resolve(response.result);
  });
  const request = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`stdio request ${id} timed out`)); }, 5000);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
  t.after(() => { for (const waiter of pending.values()) clearTimeout(waiter.timer); lines.close(); });
  const call = async (name, args) => {
    const result = await request("tools/call", { name, arguments: args });
    assert.equal(result.isError, false, JSON.stringify(result.structuredContent));
    return result.structuredContent;
  };
  await request("initialize", { protocolVersion: core.protocolVersion, capabilities: {}, clientInfo: { name: "stdio-regression", version: "1" } });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })}\n`);
  await call("search_skills", { query: "javascript", limit: 5 });
  await call("get_skill", { id: "javascript-pro", includeContent: true });
  const selection = { name: "artifact-frame-regression", profile: { goals: ["test framing"], constraints: Array.from({ length: 32 }, (_, index) => `${String(index).padStart(2, "0")}-${"x".repeat(125)}`) }, skillIds: ["javascript-pro"] };
  assert.ok(frame("compose_stack", selection).length > 4096);
  const composed = await call("compose_stack", selection);
  assert.ok(frame("inspect_stack", { manifest: composed.manifest }).length > 4096);
  assert.equal((await call("inspect_stack", { manifest: composed.manifest })).status, "valid");
  const files = Array.from({ length: 50 }, (_, index) => ({ path: `src/file-${String(index).padStart(2, "0")}.js`, size: 1, sha256: core.sha256("fixture") }));
  const descriptor = { schemaVersion: 1, files };
  const args = {
    manifestDigest: composed.manifestDigest,
    project: { ...descriptor, fingerprint: core.sha256(core.canonicalJson(descriptor)) },
    dimensions: core.evidence.DIMENSION_IDS.map((id) => ({ id, status: id === "testing-quality" ? "applicable" : "not-applicable", capabilityIds: id === "testing-quality" ? ["framing"] : [] })),
    capabilities: [{ id: "framing", dimensionId: "testing-quality", status: "covered", selectedSkillIds: ["javascript-pro"], evidence: [{ path: files[0].path, sha256: files[0].sha256 }] }],
  };
  assert.ok(frame("export_selection_evidence", args).length > 4096);
  const exported = await call("export_selection_evidence", args);
  const inspected = await call("inspect_selection_evidence", { evidence: exported.evidence, manifest: composed.manifest });
  assert.equal(inspected.status, "valid");
  assert.equal(exported.evidence.payload.processTrace.calls.length, 4);
  child.stdin.end();
  const [code] = await closed;
  assert.equal(code, 0); assert.equal(stderr, "");
});
