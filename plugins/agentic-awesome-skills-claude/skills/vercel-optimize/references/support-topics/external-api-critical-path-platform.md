---
id: external-api-critical-path-platform
title: Cross-framework external API critical path
status: active
candidateKinds: ["external_api_slow"]
frameworks: ["*"]
priority: 86
citations: ["https://vercel.com/docs/functions/debug-slow-functions", "https://vercel.com/docs/caching/runtime-cache", "https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package"]
maxBriefChars: 850
---

## Investigation Brief
External API candidates are actionable only when the slow hostname is on a customer route's critical path. Prove the route waits on it before suggesting a cache, payload, or post-response change.

## Evidence To Check
Use hostname latency, caller routes, transfer bytes, and source awaits. Check sequential calls, overbroad payloads, repeated shared data, and side effects that can move after the response.

## Do Not Recommend When
Do not cache mutations, secrets, per-user responses, or unknown freshness contracts. Do not blame Vercel runtime when the upstream owns the latency.

## Verification
Name the hostname, caller route, observed p75/p95 or bytes, and exact await or fetch line that blocks the response.
