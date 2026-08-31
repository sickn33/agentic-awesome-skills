---
name: upstash-ratelimit
description: "Add rate limiting to API routes, middleware, and edge functions with @upstash/ratelimit: sliding window, fixed window, and token bucket backed by Upstash Redis."
category: backend
risk: critical
source: self
source_type: self
date_added: "2026-08-31"
author: CahidArda
tags: [upstash, rate-limiting, redis, serverless, edge, middleware, 429]
tools: [claude, codex, cursor, gemini]
---

# Upstash Ratelimit

## Overview

`@upstash/ratelimit` implements distributed rate limiting on top of Upstash
Redis. Because state lives in Redis, every instance of a serverless function
or edge worker shares the same counters, which an in-memory limiter cannot
do. It ships three algorithms (fixed window, sliding window, token bucket),
per-identifier keys, optional in-memory blocking of already-limited
identifiers, and optional analytics.

## When to Use This Skill

- Use when the user needs to limit requests per IP, user, API key, or tenant
  across multiple serverless instances or regions.
- Use when protecting login, signup, form, webhook, or LLM endpoints from
  abuse and returning `429 Too Many Requests`.
- Use when choosing between fixed window, sliding window, and token bucket.
- Do not use for client-side retry/backoff against a third-party API's limits;
  see `api-rate-limit-handler`.
- Do not use for a single long-running process with no shared state; an
  in-memory limiter is simpler there.

## How It Works

### Step 1: Install and configure

```bash
npm install @upstash/ratelimit @upstash/redis
```

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the environment.

### Step 2: Create the limiter once, outside the handler

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
  prefix: "rl:api",
  analytics: true,
});
```

Constructing the limiter at module scope lets the built-in ephemeral cache
short-circuit blocked identifiers without a Redis call.

### Step 3: Call `limit()` with a stable identifier

```typescript
const { success, limit, remaining, reset, pending } = await ratelimit.limit(userId);
```

`success` is `false` when the identifier is over its limit. `reset` is a Unix
timestamp in milliseconds. `pending` is a promise for background work
(analytics, multi-region sync); await it or pass it to `waitUntil` on edge
runtimes so the function is not frozen before it completes.

## Examples

### Example 1: Next.js middleware returning 429

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
});

export async function middleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(reset),
        "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
      },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
```

### Example 2: Token bucket with per-plan limits

```typescript
const limiters = {
  free: new Ratelimit({
    redis: Redis.fromEnv(),
    prefix: "rl:free",
    limiter: Ratelimit.tokenBucket(5, "10 s", 10), // refill 5 per 10 s, burst 10
  }),
  pro: new Ratelimit({
    redis: Redis.fromEnv(),
    prefix: "rl:pro",
    limiter: Ratelimit.tokenBucket(50, "10 s", 100),
  }),
};

const { success } = await limiters[plan].limit(apiKey);
```

## Best Practices

- ✅ Use a stable, low-cardinality identifier (user id, API key, tenant) where
  possible; fall back to IP only for anonymous traffic.
- ✅ Set a distinct `prefix` per endpoint or plan so limits do not collide.
- ✅ Return `Retry-After` and `X-RateLimit-*` headers with 429 responses.
- ✅ Prefer `slidingWindow` for most APIs; use `tokenBucket` when short bursts
  are acceptable; use `fixedWindow` when the lowest Redis cost matters.
- ❌ Don't construct a new `Ratelimit` inside the request handler.
- ❌ Don't rely on `pending` completing on its own in edge runtimes.
- ❌ Don't rate limit by `x-forwarded-for` without validating it is set by
  your proxy; clients can spoof it otherwise.

## Limitations

- Requires an Upstash Redis database; it does not work with other Redis
  servers or without network access.
- Each `limit()` call is at least one HTTP round trip to Redis, so it adds
  latency to every request it guards.
- Sliding window is an approximation that assumes an even spread of requests
  in the previous window; it is not an exact log.
- `MultiRegionRatelimit` trades strict accuracy for lower latency and does
  not support the token bucket algorithm.
- If Redis is unreachable, the default `timeout` (5 s) lets requests through
  (`reason: "timeout"`); this fails open, not closed.
- This skill does not replace environment-specific validation, testing, or
  expert review.

## Security & Safety Notes

- Rate limiting is one layer of abuse protection, not authentication. Pair it
  with auth and input validation.
- The Redis token grants full database access; keep it server-side.
- Changing limits in production can lock out legitimate users. Confirm the
  numbers with the user before deploying stricter limits.

## Common Pitfalls

- **Problem:** Every request is allowed even after the limit.
  **Solution:** Each identifier must be the same string across requests;
  check that the identifier is not `undefined` or a fresh random value.
- **Problem:** Analytics are empty on Vercel Edge or Cloudflare Workers.
  **Solution:** Pass `pending` to `waitUntil` (`ctx.waitUntil(pending)`) so
  the background request is not cancelled when the response is sent.

## Related Skills

- `@upstash-redis` - The client this package uses for storage.
- `@api-rate-limit-handler` - Client-side backoff and retry when you are the
  one being rate limited.
- `@upstash-qstash` - Queue and smooth traffic to downstream services instead
  of rejecting it.

## Additional Resources

- [Upstash Ratelimit documentation](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [@upstash/ratelimit on GitHub](https://github.com/upstash/ratelimit-js)
- [Algorithms guide](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms)
