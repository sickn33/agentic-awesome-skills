---
id: post-response-work-waituntil
title: Post-response work with waitUntil
status: active
candidateKinds: ["slow_route", "external_api_slow"]
frameworks: ["next@<15.0.0", "sveltekit@*", "astro@*", "nuxt@*", "unknown@*"]
priority: 78
citations: ["https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package"]
maxBriefChars: 800
---

## Investigation Brief
For stacks without Next.js `after()`, check whether non-critical work can run after the response instead of extending user-visible latency.

## Evidence To Check
Inspect the listed route for analytics, logging, notifications, cache warming, metrics, or webhook side effects that happen after the response data is ready.

## Do Not Recommend When
Do not move work that decides the response, must fail the request, changes visible state synchronously, or needs a durable retry guarantee.

## Verification
Name the blocking side effect, the observed latency or upstream signal, and the exact line that can move behind `waitUntil`.
