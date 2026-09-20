---
name: cloudflare-workers
description: Build and deploy edge functions with Cloudflare Workers and Wrangler.
  Use for APIs, cron jobs, and edge middleware.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Cloudflare Workers

Deploy JavaScript and TypeScript functions to Cloudflare's global edge network with sub-millisecond cold starts.

## When to Use

- Building lightweight APIs and microservices at the edge.
- Adding middleware (auth, rate limiting, header injection) in front of origin servers.
- Running cron jobs on a schedule without maintaining infrastructure.
- Processing webhooks, image transformations, or A/B testing logic.
- Serving dynamic content from KV, D1, or R2 storage bindings.

## Prerequisites

- Node.js 18+ installed locally.
- Wrangler CLI: `npm install -g wrangler`.
- Cloudflare account (free plan supports 100,000 requests/day).
- Authenticated: `wrangler login` or set `CLOUDFLARE_API_TOKEN`.

## Quick Start

```bash
# Scaffold a new Worker project
npm create cloudflare@latest my-worker
cd my-worker

# Login to Cloudflare
npx wrangler login

# Start local development server (port 8787)
npx wrangler dev

# Deploy to production
npx wrangler deploy
```

## Essential Wrangler Commands

```bash
# Local development with remote bindings (KV, D1, R2)
npx wrangler dev --remote

# Deploy to a specific environment
npx wrangler deploy --env staging

# Set a secret (prompts for value)
npx wrangler secret put API_TOKEN
npx wrangler secret put API_TOKEN --env staging

# List secrets
npx wrangler secret list

# Tail production logs in real time
npx wrangler tail

# Tail with filters
npx wrangler tail --status=error --search="timeout"

# View deployment versions
npx wrangler deployments list

# Rollback to a previous deployment
npx wrangler rollback
```

## Wrangler Configuration

```toml
# wrangler.toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]

# Custom routes
routes = [
  { pattern = "api.example.com/*", zone_name = "example.com" }
]

# Or use a workers.dev subdomain
# workers_dev = true

# Environment variables (non-secret)
[vars]
ENVIRONMENT = "production"
API_VERSION = "v2"

# Staging environment override
[env.staging]
name = "my-api-staging"
routes = [
  { pattern = "api-staging.example.com/*", zone_name = "example.com" }
]
[env.staging.vars]
ENVIRONMENT = "staging"
```

## Worker Examples

### Basic API Router

```typescript
// src/index.ts
export interface Env {
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/":
        return new Response("OK", { status: 200 });

      case "/api/health":
        return Response.json({
          status: "healthy",
          env: env.ENVIRONMENT,
          timestamp: new Date().toISOString(),
        });

      case "/api/data":
        if (request.method !== "POST") {
          return new Response("Method Not Allowed", { status: 405 });
        }
        const body = await request.json();
        // Process in the background after returning response
        ctx.waitUntil(logToAnalytics(body));
        return Response.json({ received: true });

      default:
        return new Response("Not Found", { status: 404 });
    }
  },
};

async function logToAnalytics(data: unknown): Promise<void> {
  await fetch("https://analytics.example.com/ingest", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}
```

### Middleware: Rate Limiting with KV

```typescript
// src/rate-limiter.ts
interface Env {
  RATE_LIMIT_KV: KVNamespace;
  ORIGIN_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const key = `ratelimit:${ip}`;
    const window = 60; // seconds
    const maxRequests = 100;

    const current = parseInt((await env.RATE_LIMIT_KV.get(key)) || "0");

    if (current >= maxRequests) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": String(window) },
      });
    }

    await env.RATE_LIMIT_KV.put(key, String(current + 1), {
      expirationTtl: window,
    });

    // Forward to origin
    const originRequest = new Request(env.ORIGIN_URL + new URL(request.url).pathname, request);
    return fetch(originRequest);
  },
};
```

## KV Storage Binding

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "MY_KV"
id = "abc123def456"

# Preview namespace for local dev
[[kv_namespaces]]
binding = "MY_KV"
id = "abc123def456"
preview_id = "preview789"
```

```typescript
// KV operations in a Worker
interface Env {
  MY_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Write with TTL
    await env.MY_KV.put("session:abc", JSON.stringify({ user: "alice" }), {
      expirationTtl: 3600,
    });

    // Read
    const session = await env.MY_KV.get("session:abc", "json");

    // List keys by prefix
    const list = await env.MY_KV.list({ prefix: "session:", limit: 100 });

