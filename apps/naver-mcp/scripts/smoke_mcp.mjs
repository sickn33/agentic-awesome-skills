/**
 * Live smoke test against a deployed MCP server.
 *
 * Drives the same JSON-RPC calls a Claude custom connector makes, then calls a
 * tool for real and checks that Naver body text actually comes back.
 *
 *   node scripts/smoke_mcp.mjs https://naver-content-mcp.<sub>.workers.dev
 */

const base = (process.argv[2] || "").replace(/\/+$/, "");
if (!base) {
  console.error("usage: node smoke_mcp.mjs <server-base-url>");
  process.exit(2);
}
const endpoint = `${base}/mcp`;
let failures = 0;

async function rpc(method, params, id = Math.floor(Math.random() * 1e6)) {
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`non-JSON reply: ${text.slice(0, 300)}`);
  }
}

function check(label, cond, detail = "") {
  if (cond) {
    console.log(`[PASS] ${label} ${detail}`);
  } else {
    failures++;
    console.log(`[FAIL] ${label} ${detail}`);
  }
  return cond;
}

const run = async () => {
  console.log(`endpoint: ${endpoint}\n`);

  const health = await fetch(`${base}/health`).then((r) => r.json());
  check("GET /health", health?.ok === true, JSON.stringify(health).slice(0, 160));

  const init = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "smoke-test", version: "1.0.0" },
  });
  check("initialize", !!init?.result?.serverInfo, JSON.stringify(init?.result?.serverInfo || init));

  const list = await rpc("tools/list", {});
  const names = (list?.result?.tools || []).map((t) => t.name);
  check("tools/list returns 6 tools", names.length === 6, names.join(", "));

  // Search, then read the first hit - the full path a connector would take.
  const search = await rpc("tools/call", {
    name: "naver_blog_search",
    arguments: { query: "제주도 맛집", count: 3 },
  });
  const searchText = search?.result?.content?.[0]?.text || "";
  check(
    "tools/call naver_blog_search",
    !search?.result?.isError && searchText.includes("blog.naver.com"),
    `${searchText.length} chars`
  );
  console.log(`\n--- search output ---\n${searchText.slice(0, 400)}\n`);

  const m = searchText.match(/https:\/\/m\.blog\.naver\.com\/[A-Za-z0-9_-]+\/\d+/);
  if (m) {
    const read = await rpc("tools/call", {
      name: "naver_blog_read",
      arguments: { url: m[0] },
    });
    const body = read?.result?.content?.[0]?.text || "";
    check(
      "tools/call naver_blog_read returns a body",
      !read?.result?.isError && body.length > 400,
      `${body.length} chars from ${m[0]}`
    );
    console.log(`\n--- post body (first 700 chars) ---\n${body.slice(0, 700)}\n`);
  } else {
    failures++;
    console.log("[FAIL] no blog URL in search output to read");
  }

  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll smoke checks passed.");
  process.exit(failures ? 1 : 0);
};

run().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(1);
});
