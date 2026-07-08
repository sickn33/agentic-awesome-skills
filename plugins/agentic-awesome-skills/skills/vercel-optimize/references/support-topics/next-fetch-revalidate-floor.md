---
id: next-fetch-revalidate-floor
title: Next.js fetch revalidation floor
status: active
candidateKinds: ["uncached_route", "isr_overrevalidation"]
frameworks: ["next@>=13.0.0"]
priority: 88
citations: ["https://nextjs.org/docs/app/api-reference/functions/fetch", "https://nextjs.org/docs/app/building-your-application/caching"]
maxBriefChars: 850
---

## Investigation Brief
Next.js `fetch` options can set the route's effective cache floor. Low `revalidate`, `revalidate: 0`, or `cache: 'no-store'` can explain uncached traffic and excessive ISR work.

## Evidence To Check
Inspect route-tree `fetch` calls. Compare route revalidation with per-fetch `cache`, `next.revalidate`, tags, dynamic APIs, and duplicated URLs with conflicting options.

## Do Not Recommend When
Do not raise freshness windows for pricing, inventory, auth, draft, or user-specific data unless the source proves stale reads are acceptable.

## Verification
Name the observed cache or ISR signal, the lowest cache setting that controls the route, and the exact fetch line to change.
