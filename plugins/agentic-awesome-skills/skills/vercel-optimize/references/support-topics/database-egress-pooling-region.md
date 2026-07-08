---
id: database-egress-pooling-region
title: Database region and connection pressure
status: active
candidateKinds: ["slow_route"]
frameworks: ["*"]
priority: 60
citations: ["https://vercel.com/docs/regions", "https://vercel.com/docs/functions", "https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package", "https://vercel.com/docs/functions/limitations"]
maxBriefChars: 800
---

## Investigation Brief
Only recommend database or region changes when source and metrics both point to downstream I/O rather than in-process compute.

## Evidence To Check
Compare `cpu.p95` with `latency.p95`, then inspect database awaits, query fan-out, connection creation, pool lifecycle handling, and configured regions in project files.

## Do Not Recommend When
Do not name a database provider, pooling product, or region change unless the repo and project config prove it applies.

## Verification
Tie the finding to the observed wall-clock gap and the exact query, pool, or region configuration line.
