# API service

Headless API backend. No UI routes. Often consumed by mobile apps, partner integrations, or other Vercel projects via rewrites.

## Typical billing shape

Function Duration dominates (every request is a function invocation). Edge Requests scale with API traffic. External API costs matter when the service is a thin shim over third-party APIs (Stripe, Twilio, etc.).

## Priority patterns

1. **Cache GET responses at the edge.** Idempotent GET endpoints (catalog reads, status checks, public data) should ship with `Cache-Control: public, s-maxage=<seconds>, stale-while-revalidate=<longer>`. The CDN serves repeat callers without invoking the function.
2. **Rate-limit at the edge, not the function.** Middleware with proper matcher scoping handles abusive clients before they hit your function-duration bill.
3. **Parallel external API calls.** A "checkout-like" endpoint that calls Stripe + inventory + email-service sequentially is the most common slow_route in this profile. `Promise.all` is the obvious fix.
4. **Background work post-response.** `after()` (Next 15+) for analytics, webhooks-to-self, and any write that doesn't affect the response.
5. **Connection pooling.** Direct PG connections from serverless function instances exhaust the database. Use PgBouncer / Prisma Accelerate / Neon's pooler.

## Frequent gotchas

- **No `Cache-Control` on the public GETs.** This is the most common finding in this profile, and the easiest fix.
- **Auth check serialized with data load.** `await checkAuth()` then `await loadData()` — these are often independent and can run in parallel if your auth path doesn't depend on the data.
- **External API fan-out for one user.** A "build me a profile" endpoint that calls 5 third parties sequentially. Even small latency improvements multiplied by every user are huge.
- **Long-running async operations on the request path.** Image generation, PDF rendering, big report computation. Move these to background queues or `after()`.

## Cross-references

- `https://vercel.com/docs/caching/cdn-cache` — the GET-handler Cache-Control fix
- `vercel-react-best-practices:async-parallel` — parallelize external API calls
- `vercel-react-best-practices:server-after-nonblocking` — `after()` for post-response work
- `https://vercel.com/docs/fluid-compute` — when cold starts on infrequently-called endpoints hurt
- `https://nextjs.org/docs/app/building-your-application/routing/middleware` — for rate-limit middleware
