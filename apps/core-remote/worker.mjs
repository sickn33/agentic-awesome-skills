import { DurableObject } from "cloudflare:workers";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { posix } from "node:path";
import catalog from "./dist/catalog.json";
import payloads from "./dist/payloads.json";
import virtualFs from "./virtual-fs.cjs";
import server from "../../tools/lib/aas-v1/mcp/server.js";
import { pages } from "./public-pages.mjs";
const { McpServer } = server;
const MAX_BODY = 262144;
const json = (v, status = 200, headers = {}) =>
  new Response(JSON.stringify(v), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...headers,
    },
  });
const limited = () =>
  json({ error: "Request limit reached. Retry later." }, 429, {
    "retry-after": "60",
  });
export async function readBounded(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY)
    throw Error("large");
  const reader = request.body?.getReader();
  if (!reader) throw Error("empty");
  let total = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BODY) throw Error("large");
      chunks.push(value);
    }
  } catch (e) {
    await reader.cancel();
    throw e;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export class QuotaGuard extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS quota (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)",
    );
    this.sql.exec("CREATE INDEX IF NOT EXISTS quota_expiry ON quota(expires)");
  }
  async fetch(req) {
    const { ip, initialize } = await req.json();
    const now = Date.now(),
      day = Math.floor(now / 86400000),
      minute = Math.floor(now / 60000);
    const keys = [
      [`day:${day}`, 50000],
      [`ip:${ip}:${day}`, 2000],
      [`minute:${ip}:${minute}`, 80],
      ...(initialize ? [[`init:${ip}:${minute}`, 5]] : []),
    ];
    this.sql.exec("DELETE FROM quota WHERE expires < ?", now);
    for (const [key, max] of keys) {
      const row = this.sql
        .exec("SELECT count FROM quota WHERE key=?", key)
        .toArray()[0];
      if ((row?.count || 0) >= max) return limited();
    }
    for (const [key] of keys)
      this.sql.exec(
        "INSERT INTO quota VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
        key,
        key.startsWith("minute:") || key.startsWith("init:")
          ? now + 120000
          : (day + 1) * 86400000,
      );
    return json({ ok: true });
  }
}
export class CoreSession extends DurableObject {
  async alarm() {
    this.server = null;
    await this.ctx.storage.deleteAll();
  }
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.server = null;
    this.created = 0;
    this.count = 0;
  }
  async fetch(req) {
    if (req.method === "DELETE") {
      this.server = null;
      return new Response(null, { status: 204 });
    }
    const body = await req.json();
    if (body.method === "initialize") {
      if (this.server) return json({ error: "Already initialized" }, 409);
      this.server = new McpServer({ root: "/aas", catalog });
      this.created = Date.now();
      await this.ctx.storage.setAlarm(this.created + 1200000);
    }
    if (this.server && Date.now() - this.created > 1200000) this.server = null;
    if (!this.server)
      return json({ error: "Session expired. Initialize a new session." }, 404);
    if (++this.count > 256) return limited();
    const args = body.params?.arguments;
    let id = args?.id;
    if (body.method === "resources/read")
      id = /^aas:\/\/skills\/([a-z0-9._-]+)$/.exec(body.params?.uri || "")?.[1];
    const skill = catalog.skills.find((s) => s.id === id),
      entry = payloads[id];
    if (skill && entry) {
      let file,
        asset,
        offset = 0,
        total;
      if (
        (body.params?.name === "get_skill" && args.includeContent === true) ||
        body.method === "resources/read"
      ) {
        asset = entry.content;
        file = "/aas/data/aas-v1/skill-content.v1.ndjson";
        offset = skill.untrustedContentRef.offset;
        total = offset + skill.untrustedContentRef.length;
      } else if (
        body.params?.name === "read_skill_file" &&
        Object.hasOwn(entry.files, args.path)
      ) {
        asset = entry.files[args.path];
        file = posix.join("/aas", posix.dirname(skill.untrustedContentPath), args.path);
      }
      if (asset) {
        const r = await this.env.ASSETS.fetch(
          "https://assets.internal/" + asset,
        );
        if (!r.ok) return json({ error: "Catalog content unavailable" }, 503);
        const b = Buffer.from(await r.arrayBuffer());
        virtualFs.put(file, b, offset, total ?? b.length);
      }
    }
    try {
      const result = await this.server.handle(body);
      if (body.method === "initialize" && result?.result)
        result.result.instructions = result.result.instructions.replace(
          "Local read-only",
          "Remote read-only",
        );
      return result === null
        ? new Response(null, { status: 202 })
        : json(result);
    } catch {
      return json({ error: "Request could not be processed" }, 500);
    }
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/.well-known/openai-apps-challenge" && request.method === "GET")
      return new Response("_z4MuaE5wvkNMmtQ2FM3vdNgY0GRKEgeXEqEmWUQdFY", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    if (
      url.pathname === "/demo/aas-core-0.1.6.mp4" &&
      ["GET", "HEAD"].includes(request.method)
    ) return env.ASSETS.fetch(request);
    if (request.method === "GET" && Object.hasOwn(pages, url.pathname))
      return new Response(pages[url.pathname], {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=3600",
        },
      });
    if (url.pathname === "/health" && request.method === "GET")
      return json({
        service: "AAS Core",
        version: "0.1.0",
        catalogVersion: catalog.version,
        catalogDigest: catalog.digest,
        skills: catalog.skills.length,
      });
    if (url.pathname !== "/mcp")
      return new Response("Not found", { status: 404 });
    if (!["POST", "DELETE"].includes(request.method))
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "POST, DELETE" },
      });
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin)
      return json({ error: "Origin not allowed" }, 403);
    const ip = request.headers.get("cf-connecting-ip");
    if (!ip) return json({ error: "Missing client identity" }, 403);
    if (
      request.method === "POST" &&
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    )
      return json({ error: "JSON required" }, 415);
    let body;
    try {
      body = request.method === "POST" ? await readBounded(request) : null;
    } catch {
      return json({ error: "Invalid or oversized JSON request" }, 400);
    }
    if (
      request.method === "POST" &&
      (!body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        body.jsonrpc !== "2.0" ||
        typeof body.method !== "string")
    )
      return json({ error: "Invalid JSON-RPC envelope" }, 400);
    const initialize = body?.method === "initialize";
    let sid = request.headers.get("mcp-session-id");
    if (!initialize && !/^[a-f0-9]{64}$/.test(sid || ""))
      return json({ error: "Initialize a session first" }, 400);
    if (initialize && sid)
      return json({ error: "Initialize without a session ID" }, 400);
    const hash = createHash("sha256").update(ip).digest("hex");
    const guard = await env.GUARD.get(env.GUARD.idFromName("quota")).fetch(
      new Request("https://guard.internal/", {
        method: "POST",
        body: JSON.stringify({ ip: hash, initialize }),
      }),
    );
    if (!guard.ok) return limited();
    if (initialize)
      sid =
        crypto.randomUUID().replaceAll("-", "") +
        crypto.randomUUID().replaceAll("-", "");
    const result = await env.SESSIONS.get(env.SESSIONS.idFromName(sid)).fetch(
      new Request("https://session.internal/", {
        method: request.method,
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
    const headers = new Headers(result.headers);
    if (initialize && result.ok) headers.set("mcp-session-id", sid);
    return new Response(result.body, { status: result.status, headers });
  },
};
