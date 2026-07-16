# Hono WebSocket helper on Neon Functions

Neon Functions accept WebSockets via a `{ fetch, upgrade }` default export, where `upgrade(req, socket, head)` is the raw Node handshake (see the [WebSocket servers](../SKILL.md#websocket-servers) section). That works directly with the `ws` library. If you'd rather declare WebSocket routes _inside_ a Hono app — `app.get("/ws", upgradeWebSocket(...))` with the standard `onOpen`/`onMessage`/`onClose` lifecycle — you need an adapter.

## Why an adapter (and why not `@hono/node-ws`)

Hono's `upgradeWebSocket()` is runtime-agnostic at the route layer, but the actual handshake is done by a per-runtime adapter (`hono/cloudflare-workers`, `hono/deno`, `hono/bun`, `@hono/node-server`). **There is no adapter for Neon.** The Node one, `@hono/node-ws`, is **deprecated** and its replacement assumes it owns the HTTP server (`serve({ websocket })`) — which Neon's runtime does instead.

So vendor the small adapter below. It depends only on `hono` and `ws` (no deprecated package), and is adapted from `@hono/node-ws` (MIT). Instead of attaching to an `http.Server`'s `'upgrade'` event, it returns a ready-to-export `{ fetch, upgrade }` handler that matches Neon's contract.

## The adapter

```typescript
// src/hono-ws.ts — bridges Hono's upgradeWebSocket() to Neon's { fetch, upgrade }.
import { STATUS_CODES, type IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { Hono } from "hono";
import { WSContext, defineWebSocketHelper } from "hono/ws";
import { WebSocketServer, type WebSocket } from "ws";

type Wire = (ws: WebSocket) => void;

export function createNeonWebSocket(app: Hono, baseUrl = "http://localhost") {
  const wss = new WebSocketServer({ noServer: true });
  // Correlate a handshake to its route handler via the per-request env object identity.
  const pending = new Map<unknown, Wire>();

  const upgradeWebSocket = defineWebSocketHelper(async (c, events, options) => {
    if (c.req.header("upgrade")?.toLowerCase() !== "websocket") return;
    const url = c.req.url;
    pending.set(c.env, (ws) => {
      const onError = options?.onError ?? ((e: unknown) => console.error(e));
      const ctx = new WSContext<WebSocket>({
        send: (data, opts) => ws.send(data, { compress: opts?.compress }),
        close: (code, reason) => ws.close(code, reason),
        raw: ws,
        url,
        protocol: ws.protocol,
        get readyState() {
          return ws.readyState;
        },
      });
      try {
        events.onOpen?.(new Event("open"), ctx);
      } catch (e) {
        onError(e);
      }
      ws.on("message", (data, isBinary) => {
        for (const chunk of Array.isArray(data) ? data : [data]) {
          try {
            const payload = isBinary
              ? chunk instanceof ArrayBuffer
                ? chunk
                : chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength)
              : chunk.toString("utf-8");
            events.onMessage?.(new MessageEvent("message", { data: payload }), ctx);
          } catch (e) {
            onError(e);
          }
        }
      });
      ws.on("close", (code, reason) => {
        try {
          events.onClose?.(new CloseEvent("close", { code, reason: reason.toString() }), ctx);
        } catch (e) {
          onError(e);
        }
      });
      // Node 24 has no global ErrorEvent; a browser's ws.onerror gets a plain Event anyway.
      ws.on("error", (error) => {
        onError(error);
        try {
          events.onError?.(new Event("error"), ctx);
        } catch (e) {
          onError(e);
        }
      });
    });
    return new Response();
  });

  const handler = {
    fetch: (request: Request) => app.fetch(request),
    async upgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
      const url = new URL(req.url ?? "/", baseUrl);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.append(key, Array.isArray(value) ? value[0] : value);
      }
      // The env object identity links this request back to the route handler above.
      const env = { incoming: req, outgoing: undefined };
      const response = await app.request(url, { headers }, env);
      const wire = pending.get(env);
      pending.delete(env);
      if (!wire) {
        socket.end(`HTTP/1.1 ${response.status} ${STATUS_CODES[response.status] ?? ""}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => wire(ws));
    },
  };

  return { upgradeWebSocket, handler };
}
```

How it works: the `upgrade` handler runs the handshake request through `app.request(...)` so Hono's router matches the `upgradeWebSocket` route; the helper registers a `wire` callback keyed by the per-request `env` object; if a route matched, `wss.handleUpgrade` accepts the socket and `wire` attaches the lifecycle handlers, otherwise the socket is closed with the route's status (e.g. 401/404).

## Usage

Because the handshake is routed through `app.request`, **auth and other gating are just normal Hono middleware on the route** — verify the `?token=` and return 401 before the upgrade:

```typescript
// src/index.ts
import { Hono } from "hono";
import { createNeonWebSocket } from "./hono-ws";

const app = new Hono();
const { upgradeWebSocket, handler } = createNeonWebSocket(app);

app.get("/", (c) => c.text("ok"));

app.get(
  "/ws",
  async (c, next) => {
    const identity = await verifyToken(c.req.query("token")); // your JWT check
    if (!identity) return c.text("Unauthorized", 401);
    await next();
  },
  upgradeWebSocket(() => ({
    onOpen: (_evt, ws) => ws.send("welcome"),
    onMessage: (evt, ws) => ws.send(`echo: ${evt.data}`),
    onClose: () => console.log("disconnected"),
  })),
);

export default handler; // Neon's { fetch, upgrade } contract
```

## Caveats

- **No header-modifying middleware on the WS route.** Per [Hono's docs](https://hono.dev/docs/helpers/websocket), middleware that changes headers (e.g. CORS) on an `upgradeWebSocket` route throws ("can't modify immutable headers"), because the helper rewrites headers internally. Auth middleware that only reads the query/headers and returns 401 is fine.
- **Send a heartbeat.** A socket is dropped once it goes silent — Neon's window is 15 minutes ([Timeouts](../SKILL.md#timeouts-and-runtime-limits)), but intermediary proxies are usually far stricter (tens of seconds). Send a keepalive every ~25–30s so the connection never goes quiet. With the raw `ws` socket use `ws.ping()` (the browser auto-replies with a pong); through this helper you don't hold the raw socket, so send an app-level `ws.send("ping")` the client ignores instead. See [Heartbeat](../SKILL.md#heartbeat-keep-the-socket-alive).
- **Fan-out and reconnect still apply.** This adapter only covers the per-isolate handshake. For a genuinely shared chat across isolates, broadcast with Postgres `LISTEN`/`NOTIFY`, and have clients reconnect with backoff — see [Fan-out across isolates](../SKILL.md#fan-out-across-isolates-do-not-skip-this) and [Client must reconnect](../SKILL.md#client-must-reconnect).
- **Node-only globals.** Relies on `Event`, `MessageEvent`, and `CloseEvent` (all present on Neon's Node 24 runtime). `ErrorEvent` is intentionally avoided since it isn't a Node global.
