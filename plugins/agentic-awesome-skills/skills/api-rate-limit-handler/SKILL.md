---
name: api-rate-limit-handler
description: "Implement bounded, idempotency-aware API throttling, backoff, and retry handling for 429 and transient 5xx responses."
category: development
risk: safe
source: self
source_type: self
date_added: "2026-08-26"
author: Prajeeth-12
tags: [rate-limiting, retry, backoff, api, resilience, throttle, 429]
tools: [claude, cursor, codex, gemini]
license: "MIT"
---

# API Rate Limit Handler

## Overview

A skill for implementing production-grade rate limiting, exponential backoff, and retry strategies when integrating with external APIs. Prevents cascading failures, respects upstream quotas, and keeps your application resilient under load.

## When to Use This Skill

- Use when calling external APIs that enforce rate limits (OpenAI, Stripe, GitHub, etc.)
- Use when you receive 429 Too Many Requests or 5xx errors and need graceful recovery
- Use when building a client that must respect `Retry-After` headers
- Use when designing a system that fans out to multiple API providers
- Use when the user says "handle rate limits", "add retry logic", "backoff strategy", or "don't get throttled"

## How It Works

### Step 1: Classify the response

Determine whether a failed request is retryable or terminal.

| Status | Classification | Action |
|--------|---------------|--------|
| 200-299 | Success | Return response |
| 400, 401, 403, 404 | Terminal client error | Do not retry — fix the request |
| 408, 429 | Retryable (rate limit / timeout) | Retry with backoff |
| 500, 502, 503, 504 | Retryable (server error) | Retry with backoff |

### Step 2: Parse rate limit headers

Always check upstream hints before computing your own delay.

```typescript
function getRetryDelay(
  response: Response,
  attempt: number,
  maxDelayMs = 60_000
): number {
  // Prefer upstream hints
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, maxDelayMs);
    }
    // HTTP-date format
    const date = new Date(retryAfter).getTime();
    if (Number.isFinite(date)) {
      return Math.min(Math.max(0, date - Date.now()), maxDelayMs);
    }
  }

  // GitHub documents x-ratelimit-reset as Unix epoch seconds.
  const githubReset = Number(response.headers.get("x-ratelimit-reset"));
  if (Number.isFinite(githubReset)) {
    return Math.min(
      Math.max(0, githubReset * 1000 - Date.now()),
      maxDelayMs
    );
  }

  // Fallback: capped exponential backoff with full jitter.
  const cap = Math.min(1000 * 2 ** attempt, maxDelayMs);
  return Math.floor(Math.random() * cap);
}
```

Provider-specific reset headers do not share one unit or format. For example,
some APIs return durations while GitHub returns epoch seconds. Parse an
additional header only after checking that provider's current documentation.

### Step 3: Implement the retry loop

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  maxElapsedMs = 120_000,
  retryNonIdempotent = false
): Promise<Response> {
  const startedAt = Date.now();
  const method = (options.method ?? "GET").toUpperCase();
  const replaySafe = ["GET", "HEAD", "OPTIONS", "PUT", "DELETE"].includes(method)
    || retryNonIdempotent;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) return response;

    // Terminal errors — do not retry
    if ([400, 401, 403, 404, 422].includes(response.status)) {
      throw new Error(`Terminal error ${response.status}: ${response.statusText}`);
    }

    if (!replaySafe) {
      throw new Error(
        `${method} was not retried because replay safety was not explicitly established`
      );
    }

    // Retryable — but exhausted attempts
    if (attempt === maxRetries) {
      throw new Error(`Failed after ${maxRetries} retries: ${response.status}`);
    }

    const remaining = maxElapsedMs - (Date.now() - startedAt);
    const delay = Math.min(getRetryDelay(response, attempt), remaining);
    if (delay <= 0) {
      throw new Error(`Retry deadline exceeded after ${maxElapsedMs}ms`);
    }

    // Release the connection before waiting when the body is not needed.
    await response.body?.cancel();
    console.warn(
      `Request failed (${response.status}), retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`
    );
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error("Unreachable");
}
```

### Step 4: Add a client-side rate limiter (proactive)

Prevent hitting upstream limits in the first place with a token bucket or sliding window.

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const ticket = this.queue.then(() => this.acquireOnce());
    this.queue = ticket.catch(() => undefined);
    return ticket;
  }

  private async acquireOnce(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitMs = ((1 - this.tokens) / this.refillRate) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Usage: limit to 60 requests/minute
const limiter = new TokenBucket(60, 1);

async function rateLimitedFetch(url: string, options: RequestInit) {
  await limiter.acquire();
  return fetchWithRetry(url, options);
}
```

