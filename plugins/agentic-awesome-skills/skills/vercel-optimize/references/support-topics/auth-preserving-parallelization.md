---
id: auth-preserving-parallelization
title: Authorization-preserving parallelization
status: active
candidateKinds: ["slow_route"]
frameworks: ["*"]
priority: 90
citations: ["vercel-react-best-practices:async-parallel", "vercel-react-best-practices:server-parallel-fetching"]
maxBriefChars: 900
---

## Investigation Brief
Parallelizing awaits is safe only when it does not move private data access ahead of the auth, ownership, tenant, or permission check protecting that data.

## Evidence To Check
List every awaited operation being reordered. If a private lookup currently runs after `getSession()`, an ownership query, a tenant check, or a redirect guard, prove the lookup itself enforces the same predicate before recommending `Promise.all`.

## Do Not Recommend When
Do not parallelize a private record fetch with the ownership check that authorizes that fetch. Instead, recommend combining the guard and data lookup into one query constrained by the authenticated user, tenant, or ownership key.

## Verification
The fix must preserve the sequential guard or replace it with a single authorized query. Do not promise a latency drop equal to a helper unless that helper duration was measured.
