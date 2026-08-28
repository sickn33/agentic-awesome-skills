---
name: graceful-shutdown
description: "Implement graceful shutdown for servers and workers: drain connections, finish in-flight work, release resources, and exit cleanly on SIGTERM/SIGINT."
category: development
risk: safe
source: self
source_type: self
date_added: "2026-08-27"
author: Prajeeth-12
tags: [graceful-shutdown, signals, SIGTERM, SIGINT, drain, health-check, kubernetes, docker, production, resilience]
tools: [claude, cursor, codex, gemini]
license: "MIT"
---

# Graceful Shutdown

## Overview

A skill for implementing graceful shutdown in servers, workers, and long-running processes. Ensures in-flight requests complete, background jobs finish or checkpoint, database connections close cleanly, and the process exits with a proper status code. Essential for zero-downtime deployments in container orchestrators (Kubernetes, ECS, Docker Compose) and bare-metal process managers (systemd, PM2).

## When to Use This Skill

- Use when building an HTTP server that must not drop active connections during deploys
- Use when writing a background worker that processes jobs from a queue
- Use when deploying to Kubernetes, Docker, or any environment that sends SIGTERM before killing
- Use when the user says "graceful shutdown", "drain connections", "handle SIGTERM", "zero downtime", or "don't kill active requests"
- Use when implementing health check endpoints (`/healthz`, `/readyz`) for orchestrators

## How It Works

### Step 1: Register signal handlers early

Trap `SIGTERM` (orchestrator shutdown) and `SIGINT` (Ctrl+C) at process startup. Set a flag so the application knows it is shutting down.

```typescript
let isShuttingDown = false;

function onShutdownSignal(signal: string): void {
  if (isShuttingDown) return; // prevent double-shutdown
  isShuttingDown = true;
  console.log(`Received ${signal}, starting graceful shutdown...`);
  shutdown();
}

process.on("SIGTERM", () => onShutdownSignal("SIGTERM"));
process.on("SIGINT", () => onShutdownSignal("SIGINT"));
```

### Step 2: Stop accepting new work

Immediately stop the server from accepting new connections. For HTTP servers, call `server.close()`. For queue workers, stop polling for new jobs.

```typescript
async function shutdown(): Promise<void> {
  // 1. Stop accepting new connections
  server.close(() => {
    console.log("Server closed — no new connections accepted");
  });

  // 2. Mark health check as not-ready so load balancers stop routing
  //    (readiness probe returns 503 from this point)
}
```

### Step 3: Drain in-flight work with a deadline

Wait for active requests and background tasks to finish, but enforce a hard deadline so the process never hangs indefinitely.

```typescript
const DRAIN_TIMEOUT_MS = 25_000; // must be less than orchestrator's terminationGracePeriodSeconds

async function drainAndExit(): Promise<void> {
  const deadline = setTimeout(() => {
    console.error("Drain timeout reached — forcing exit");
    process.exit(1);
  }, DRAIN_TIMEOUT_MS);
  deadline.unref(); // don't keep the event loop alive just for the timer

  try {
    // Wait for active connections to finish
    await waitForActiveConnections();

    // Flush buffered data (logs, metrics, queues)
    await flushBuffers();

    // Close external resource handles
    await closeResources();

    console.log("Graceful shutdown complete");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}
```

### Step 4: Implement readiness and liveness probes

Orchestrators use these to decide whether to route traffic and whether to restart the container.

```typescript
import { createServer, IncomingMessage, ServerResponse } from "node:http";

function handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
  if (req.url === "/healthz") {
    // Liveness: is the process alive and not deadlocked?
    res.writeHead(200).end("ok");
    return;
  }

  if (req.url === "/readyz") {
    // Readiness: should traffic be routed here?
    if (isShuttingDown) {
      res.writeHead(503).end("shutting down");
    } else {
      res.writeHead(200).end("ready");
    }
    return;
  }
}
```

### Step 5: Track active connections

Maintain a count of in-flight requests so you know when draining is complete.

```typescript
let activeConnections = 0;
let drainResolve: (() => void) | null = null;

function onRequestStart(): void {
  activeConnections++;
}

function onRequestEnd(): void {
  activeConnections--;
  if (isShuttingDown && activeConnections === 0 && drainResolve) {
    drainResolve();
  }
}

function waitForActiveConnections(): Promise<void> {
  if (activeConnections === 0) return Promise.resolve();
  return new Promise((resolve) => {
    drainResolve = resolve;
  });
}
```

## Examples

### Example 1: Express.js server with graceful shutdown

