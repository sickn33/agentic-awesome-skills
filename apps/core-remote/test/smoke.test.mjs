import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import contract from "../tool-contract.cjs";
import { DatabaseSync } from "node:sqlite";
let source = fs
  .readFileSync(new URL("../dist/worker.mjs", import.meta.url), "utf8")
  .replaceAll(
    '"cloudflare:workers"',
    JSON.stringify(new URL("./runtime.mjs", import.meta.url).href),
  );
fs.writeFileSync(new URL("../dist/test-worker.mjs", import.meta.url), source);
const {
  default: worker,
  CoreSession,
  QuotaGuard,
} = await import("../dist/test-worker.mjs");
function ctx() {
  const db = new DatabaseSync(":memory:");
  return {
    storage: {
      async setAlarm() {},
      async deleteAll() {},
      sql: {
        exec(query, ...args) {
          const s = db.prepare(query);
          const rows = s.columns().length
            ? s.all(...args)
            : (s.run(...args), []);
          return { toArray: () => rows };
        },
      },
    },
  };
}
const env = {
  ASSETS: {
    async fetch(u) {
      try {
        return new Response(
          fs.readFileSync(
            new URL(
              "../dist/assets/" + new URL(u).pathname.slice(1),
              import.meta.url,
            ),
          ),
        );
      } catch {
        return new Response(null, { status: 404 });
      }
    },
  },
};
function binding(C) {
  const instances = new Map();
  return {
    idFromName: (n) => n,
    get(n) {
      if (!instances.has(n)) instances.set(n, new C(ctx(), env));
      return instances.get(n);
    },
  };
}
env.GUARD = binding(QuotaGuard);
env.SESSIONS = binding(CoreSession);
let sid;
async function call(method, params = {}, id = 1, ip = "192.0.2.1") {
  const r = await worker.fetch(
    new Request("https://test/mcp/v1", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": ip,
        ...(sid ? { "mcp-session-id": sid } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        ...(id === null ? {} : { id }),
        method,
        params,
      }),
    }),
    env,
  );
  return { r, data: r.status === 202 ? null : await r.json() };
}
test("remote session reads canonical content, composes and validates with compiled schemas", async () => {
  let x = await call("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  });
  assert.equal(x.r.status, 200);
  sid = x.r.headers.get("mcp-session-id");
  assert.match(sid, /^[a-f0-9]{64}$/);
  assert.equal(
    (await call("notifications/initialized", {}, null)).r.status,
    202,
  );
  x = await call("tools/list");
  contract.assertToolContract(x.data.result.tools);
  x = await call("tools/call", {
    name: "search_skills",
    arguments: { query: "python", limit: 3 },
  });
  assert.equal(x.data.result.isError, false);
  x = await call("tools/call", {
    name: "get_skill",
    arguments: { id: "python-pro", includeContent: true },
  });
  assert.equal(x.data.result.isError, false);
  x = await call("tools/call", {
    name: "list_skill_files",
    arguments: { id: "python-pro" },
  });
  assert.equal(x.data.result.isError, false);
  x = await call("tools/call", {
    name: "read_skill_file",
    arguments: { id: "python-pro", path: "SKILL.md" },
  });
  assert.equal(x.data.result.isError, false);
  x = await call("tools/call", {
    name: "read_skill_file",
    arguments: { id: "2d-games", path: "SKILL.md" },
  });
  assert.equal(x.data.result.isError, false, "Nested skill path must resolve");
  x = await call("tools/call", {
    name: "compose_stack",
    arguments: {
      profile: { goals: ["Build a Python API"] },
      skillIds: ["python-pro"],
    },
  });
  assert.equal(x.data.result.isError, false);
  const manifest =
    x.data.result.structuredContent?.manifest ??
    JSON.parse(x.data.result.content[0].text).manifest;
  assert.ok(manifest);
  x = await call("tools/call", {
    name: "inspect_stack",
    arguments: { manifest },
  });
  assert.equal(x.data.result.isError, false);
  x = await call("tools/call", {
    name: "compose_stack",
    arguments: { profile: { goals: [] }, skillIds: ["unknown"] },
  });
  assert.equal(x.data.result.isError, true);
  x = await call("tools/call", {
    name: "read_skill_file",
    arguments: { id: "python-pro", path: "../../package.json" },
  });
  assert.equal(x.data.result.isError, true);
});
test("quota is shared across sessions and throttles aggressive clients", async () => {
  let limited = false;
  for (let i = 0; i < 85; i++) {
    const x = await call("ping");
    if (x.r.status === 429) {
      limited = true;
      break;
    }
  }
  assert.ok(limited);
});
test("rejects missing session, oversized payload, cross origin and unknown paths", async () => {
  const x = await worker.fetch(
    new Request("https://test/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "192.0.2.2",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "ping", id: 1 }),
    }),
    env,
  );
  assert.equal(x.status, 400);
  const bad = await worker.fetch(
    new Request("https://test/mcp", {
      method: "POST",
      headers: { origin: "https://bad", "cf-connecting-ip": "192.0.2.2" },
    }),
    env,
  );
  assert.equal(bad.status, 403);
  const large = await worker.fetch(
    new Request("https://test/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "192.0.2.2",
      },
      body: "x".repeat(262145),
    }),
    env,
  );
  assert.equal(large.status, 400);
  const hidden = await worker.fetch(
    new Request("https://test/private.txt"),
    env,
  );
  assert.equal(hidden.status, 404);
});

