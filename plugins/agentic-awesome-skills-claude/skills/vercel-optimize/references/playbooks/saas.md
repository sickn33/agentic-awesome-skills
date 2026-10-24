# SaaS

Multi-tenant applications with authenticated dashboards, settings, billing. Auth-gated by default. Traffic skews toward function duration (per-user data fetches) over edge requests.

## Typical billing shape

Function Duration dominates (every dashboard request runs the function fully — no edge caching for auth-gated content). Edge Requests grow with API surface. ISR rarely applies. Image Optimization rarely material.

## Priority patterns

1. **Per-request memoization with React.cache().** Server Components called from multiple places in the same request tree often re-query the database. `React.cache()` dedupes within the request. Cite `vercel-react-best-practices:server-cache-react`.
2. **Parallel data loads in Server Components.** Dashboards typically load user + org + billing + recent-activity. Resolve authentication and tenant permissions first; parallelize only independent authorized data queries. Cite `vercel-react-best-practices:async-parallel` and `:server-parallel-fetching`.
3. **Fluid Compute.** Auth-gated routes have higher cold-start sensitivity (every cold start is a user waiting). If cold-start signal shows up in observability, Fluid Compute is usually the right account-level rec.
4. **Async work after response.** Non-critical analytics can run via `after()` (Next 15+) or `waitUntil()` from `@vercel/functions`. Cite `vercel-react-best-practices:server-after-nonblocking`.
5. **Suspense boundaries around expensive widgets.** The dashboard shell renders fast; widgets stream in. This shifts perceived latency without changing the underlying queries.

## Frequent gotchas

- **N+1 ORM queries.** A list page that loops over results and fetches related records per-item. Especially common with Prisma's `.findUnique` inside a `.map`. Use `include` or batch via DataLoader.
- **Sequential session+permission checks.** `await getSession()` then `await checkPermissions()` then `await loadData()` — do not fetch private data ahead of its authorizing session/permission guard; combine an authorized query or preserve the dependency.
- **No connection pooling on serverless.** Prisma without a pooler exhausts the database under load. Connection pooling is mandatory.
- **Polling for state from the client.** Every poll is a function invocation. Replace with SWR + on-demand revalidation, or an authenticated push channel; server-side revalidateTag alone does not notify an open client.

## Cross-references

- `vercel-react-best-practices:server-cache-react` — per-request dedup
- `vercel-react-best-practices:server-parallel-fetching` — restructure for Promise.all
- `vercel-react-best-practices:async-suspense-boundaries` — stream the dashboard shell
- `vercel-react-best-practices:server-after-nonblocking` — defer audit/analytics writes (Next 15+)
- `vercel-react-best-practices:client-swr-dedup` — replace polling with SWR
- `https://vercel.com/docs/fluid-compute` — when cold starts hurt