```typescript
import express from "express";
import { createServer } from "node:http";

const app = express();
const server = createServer(app);
let isShuttingDown = false;
let activeRequests = 0;

// Track in-flight requests
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader("Connection", "close");
    res.status(503).json({ error: "Server is shutting down" });
    return;
  }
  activeRequests++;
  res.on("finish", () => activeRequests--);
  next();
});

// Health endpoints
app.get("/healthz", (_, res) => res.send("ok"));
app.get("/readyz", (_, res) => {
  res.status(isShuttingDown ? 503 : 200).send(isShuttingDown ? "draining" : "ready");
});

// Application routes
app.get("/api/data", async (req, res) => {
  const data = await fetchData();
  res.json(data);
});

// Graceful shutdown
function shutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received — draining ${activeRequests} active requests`);

  server.close();

  const forceExit = setTimeout(() => {
    console.error("Forced exit — drain timeout exceeded");
    process.exit(1);
  }, 25_000);
  forceExit.unref();

  const poll = setInterval(() => {
    if (activeRequests === 0) {
      clearInterval(poll);
      console.log("All requests drained — exiting cleanly");
      process.exit(0);
    }
  }, 100);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.listen(3000, () => console.log("Server ready on :3000"));
```

### Example 2: Python FastAPI with graceful shutdown

```python
import asyncio
import signal
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response

active_requests = 0
is_shutting_down = False
shutdown_event = asyncio.Event()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGTERM, begin_shutdown)
    yield
    # Shutdown — wait for in-flight requests
    if active_requests > 0:
        try:
            await asyncio.wait_for(shutdown_event.wait(), timeout=25.0)
        except asyncio.TimeoutError:
            print(f"Drain timeout — {active_requests} requests abandoned")
    print("Shutdown complete")


app = FastAPI(lifespan=lifespan)


def begin_shutdown():
    global is_shutting_down
    is_shutting_down = True
    print(f"SIGTERM received — draining {active_requests} requests")
    if active_requests == 0:
        shutdown_event.set()


@app.middleware("http")
async def track_requests(request: Request, call_next):
    global active_requests
    if is_shutting_down:
        return Response("Service shutting down", status_code=503)
    active_requests += 1
    try:
        response = await call_next(request)
        return response
    finally:
        active_requests -= 1
        if is_shutting_down and active_requests == 0:
            shutdown_event.set()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/readyz")
async def readyz():
    if is_shutting_down:
        return Response("draining", status_code=503)
    return {"status": "ready"}
```

### Example 3: Background worker with checkpoint

```typescript
import { parentPort } from "node:worker_threads";

let isShuttingDown = false;
let currentJob: { id: string; checkpoint: () => Promise<void> } | null = null;

process.on("SIGTERM", async () => {
  isShuttingDown = true;
  console.log("Worker shutting down — finishing current job");

  if (currentJob) {
    await currentJob.checkpoint();
    console.log(`Job ${currentJob.id} checkpointed`);
  }

  process.exit(0);
});

async function processJobs(queue: JobQueue): Promise<void> {
  while (!isShuttingDown) {
    const job = await queue.poll({ timeout: 5000 });
    if (!job) continue;

    currentJob = job;
    await job.execute();
    await queue.ack(job.id);
    currentJob = null;
  }
}
```

## Best Practices

- Always set a drain timeout shorter than the orchestrator's kill timeout (`terminationGracePeriodSeconds` in Kubernetes defaults to 30s — use 25s for your drain)
- Return `Connection: close` header on responses sent during draining so HTTP/1.1 clients don't reuse the connection
- Reject new requests with 503 during shutdown so load balancers learn faster
- Unref your force-exit timer so it doesn't keep the event loop alive after all work is done
- Flush async buffers (log transports, metric aggregators, write-ahead logs) before exiting
- Use `process.exit(0)` for clean shutdown and `process.exit(1)` for timeout/error so orchestrators can distinguish the two
- Test shutdown behavior explicitly — simulate SIGTERM in integration tests and verify no requests are dropped

## Common Pitfalls

- **Problem:** Kubernetes kills the pod before connections drain because `terminationGracePeriodSeconds` is too short.
  **Solution:** Set it to at least drain timeout + 5s buffer. If your longest request takes 60s, use `terminationGracePeriodSeconds: 70` and drain timeout of 65s.

- **Problem:** Load balancer keeps sending traffic after SIGTERM because readiness probe still returns 200.
  **Solution:** Flip the readiness probe to 503 immediately on signal receipt — before starting to drain.

- **Problem:** `server.close()` resolves instantly but connections remain open (keep-alive).
  **Solution:** Track connections manually and destroy idle keep-alive sockets on shutdown. Active sockets with in-flight requests should drain normally.

- **Problem:** Double shutdown from both SIGTERM and SIGINT (e.g., Docker sends SIGTERM then user hits Ctrl+C).
  **Solution:** Guard with a `isShuttingDown` flag — ignore the second signal.

- **Problem:** Deadlocked process never exits because drain waits forever.
  **Solution:** Always have a hard force-exit timeout as the final backstop.

## Kubernetes Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: app
          livenessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: 3000
            initialDelaySeconds: 2
            periodSeconds: 5
```

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- WebSocket and SSE connections require application-level close frames before severing — `server.close()` alone won't gracefully end them.
- In clustered/multi-process setups (e.g., Node.js `cluster` module), each worker must handle signals independently.
- Some cloud platforms (Heroku, Railway) send SIGTERM with very short grace periods (10-30s) — adjust drain timeouts accordingly.

## Related Skills

- `@api-rate-limit-handler` — Resilient retry and backoff for outbound requests
- `@circuit-breaker` — When to stop retrying entirely and fail fast
- `@error-handling` — Structured error handling patterns
