---
id: function-duration-io-and-after
title: Function duration, I/O, and post-response work
status: active
candidateKinds: ["slow_route"]
frameworks: ["next@>=15.0.0"]
priority: 75
citations: ["https://nextjs.org/docs/app/api-reference/functions/after", "vercel-react-best-practices:async-parallel", "vercel-react-best-practices:server-after-nonblocking"]
maxBriefChars: 850
---

## Investigation Brief
When wall-clock latency is much higher than CPU time, check critical-path awaits before blaming rendering or compute.

## Evidence To Check
Compare `cpu.p95`, `ttfb.p95`, and `latency.p95`. In source, separate dependent awaits from independent awaits, and identify analytics, logging, or notification work that can run after the response.

## Do Not Recommend When
Do not wrap dependent operations in `Promise.all`. Do not replace `Promise.allSettled` when partial failure handling is intentional.

## Verification
Name the awaits that can move, the work that can run post-response, and the observed CPU-vs-wall-clock gap.