test("Codex v2 survives transport replacement and exports a verified selection", async () => {
  const { createServer } = await import("node:http");
  const { spawn } = await import("node:child_process");
  const http = createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const upstream = await worker.fetch(
        new Request("https://test" + req.url, {
          method: req.method,
          headers: { ...req.headers, "cf-connecting-ip": "192.0.2.45" },
          body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
        }),
        env,
      );
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (e) {
      res.writeHead(500);
      res.end(e.message);
    }
  });
  await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
  try {
    const child = spawn(
      process.execPath,
      [new URL("../live-smoke.cjs", import.meta.url).pathname],
      {
        env: {
          ...process.env,
          AAS_MCP_URL: "http://127.0.0.1:" + http.address().port + "/mcp",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let diagnostic = "";
    for (const channel of [child.stdout, child.stderr])
      channel.on("data", (chunk) => {
        diagnostic += chunk;
      });
    const code = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    assert.equal(code, 0, diagnostic);
    const rows = env.GUARD.get("quota")
      .sql.exec("SELECT tool, outcome, calls FROM daily_tools")
      .toArray();
    assert.ok(
      !rows.some((row) => row.tool === "compare_skills"),
      "Known smoke calls must be excluded",
    );
  } finally {
    await new Promise((resolve) => http.close(resolve));
  }
});

test("empty multilingual searches and successful retries increment aggregate counts", async () => {
  const guard = env.GUARD.get("quota");
  const count = (outcome) =>
    Number(
      guard.sql
        .exec(
          "SELECT coalesce(sum(calls),0) AS n FROM daily_tools WHERE tool='search_skills' AND outcome=?",
          outcome,
        )
        .toArray()[0].n,
    );
  const before = [count("empty"), count("success")];
  async function invoke(method, params, id = 1, session) {
    const res = await worker.fetch(
      new Request("https://test/mcp", {
        method: "POST",
        headers: {
          "cf-connecting-ip": "192.0.2.72",
          "content-type": "application/json",
          ...(session ? { "mcp-session-id": session } : {}),
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          ...(id === null ? {} : { id }),
          method,
          params,
        }),
      }),
      env,
    );
    return res;
  }
  const initial = await invoke("initialize", { protocolVersion: "2025-06-18" });
  const session = initial.headers.get("mcp-session-id");
  await invoke("notifications/initialized", {}, null, session);
  for (const query of ["accessibilità tastiera", "keyboard accessibility"]) {
    const response = await invoke(
      "tools/call",
      {
        name: "search_skills",
        arguments: { query, matchMode: "all", limit: 6 },
      },
      1,
      session,
    );
    const result = (await response.json()).result.structuredContent;
    if (query === "accessibilità tastiera")
      assert.match(result.nextStep, /English/);
    else
      assert.ok(
        result.results.some((row) => row.id === "better-accessibility"),
      );
  }
  assert.deepEqual(
    [count("empty"), count("success")],
    before.map((n) => n + 1),
  );
});
