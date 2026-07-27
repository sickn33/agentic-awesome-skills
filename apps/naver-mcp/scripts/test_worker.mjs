/**
 * Drive the bundled Worker in-process, exactly as a Claude connector would.
 *
 * Node 22 provides Request/Response/fetch, so the Worker's default export can
 * be called directly. This covers the JSON-RPC layer - initialize, tools/list,
 * tools/call - which the tool-level tests never touch, and it proves the
 * pasteable bundle works rather than only the module sources.
 */

import worker from "../dist/worker.js";

let failures = 0;
const rows = [];

function check(label, cond, detail = "") {
  if (!cond) failures++;
  rows.push([cond ? "PASS" : "FAIL", label, detail]);
  console.log(`${cond ? "[PASS]" : "[FAIL]"} ${label} ${detail}`);
}

async function rpc(method, params, { accept = "application/json" } = {}) {
  const req = new Request("https://example.workers.dev/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: accept },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const resp = await worker.fetch(req);
  const text = await resp.text();
  if (accept.includes("event-stream")) return { resp, text };
  return { resp, body: text ? JSON.parse(text) : null };
}

const run = async () => {
  // --- protocol handshake -------------------------------------------------
  const init = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  });
  check("initialize returns serverInfo", !!init.body?.result?.serverInfo,
    JSON.stringify(init.body?.result?.serverInfo || {}));
  check("initialize echoes the requested protocol",
    init.body?.result?.protocolVersion === "2025-06-18",
    init.body?.result?.protocolVersion || "");

  // An unknown protocol must still get a supported one back, not an error.
  const oldInit = await rpc("initialize", { protocolVersion: "1999-01-01", capabilities: {} });
  check("initialize falls back for an unknown protocol",
    !!oldInit.body?.result?.protocolVersion,
    oldInit.body?.result?.protocolVersion || "");

  // --- tool discovery -----------------------------------------------------
  const list = await rpc("tools/list", {});
  const tools = list.body?.result?.tools || [];
  check("tools/list returns 6 tools", tools.length === 6, tools.map((t) => t.name).join(", "));
  check("every tool has a description and schema",
    tools.every((t) => t.description && t.inputSchema?.type === "object"));
  check("blog_read exposes max_chars",
    !!tools.find((t) => t.name === "naver_blog_read")?.inputSchema?.properties?.max_chars);

  // --- notifications ------------------------------------------------------
  const note = await worker.fetch(new Request("https://example.workers.dev/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  }));
  check("notification gets 202 with no body", note.status === 202, `status ${note.status}`);

  // --- errors are reported as errors, not silent successes ----------------
  const bad = await rpc("tools/call", { name: "does_not_exist", arguments: {} });
  check("unknown tool is flagged isError", bad.body?.result?.isError === true,
    bad.body?.result?.content?.[0]?.text?.slice(0, 60) || "");

  const badUrl = await rpc("tools/call", {
    name: "naver_blog_read",
    arguments: { url: "https://example.com/not-a-naver-post" },
  });
  const badText = badUrl.body?.result?.content?.[0]?.text || "";
  check("bad URL returns a classified failure",
    badUrl.body?.result?.isError === true && badText.includes("BAD_INPUT"),
    badText.slice(0, 70));

  const unknown = await rpc("nonexistent/method", {});
  check("unknown method returns JSON-RPC -32601", unknown.body?.error?.code === -32601,
    unknown.body?.error?.message || "");

  // --- SSE framing --------------------------------------------------------
  const sse = await rpc("tools/list", {}, { accept: "text/event-stream" });
  check("SSE Accept yields an event-stream frame",
    (sse.resp.headers.get("Content-Type") || "").includes("text/event-stream") &&
      sse.text.startsWith("event: message"),
    sse.text.slice(0, 40).replace(/\n/g, "\\n"));

  // --- health and CORS ----------------------------------------------------
  const health = await worker.fetch(new Request("https://example.workers.dev/health"));
  check("GET /health is ok", health.status === 200 && (await health.clone().json()).ok === true);
  check("CORS is open for browser clients",
    health.headers.get("Access-Control-Allow-Origin") === "*");

  const preflight = await worker.fetch(
    new Request("https://example.workers.dev/mcp", { method: "OPTIONS" }));
  check("OPTIONS preflight returns 204", preflight.status === 204, `status ${preflight.status}`);

  // --- a real call, end to end -------------------------------------------
  const search = await rpc("tools/call", {
    name: "naver_blog_search",
    arguments: { query: "제주도 맛집", count: 3 },
  });
  const searchText = search.body?.result?.content?.[0]?.text || "";
  check("tools/call naver_blog_search returns posts",
    !search.body?.result?.isError && searchText.includes("blog.naver.com"),
    `${searchText.length} chars`);

  const m = searchText.match(/https:\/\/m\.blog\.naver\.com\/[A-Za-z0-9_-]+\/\d+/);
  if (m) {
    const read = await rpc("tools/call", {
      name: "naver_blog_read",
      arguments: { url: m[0], max_chars: 1200 },
    });
    const body = read.body?.result?.content?.[0]?.text || "";
    check("tools/call naver_blog_read returns a body",
      !read.body?.result?.isError && body.length > 300, `${body.length} chars from ${m[0]}`);
    console.log(`\n--- body (first 500 chars) ---\n${body.slice(0, 500)}\n`);
  } else {
    check("search produced a URL to read", false);
  }

  console.log("\n" + "=".repeat(72));
  console.log("WORKER TEST SUMMARY");
  console.log("=".repeat(72));
  for (const [status, label, detail] of rows) {
    console.log(`${status.padEnd(6)} ${label.slice(0, 46).padEnd(48)} ${String(detail).slice(0, 40)}`);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll worker checks passed.");
  process.exit(failures ? 1 : 0);
};

run().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
