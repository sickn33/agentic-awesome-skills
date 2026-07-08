# Server-sent events (SSE) on Neon Functions

SSE is the one-way (server → client) streaming counterpart to WebSockets: the browser opens a long-lived `GET` with [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) and the server pushes text frames down it. On Neon Functions there's **no adapter or extra library to install** — unlike the [Hono WebSocket helper](hono-websockets.md), an SSE endpoint is just a normal `fetch` handler that returns a `Response` whose body is a `ReadableStream` with `Content-Type: text/event-stream`. The runtime holds the response open as long as bytes keep flowing (15-minute heartbeat, see [Timeouts](../SKILL.md#timeouts-and-runtime-limits)).

Reach for SSE over WebSockets when you only need server → client updates (live counters, notifications, progress, token streams) — it's simpler to run (plain HTTP, no `upgrade`), and `EventSource` **reconnects on its own**, so there's no client backoff to write.

## Minimal SSE endpoint (no framework)

A function's default export is `{ fetch }`; SSE needs nothing more. Return a `ReadableStream` and write `data:` frames into it:

```typescript
// src/index.ts
const encoder = new TextEncoder();

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (url.pathname !== "/events") return new Response("ok");

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // An SSE frame is `data: <payload>\n\n`. A line starting with `:` is a
        // comment — used here as a heartbeat to keep the stream from going idle.
        controller.enqueue(encoder.encode("data: hello\n\n"));
        const timer = setInterval(
          () => controller.enqueue(encoder.encode(": ping\n\n")),
          25_000,
        );
        // cancel() fires when the client disconnects.
        return () => clearInterval(timer);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  },
};
```

> `cancel()` is returned from `start()` here for brevity; you can also declare it as a separate `cancel()` method on the stream's underlying source. Either way, use it to drop the client from any broadcast set and clear timers.

## With Hono

Hono routes the HTTP side; the SSE response is the same `ReadableStream`. Returning a raw `Response` keeps full control over the stream (and sidesteps concurrent-write edge cases in stream helpers):

```typescript
// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();
app.use("*", cors({ origin: process.env.WEB_ORIGIN ?? "*" })); // EventSource is cross-origin from a SPA

app.get("/events", (c) => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: connected\n\n"));
      // ...register `controller` in a broadcast set; see fan-out below.
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
});

export default app;
```

## Push to every client, across isolates

The fan-out rule is identical to WebSockets ([Fan-out across isolates](../SKILL.md#fan-out-across-isolates-do-not-skip-this)): each isolate keeps its **own** set of open streams, so broadcasting in-process only reaches the clients on that isolate. Hold a `Set` of stream controllers, and fan out across isolates with Postgres `LISTEN`/`NOTIFY`. Keep the source-of-truth state in Postgres — module state doesn't survive eviction.

```typescript
import { Pool, Client } from "pg";

const encoder = new TextEncoder();
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const CHANNEL = "events";

// One dedicated DIRECT connection per isolate to receive events (LISTEN needs a
// real session — use DATABASE_URL_UNPOOLED, not the pooled URL).
const listener = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
listener.connect().then(() => listener.query(`LISTEN ${CHANNEL}`));
listener.on("notification", (msg) => {
  if (!msg.payload) return;
  const frame = encoder.encode(`data: ${msg.payload}\n\n`);
  for (const controller of clients) {
    try {
      controller.enqueue(frame); // enqueue is synchronous — no concurrent-await hazard
    } catch {
      clients.delete(controller); // controller already closed
    }
  }
});

// Anywhere you mutate state, NOTIFY so every isolate pushes to its own streams.
function publish(payload: unknown) {
  return pool.query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify(payload)]);
}
```

Register/unregister each connection in `clients` from the stream's `start`/`cancel`, and add a module-scope heartbeat (`setInterval`, every ~25–30s) that enqueues `: ping\n\n` to every controller so idle streams stay alive (see [Caveats](#caveats)).

## Wire format (just text)

Each event is newline-delimited fields ending in a blank line:

```
data: a one-line payload\n\n
event: count\ndata: 42\n\n          # named event → addEventListener("count", …)
id: 7\ndata: resumable\n\n            # sets EventSource.lastEventId for resume
: this is a comment / heartbeat\n\n   # ignored by the client; keeps the stream warm
retry: 5000\n\n                       # tells the client how long to wait before reconnecting
```

Send `data:` with no `event:` field to deliver the default `message` event, which the client reads with `EventSource.onmessage` (no `addEventListener` needed).

## Client

```typescript
const source = new EventSource(`${FUNCTION_URL}/events`); // GET only
source.onmessage = (e) => console.log("update", e.data);  // default "message" events
source.onerror = () => {/* EventSource auto-reconnects; nothing to do */};
// source.close() to stop.
```

`EventSource` **reconnects automatically** with the server's `retry:` interval, replaying `Last-Event-ID` if you set `id:` — so unlike WebSockets you don't write a reconnect loop. Its constraints: it's **GET-only and can't set request headers**, so authenticate the same way as a [WebSocket](../SKILL.md#websocket-servers) — a `?token=` query param (verify with `jwtVerify` before streaming) or a cookie. (Use the modern `eventsource` polyfill if you need `Authorization` headers.)

## Caveats

- **Heartbeat or it dies.** Streams stay open only while bytes flow — Neon's window is 15 min ([Timeouts](../SKILL.md#timeouts-and-runtime-limits)), but intermediary proxies are usually far stricter (tens of seconds). Emit a `: ping\n\n` comment every ~25–30s so the stream never goes quiet.
- **`no-transform`.** Set `Cache-Control: no-cache, no-transform` so proxies don't buffer or rewrite the stream.
- **Enqueue is synchronous.** `controller.enqueue()` doesn't return a promise, so broadcasting from the `LISTEN` handler can't interleave awaits mid-write — wrap each in `try/catch` and drop dead controllers.
- **CORS.** A SPA hits the function cross-origin, so set `Access-Control-Allow-Origin`. `EventSource` sends no credentials by default, so `*` is fine for public streams.
- **One-way only.** SSE is server → client. For client → server, the browser makes normal `fetch`/`POST` calls (often to the same function); reach for [WebSockets](../SKILL.md#websocket-servers) only when you need bidirectional, low-latency frames.

Together — a Hono `fetch` SSE endpoint, `LISTEN`/`NOTIFY` fan-out, heartbeat, a counter persisted in Postgres, and a client-only TanStack Router SPA consuming it with `EventSource` — these compose into a complete realtime backend on a single function.
