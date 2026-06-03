---
id: runtime-cache-reusable-data
title: Runtime Cache for reusable server data
status: active
candidateKinds: ["slow_route", "external_api_slow"]
frameworks: ["*"]
priority: 84
citations: ["https://vercel.com/docs/caching/runtime-cache", "https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package"]
maxBriefChars: 850
---

## Investigation Brief
Runtime Cache is only useful when the same server-side result is reused across requests. Treat it as a measured alternative when CDN response caching is unsafe or incomplete.

## Evidence To Check
Use p75/p95 latency, call count, caller routes, and transfer bytes. In source, identify database queries, external API calls, or expensive computations that return the same result for many viewers.

## Do Not Recommend When
Skip per-user data, mutations, secrets, one-off requests, or unknown freshness. Skip Runtime Cache when CDN caching solves the route. For Next with Cache Components, check `use cache: remote` first; use Runtime Cache only as a justified fallback.

## Verification
Name the reusable data, observed route or hostname pressure, required freshness window, and the exact call site to wrap.