    // Delete
    await env.MY_KV.delete("session:abc");

    return Response.json({ session, keys: list.keys.length });
  },
};
```

```bash
# KV CLI operations
npx wrangler kv namespace create MY_KV
npx wrangler kv namespace list
npx wrangler kv key put --namespace-id=abc123 "config:feature-flags" '{"darkMode":true}'
npx wrangler kv key get --namespace-id=abc123 "config:feature-flags"
npx wrangler kv key list --namespace-id=abc123 --prefix="config:"
```

## D1 Database Binding

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "my-app"
database_id = "xxxx-yyyy-zzzz"
```

```typescript
// D1 SQL queries in a Worker
interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Parameterized query
    const { results } = await env.DB.prepare(
      "SELECT id, name, email FROM users WHERE active = ? LIMIT ?"
    )
      .bind(1, 50)
      .all();

    // Insert
    await env.DB.prepare("INSERT INTO users (name, email) VALUES (?, ?)")
      .bind("Alice", "alice@example.com")
      .run();

    // Batch multiple statements
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET active = 0 WHERE last_login < ?").bind("2024-01-01"),
      env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()),
    ]);

    return Response.json(results);
  },
};
```

```bash
# D1 CLI operations
npx wrangler d1 create my-app
npx wrangler d1 list
npx wrangler d1 execute my-app --command="CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, active INTEGER DEFAULT 1)"
npx wrangler d1 execute my-app --file=./migrations/001_init.sql
npx wrangler d1 execute my-app --command="SELECT * FROM users" --json
```

## Cron Triggers

```toml
# wrangler.toml
[triggers]
crons = [
  "0 */6 * * *",   # Every 6 hours
  "0 0 * * MON",   # Every Monday at midnight
  "*/15 * * * *",  # Every 15 minutes
]
```

```typescript
// src/index.ts — scheduled handler
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    switch (event.cron) {
      case "0 */6 * * *":
        ctx.waitUntil(cleanupExpiredSessions(env));
        break;
      case "0 0 * * MON":
        ctx.waitUntil(generateWeeklyReport(env));
        break;
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response("OK");
  },
};
```

## Durable Objects

```toml
# wrangler.toml
[durable_objects]
bindings = [
  { name = "COUNTER", class_name = "Counter" }
]

[[migrations]]
tag = "v1"
new_classes = ["Counter"]
```

```typescript
// src/counter.ts — Durable Object class
export class Counter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    let count = (await this.state.storage.get<number>("count")) || 0;
    count++;
    await this.state.storage.put("count", count);
    return Response.json({ count });
  }
}

// src/index.ts — route to Durable Object
interface Env {
  COUNTER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.COUNTER.idFromName("global-counter");
    const stub = env.COUNTER.get(id);
    return stub.fetch(request);
  },
};
```

## Custom Routing

```toml
# Route to specific zones
routes = [
  { pattern = "api.example.com/v1/*", zone_name = "example.com" },
  { pattern = "api.example.com/v2/*", zone_name = "example.com" },
]

# Or use custom domains (automatic SSL)
# Dashboard: Workers > your-worker > Triggers > Custom Domains
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Error 1101: Worker threw exception` | Unhandled error in fetch handler | Wrap handler in try/catch; check `wrangler tail` for stack trace |
| `exceeded CPU time limit` | Worker exceeds 10ms CPU (free) or 30s (paid) | Optimize code; offload work with `ctx.waitUntil()` |
| KV reads return stale data | KV is eventually consistent (~60s) | Use `cacheTtl` option or switch to Durable Objects for strong consistency |
| `wrangler dev` binding errors | Local bindings not configured | Use `--remote` flag or configure `preview_id` in `wrangler.toml` |
| Secret not found in Worker | Secret set for wrong environment | Verify with `wrangler secret list --env <env>` |
| CORS errors from browser | Missing CORS headers in response | Add `Access-Control-Allow-Origin` headers; handle OPTIONS preflight |
| Route not matching | Pattern does not include `/*` suffix | Add `/*` to catch all paths: `api.example.com/*` |

## Related Skills

- cloudflare-pages (`cloudflare-pages`) - Frontend deployments with Pages Functions
- cloudflare-r2 (`cloudflare-r2`) - Object storage at the edge
- cloudflare-zero-trust (`cloudflare-zero-trust`) - Protect Worker endpoints with Access

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

