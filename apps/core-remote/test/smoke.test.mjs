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
    new Request("https://test/mcp", {
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
