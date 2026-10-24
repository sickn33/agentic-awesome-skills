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
  void shutdown().catch(() => { process.exitCode = 1; });
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

Orchestrators use these to decide whether to route traffic and whether to restart the container. Liveness proves the process is alive; readiness controls whether traffic is routed. While the listener is still available during a drain, keep liveness healthy and return 503 only from readiness. After the listener closes, new probes cannot connect, so do not promise that HTTP liveness remains reachable for the entire termination window.

```typescript
import { createServer, IncomingMessage, ServerResponse } from "node:http";

function handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
  if (req.url === "/healthz") {
    // Keep liveness distinct from readiness while the listener is available.
    // Drain-rejection middleware must not turn this endpoint into a 503.
    res.writeHead(200).end("ok");
    return;
  }

  if (req.url === "/readyz") {
    // Readiness: 503 during shutdown so the load balancer stops routing.
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

Maintain a count of in-flight requests so you know when draining is complete. Use a once guard covering both `finish` and `close` events so that client disconnects (aborted requests) correctly decrement the counter.

```typescript
let activeConnections = 0;
let drainResolve: (() => void) | null = null;

function trackRequest(res: ServerResponse): void {
  activeConnections++;
  let counted = true;
  function release(): void {
    if (!counted) return;
    counted = false;
    activeConnections--;
    if (isShuttingDown && activeConnections === 0 && drainResolve) {
      drainResolve();
    }
  }
  res.on("finish", release);
  res.on("close", release);
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
let drainResolve: (() => void) | null = null;

// Health endpoints — registered BEFORE the drain-rejection middleware so it
// cannot turn liveness into a 503 while the listener is still available.
app.get("/healthz", (_, res) => res.send("ok"));
app.get("/readyz", (_, res) => {
  res.status(isShuttingDown ? 503 : 200).send(isShuttingDown ? "draining" : "ready");
});

// Track in-flight requests and reject new application work during drain.
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader("Connection", "close");
    res.status(503).json({ error: "Server is shutting down" });
    return;
  }

  activeRequests++;
  let counted = true;
  function release(): void {
    if (!counted) return;
    counted = false;
    activeRequests--;
    if (isShuttingDown && activeRequests === 0 && drainResolve) {
      drainResolve();
    }
  }
  // Listen for both finish (normal) and close (client abort) so the
  // counter always decrements. The once guard prevents double-decrement
  // when both events fire.
  res.on("finish", release);
  res.on("close", release);
  next();
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

  if (activeRequests === 0) {
    console.log("No active requests — exiting cleanly");
    process.exit(0);
  }

  drainResolve = () => {
    console.log("All requests drained — exiting cleanly");
    process.exit(0);
  };
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.listen(3000, () => console.log("Server ready on :3000"));
```

### Example 2: Python FastAPI under Uvicorn

Uvicorn owns SIGTERM handling and request draining. It stops accepting new connections, asks existing connections to shut down, waits for connections and tasks up to `--timeout-graceful-shutdown`, and only then sends the ASGI lifespan shutdown event. Do not replace its signal handler or wait for requests again inside `lifespan`; use that hook to release application resources after Uvicorn's drain.

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db_pool = await open_database_pool()
    try:
        yield
    finally:
        # Uvicorn has already completed or timed out its request drain.
        await app.state.db_pool.close()


app = FastAPI(lifespan=lifespan)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/readyz")
async def readyz():
    return {"status": "ready"}
```

Run Uvicorn with a deadline shorter than the orchestrator's kill timeout:

```bash
uvicorn app:app --timeout-graceful-shutdown 25
```

If readiness must turn 503 before SIGTERM, coordinate a separately secured and tested pre-stop drain signal plus a propagation delay. FastAPI's lifespan shutdown hook is too late for that transition because Uvicorn invokes it after request draining.

### Example 3: Process-level worker with a bounded drain

`JobQueue` is an application-owned adapter. Its poll must honor the timeout, and each job must be idempotent because a crash after work but before ack causes redelivery. This is a process, not a Node worker thread (process signals are not delivered to worker threads).

```typescript
let stopping = false;
function stop(): void { stopping = true; }
process.once("SIGTERM", stop);
process.once("SIGINT", stop);

async function processJobs(queue: JobQueue): Promise<void> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const startDeadline = () => {
    if (deadline) return;
    stopping = true;
    deadline = setTimeout(() => process.exit(1), 25_000);
  };
  process.once("SIGTERM", startDeadline);
  process.once("SIGINT", startDeadline);
  try {
    while (!stopping) {
      const job = await queue.poll({ timeout: 5000 });
      if (!job) continue;
      if (stopping) break; // do not start newly polled work; leave it unacked
      await job.execute();
      await queue.ack(job.id); // only after successful work
    }
    await queue.close(); // application adapter stops polling and closes handles
    process.exitCode = 0;
  } finally {
    if (deadline) clearTimeout(deadline);
    process.off("SIGTERM", startDeadline);
    process.off("SIGINT", startDeadline);
  }
}
// Caller must await/catch processJobs; on failure close resources and set exitCode=1.
```

For checkpointing, design cooperative cancellation inside job.execute and await a confirmed checkpoint before releasing the job. Do not concurrently checkpoint mutable job state from a signal handler while execute/ack still run.

## Best Practices

- Always set a drain timeout shorter than the orchestrator's kill timeout (`terminationGracePeriodSeconds` in Kubernetes defaults to 30s — use 25s for your drain)
- Return `Connection: close` header on responses sent during draining so HTTP/1.1 clients don't reuse the connection
- Reject new requests with 503 during shutdown so load balancers learn faster
- Unref your force-exit timer so it doesn't keep the event loop alive after all work is done
- Flush async buffers (log transports, metric aggregators, write-ahead logs) before exiting
- Use `process.exit(0)` for clean shutdown and `process.exit(1)` for timeout/error so orchestrators can distinguish the two
- Test shutdown behavior explicitly — simulate SIGTERM in integration tests and verify no requests are dropped

## Common Pitfalls

- **Problem:** Drain-rejection middleware turns both readiness and liveness into 503 while the HTTP listener is still available.
  **Solution:** Register health routes before that middleware and flip only readiness. Once the listener closes, new probes may no longer connect; the shutdown deadline, not a promise of HTTP liveness, bounds termination.

- **Problem:** Drain hangs until the force-exit timeout even though all clients have disconnected.
  **Solution:** Track request completion with both `finish` and `close` events (Node.js) or equivalent. If a client aborts the connection, `finish` may never fire — `close` will. Use a once guard to prevent double-decrementing the counter.

- **Problem:** A FastAPI application replaces Uvicorn's SIGTERM handler or waits for in-flight requests inside lifespan shutdown.
  **Solution:** Let Uvicorn own signal handling, connection/task draining, and `--timeout-graceful-shutdown`. Use lifespan shutdown for resource cleanup; it runs after Uvicorn's request-drain phase.

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
- In clustered/multi-process setups, coordinate master and child shutdown explicitly; do not assume signals are forwarded. Worker threads need an explicit message/abort protocol.
- Some cloud platforms (Heroku, Railway) send SIGTERM with very short grace periods (10-30s) — adjust drain timeouts accordingly.

## Related Skills

- `@api-rate-limit-handler` — Resilient retry and backoff for outbound requests
- `@circuit-breaker` — When to stop retrying entirely and fail fast
- `@error-handling` — Structured error handling patterns
