---
id: route-error-runtime-limits
title: Route errors and runtime limits
status: active
candidateKinds: ["route_errors"]
frameworks: ["*"]
priority: 90
citations: ["https://vercel.com/docs/functions", "https://vercel.com/docs/functions/limitations", "https://vercel.com/docs/cli/inspect"]
maxBriefChars: 850
---

## Investigation Brief
Route error candidates are reliability findings with cost impact. Determine whether the failures are app exceptions, timeouts, payload limits, or deployment-specific regressions.

## Evidence To Check
Use `errorStatusPattern`, `errorCodes`, and `errorsByDeployment`. In source, inspect the path most likely to throw, time out, or exceed a platform limit.

## Do Not Recommend When
Do not frame high 5xx volume as a performance tuning issue. Do not suggest increasing limits before proving the route needs more headroom.

## Verification
Name the error class, deployment concentration if present, and the file line that triggers or fails to handle it.
