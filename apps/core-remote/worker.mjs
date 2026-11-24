import { DurableObject } from "cloudflare:workers";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { posix } from "node:path";
import catalog from "./dist/catalog.json";
import payloads from "./dist/payloads.json";
import virtualFs from "./virtual-fs.cjs";
import server from "../../tools/lib/aas-v1/mcp/server.js";
import { productRequest, productTools, withPayload } from "./product.mjs";
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
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS daily_tools (day INTEGER, tool TEXT, outcome TEXT, code TEXT, calls INTEGER, elapsed_ms INTEGER, PRIMARY KEY(day, tool, outcome, code))",
    );
    this.lastPrunedDay = null;
    this.throttled = new Map();
    this.lastFlushMinute = null;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS quota (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)",
    );
    this.sql.exec("CREATE INDEX IF NOT EXISTS quota_expiry ON quota(expires)");
  }
  async fetch(req) {
    const { ip, initialize, sid, body, method, product } = await req.json();
    const tool =
      body?.method === "tools/call" && Object.hasOwn(body, "id")
        ? productTools.find((t) => t.name === body.params?.name)?.name ||
          "unknown"
        : null;
    const now = Date.now(),
      day = Math.floor(now / 86400000),
      minute = Math.floor(now / 60000);
    // Coalesce rejections before writing so a throttled client cannot force one SQL write per retry.
    if (minute !== this.lastFlushMinute) {
      this.lastFlushMinute = minute;
      try {
        for (const [key, count] of this.throttled) {
          const [bucket, name] = key.split("/");
          this.sql.exec(
            "INSERT INTO daily_tools VALUES (?, ?, 'throttled', '429', ?, 0) ON CONFLICT(day, tool, outcome, code) DO UPDATE SET calls=calls+excluded.calls",
            Number(bucket),
            name,
            count,
          );
        }
      } catch {
        /* Telemetry may be dropped at the free storage limit. */
      } finally {
        this.throttled.clear();
      }
    }
    const keys = [
      [`day:${day}`, 50000],
      [`ip:${ip}:${day}`, 2000],
      [`minute:${ip}:${minute}`, 80],
      ...(initialize ||
      (product && body?.params?.arguments?.startSelection === true)
        ? [[`init:${ip}:${minute}`, 5]]
        : []),
    ];
    this.sql.exec("DELETE FROM quota WHERE expires < ?", now);
    for (const [key, max] of keys) {
      const row = this.sql
        .exec("SELECT count FROM quota WHERE key=?", key)
        .toArray()[0];
      if ((row?.count || 0) >= max) {
        if (tool) {
          const key = day + "/" + tool;
          this.throttled.set(key, (this.throttled.get(key) || 0) + 1);
        }
        return limited();
      }
    }
    for (const [key] of keys)
      this.sql.exec(
        "INSERT INTO quota VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
        key,
        key.startsWith("minute:") || key.startsWith("init:")
          ? now + 120000
          : (day + 1) * 86400000,
      );
    const started = Date.now();
    const result = await this.env.SESSIONS.get(
      this.env.SESSIONS.idFromName(sid),
    ).fetch(
      new Request("https://session.internal/", {
        method,
        headers: { "x-product": product ? "2" : "1" },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
    // Diagnostic counters are best-effort. An exhausted quota must not discard a completed tool result.
    if (tool && result.headers.get("x-smoke") !== "1") {
      try {
        if (day !== this.lastPrunedDay) {
          this.sql.exec("DELETE FROM daily_tools WHERE day < ?", day - 29);
          this.lastPrunedDay = day;
        }
        this.sql.exec(
          "INSERT INTO daily_tools VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(day, tool, outcome, code) DO UPDATE SET calls=calls+1, elapsed_ms=elapsed_ms+excluded.elapsed_ms",
          day,
          tool,
          result.headers.get("x-outcome") || "http-error",
          result.headers.get("x-code") || String(result.status),
          Date.now() - started,
        );
      } catch {
        /* Free-tier telemetry is best effort. */
      }
    }
    return result;
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
    const product = req.headers.get("x-product") === "2";
    const newAudit = req.headers.get("x-new-audit") === "1";
    if (newAudit || body.method === "initialize") {
      if (this.server) return json({ error: "Already initialized" }, 409);
      this.server = new McpServer({ root: "/aas", catalog });
      if (newAudit) {
        await this.server.handle({
          jsonrpc: "2.0",
          id: 0,
          method: "initialize",
          params: { protocolVersion: "2025-06-18" },
        });
        await this.server.handle({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        });
      }
      this.created = Date.now();
      await this.ctx.storage.setAlarm(this.created + 1200000);
    }
    if (this.server && Date.now() - this.created > 1200000) this.server = null;
    if (!this.server)
      return json({ error: "Session expired. Initialize a new session." }, 404);
    if (++this.count > 256) return limited();
    const args = body.params?.arguments;
    if (
      product &&
      body.method === "tools/call" &&
      this.server.initialized &&
      Object.hasOwn(body, "id") &&
      args &&
      (Object.hasOwn(args, "selectionHandle") ||
        Object.hasOwn(args, "startSelection"))
    ) {
      const start = args.startSelection === true;
      const handle = start
        ? crypto.randomUUID().replaceAll("-", "") +
          crypto.randomUUID().replaceAll("-", "")
        : args.selectionHandle;
      const schema = productTools.find((t) => t.name === body.params.name)
        ?.inputSchema.properties;
      if (
        !schema?.selectionHandle ||
        !/^[a-f0-9]{64}$/.test(handle || "") ||
        typeof handle !== "string" ||
        (Object.hasOwn(args, "startSelection") &&
          (!start ||
            !schema.startSelection ||
            Object.hasOwn(args, "selectionHandle")))
      )
        return json(
          this.server.rpcError(
            body.id,
            -32602,
            "Invalid selection handle or startSelection",
          ),
        );
      delete args.startSelection;
      delete args.selectionHandle;
      const audit = this.env.SESSIONS.get(
        this.env.SESSIONS.idFromName("selection:" + handle),
      );
      const response = await audit.fetch(
        new Request("https://session.internal/", {
          method: "POST",
          headers: { "x-product": "2", "x-new-audit": start ? "1" : "0" },
          body: JSON.stringify(body),
        }),
      );
      if (response.status === 404)
        return json(
          this.server.rpcError(
            body.id,
            -32602,
            "Selection expired. Start a new audited search and repeat the selection.",
          ),
        );
      if (!response.ok) return response;
      const rpc = await response.json();
      if (start && rpc.result && !rpc.result.isError)
        rpc.result = withPayload(rpc.result, { selectionHandle: handle });
      const headers = new Headers(response.headers);
      if (this.server.clientInfo?.name === "AAS deployed smoke")
        headers.set("x-smoke", "1");
      return json(rpc, 200, Object.fromEntries(headers));
    }
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
        file = posix.join(
          "/aas",
          posix.dirname(skill.untrustedContentPath),
          args.path,
        );
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
      const result = product
        ? await productRequest(this.server, body, catalog, payloads)
        : await this.server.handle(body);
      if (body.method === "initialize" && result?.result)
        result.result.instructions = result.result.instructions.replace(
          "Local read-only",
          "Remote read-only",
        );
      return result === null
        ? new Response(null, { status: 202 })
        : json(result, 200, {
            "x-outcome":
              result.error || result.result?.isError
                ? "error"
                : result.result?.structuredContent?.totalMatches === 0
                  ? "empty"
                  : "success",
            "x-code":
              result.result?.structuredContent?.code ||
              String(result.error?.code || "ok"),
            "x-smoke":
              this.server.clientInfo?.name === "AAS deployed smoke" ? "1" : "0",
          });
    } catch {
      return json({ error: "Request could not be processed" }, 500);
    }
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (
      url.pathname === "/.well-known/openai-apps-challenge" &&
      request.method === "GET"
    )
      return new Response("_z4MuaE5wvkNMmtQ2FM3vdNgY0GRKEgeXEqEmWUQdFY", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    if (
      url.pathname === "/demo/aas-core-0.1.6.mp4" &&
      ["GET", "HEAD"].includes(request.method)
    )
      return env.ASSETS.fetch(request);
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
        version: "0.1.8",
        catalogVersion: catalog.version,
        catalogDigest: catalog.digest,
        skills: catalog.skills.length,
      });
    const product = url.pathname === "/mcp";
    if (!product && url.pathname !== "/mcp/v1")
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
    if (initialize)
      sid =
        crypto.randomUUID().replaceAll("-", "") +
        crypto.randomUUID().replaceAll("-", "");
    const result = await env.GUARD.get(env.GUARD.idFromName("quota")).fetch(
      new Request("https://guard.internal/", {
        method: "POST",
        body: JSON.stringify({
          ip: hash,
          initialize,
          sid,
          body,
          method: request.method,
          product,
        }),
      }),
    );
    const headers = new Headers(result.headers);
    for (const key of ["x-outcome", "x-code", "x-smoke"]) headers.delete(key);
    if (initialize && result.ok) headers.set("mcp-session-id", sid);
    return new Response(result.body, { status: result.status, headers });
  },
};