## Examples

### Example 1: Idempotent API read with retry

```typescript
const response = await fetchWithRetry(
  "https://api.github.com/repos/OWNER/REPO",
  {
    method: "GET",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${githubToken}`,
    },
  },
  3
);
```

For a POST or another operation with side effects, leave
`retryNonIdempotent` false unless the provider documents an idempotency
mechanism and the same stable idempotency key is reused for every attempt.

### Example 2: Python implementation

```python
import time
import random
import httpx

def fetch_with_retry(url: str, max_retries: int = 3, **kwargs) -> httpx.Response:
    for attempt in range(max_retries + 1):
        response = httpx.request("GET", url, **kwargs)

        if response.is_success:
            return response

        if response.status_code in (400, 401, 403, 404, 422):
            response.raise_for_status()

        if attempt == max_retries:
            response.raise_for_status()

        # Parse Retry-After or compute backoff
        retry_after = response.headers.get("retry-after")
        if retry_after and retry_after.isdigit():
            delay = int(retry_after)
        else:
            delay = min(2 ** attempt + random.uniform(0, 1), 60)

        print(f"Retrying in {delay:.1f}s (attempt {attempt + 1}/{max_retries})")
        time.sleep(delay)

    raise RuntimeError("Unreachable")
```

## Best Practices

- ✅ Always respect `Retry-After` headers — they come from the provider who knows their limits
- ✅ Add jitter to backoff to prevent thundering herd when multiple clients retry simultaneously
- ✅ Log every retry with status code, delay, and attempt number for debugging
- ✅ Set a maximum total timeout to avoid hanging indefinitely
- ✅ Use a client-side rate limiter proactively rather than only reacting to 429s
- ✅ Retry state-changing requests only with a provider-documented idempotency mechanism and a stable key
- ❌ Don't retry 4xx client errors (except 408 and 429) — fix the request instead
- ❌ Don't use fixed delays — exponential backoff distributes load more evenly
- ❌ Don't retry without a cap — unbounded retries can amplify outages
- ❌ Don't ignore per-endpoint limits — some APIs have different quotas per route

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Token bucket is approximate for distributed systems — use Redis-backed rate limiting for multi-instance deployments (for example the `upstash-ratelimit` skill, or any shared-store limiter).
- Some APIs use non-standard rate limit headers; check provider documentation.
- The elapsed-time cap shown here bounds retry waits, not a single hung network call; combine it with an `AbortSignal` or client timeout.

## Common Pitfalls

- **Problem:** Retrying too aggressively during an outage amplifies the problem.
  **Solution:** Use exponential backoff with jitter and a circuit breaker for sustained failures.

- **Problem:** Multiple instances of your app all retry at the same time (thundering herd).
  **Solution:** Add randomized jitter (`Math.random() * 0.3 * delay`) to decorrelate retries.

- **Problem:** Retry-After header contains an HTTP-date instead of seconds.
  **Solution:** Parse both formats — check if the value is numeric first, then try Date parsing.

- **Problem:** Client-side limiter doesn't account for concurrent requests already in-flight.
  **Solution:** Serialize acquisition within one process, decrement before send, and use a shared distributed limiter across instances.

## Related Skills

- `@poka-yoke` - Mistake-proofing APIs so invalid requests never reach the retry path
- `@circuit-breaker` - When to stop retrying entirely and fail fast
