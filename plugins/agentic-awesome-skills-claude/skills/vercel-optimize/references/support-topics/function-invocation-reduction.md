---
id: function-invocation-reduction
title: Function invocation reduction
status: active
candidateKinds: ["slow_route"]
frameworks: ["next@>=13.0.0"]
priority: 70
citations: ["https://react.dev/reference/react/cache", "vercel-react-best-practices:server-parallel-fetching", "vercel-react-best-practices:server-cache-react"]
maxBriefChars: 850
---

## Investigation Brief
For slow routes, prove duplicated in-request work in the listed files before recommending consolidation or memoization.

## Evidence To Check
Look for repeated awaits, duplicate fetches, same-app route handler calls, and helpers that run more than once per request.

## Do Not Recommend When
Do not collapse endpoints called independently by different clients. Do not persistently cache user-specific data. Do not recommend `Promise.all` for CPU-bound or compile-bound work unless trace/span evidence shows wait time to overlap. High `cpu.p95` near `latency.p95` is a warning sign, not proof of a latency win.

## Verification
Quote duplicated call sites with `latency.p95`, `cpu.p95`, or request-count evidence. If the fix overlaps awaits, cite measured helper/span timing or state the impact is unmeasured.
