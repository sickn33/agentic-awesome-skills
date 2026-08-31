---
name: upstash-redis
description: "Use the @upstash/redis HTTP client for caching, sessions, counters, and Redis data structures from serverless and edge runtimes without connection pooling."
category: backend
risk: critical
source: self
source_type: self
date_added: "2026-08-31"
author: CahidArda
tags: [upstash, redis, cache, serverless, edge, key-value]
tools: [claude, codex, cursor, gemini]
---

# Upstash Redis

## Overview

`@upstash/redis` is a Redis client that talks to an Upstash Redis database over
HTTPS instead of a TCP connection. Because every command is a stateless HTTP
request, it works in environments where a pooled TCP client is awkward or
impossible: Vercel and Netlify functions, Cloudflare Workers, Deno, Bun, and
Next.js middleware. The client serializes and deserializes JavaScript values
automatically, so numbers and objects round-trip without manual `JSON.parse`.

## When to Use This Skill

- Use when the user needs a cache, session store, counter, leaderboard, or
  simple queue from a serverless or edge function.
- Use when the user mentions Upstash Redis, `UPSTASH_REDIS_REST_URL`, or
  `@upstash/redis`.
- Use when migrating an `ioredis` or `node-redis` call site to a runtime that
  cannot hold a persistent TCP socket.
- Do not use for a self-hosted or non-Upstash Redis server; the client only
  speaks the Upstash REST protocol. Use `ioredis` or `node-redis` there.
- Do not use for Redis administration or CLI work; see `redis-cli`.

## How It Works

### Step 1: Configure credentials

Create a database in the Upstash console and copy the REST URL and token into
environment variables. Never hardcode them.

```bash
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-rest-token>
```

### Step 2: Create one client per module

```typescript
import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();
```

On Cloudflare Workers, import from `@upstash/redis/cloudflare` and pass the
worker `env` object: `Redis.fromEnv(env)`.

### Step 3: Call Redis commands as methods

Command names are lowercase methods (`get`, `set`, `hset`, `zadd`, `incr`).
Values are auto-serialized; pass and receive native JavaScript types.

## Examples

### Example 1: Cache-aside with a TTL

```typescript
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function getUser(id: string) {
  const cached = await redis.get<{ id: string; name: string }>(`user:${id}`);
  if (cached) return cached;

  const user = await db.users.findById(id);
  await redis.set(`user:${id}`, user, { ex: 3600 }); // expires in 1 hour
  return user;
}

export async function invalidateUser(id: string) {
  await redis.del(`user:${id}`);
}
```

### Example 2: Batch commands in a pipeline

```typescript
const pipeline = redis.pipeline();
pipeline.hset("user:1", { name: "Alice", plan: "pro" });
pipeline.incr("signups:total");
pipeline.zadd("leaderboard", { score: 120, member: "user:1" });
const [hsetResult, signups, zaddResult] = await pipeline.exec();
```

`pipeline()` batches independent commands into one round trip. It is not
atomic; use `redis.multi()` for MULTI/EXEC or a reviewed server-side Lua script
when commands must run as one unit.

## Best Practices

- ✅ Read credentials with `Redis.fromEnv()` or from a secrets manager.
- ✅ Set a TTL (`{ ex: seconds }`) on cache entries so stale data expires.
- ✅ Namespace keys (`user:123`, `session:abc`) to keep the keyspace readable.
- ✅ Use `pipeline()` or `mget`/`mset` instead of many sequential awaits.
- ❌ Don't `JSON.stringify` values before `set`; the client already does it.
- ❌ Don't call `keys("*")` in request handlers; use `scan` for large keyspaces.
- ❌ Don't store secrets or PII in Redis without a retention plan and TTL.

## Limitations

- Requires an Upstash Redis database; it cannot connect to other Redis servers.
- Each command is an HTTP request, so latency is higher than a warm TCP
  connection; batch with pipelines where it matters.
- Transactions (`multi()`) do not roll back on runtime errors, and `WATCH` is
  not available over REST; use a Lua script for atomic check-and-set.
- Pub/Sub subscribe and blocking commands (`BLPOP`, `XREAD BLOCK`) are not
  supported over the REST client.
- This skill covers the TypeScript client only. Python, Go, and other SDKs
  differ in method names.
- This skill does not replace environment-specific validation, testing, or
  expert review.

## Security & Safety Notes

- The REST token grants full read/write access to the database. Keep it in
  server-side environment variables; never ship it to a browser bundle.
- Use a read-only token from the console for read-only workloads.
- Commands such as `flushdb` and `del` are destructive; confirm with the user
  before running them against a production database.

## Common Pitfalls

- **Problem:** `get` returns `null` in production but works locally.
  **Solution:** The deployment is missing `UPSTASH_REDIS_REST_URL` or
  `UPSTASH_REDIS_REST_TOKEN`; check the platform's environment settings.
- **Problem:** A number comes back as a string after `incr` on a value set
  with `JSON.stringify`.
  **Solution:** Store the raw number (`redis.set("n", 1)`) and let the client
  serialize it.

## Related Skills

- `@upstash-ratelimit` - Rate limiting built on this client.
- `@upstash-qstash` - HTTP message queue and schedules when you need delivery
  guarantees rather than a data store.
- `@redis-cli` - Inspecting and administering Redis from the command line.
- `@bullmq-specialist` - Job queues on a TCP Redis you operate yourself.

## Additional Resources

- [Upstash Redis documentation](https://upstash.com/docs/redis)
- [@upstash/redis on GitHub](https://github.com/upstash/redis-js)
- [TypeScript SDK reference](https://upstash.com/docs/redis/sdks/ts/overview)
