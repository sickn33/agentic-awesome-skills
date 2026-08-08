---
id: cdn-cache-auth-safety
title: CDN cache auth safety
status: active
candidateKinds: ["uncached_route", "cache_header_gap"]
frameworks: ["*"]
priority: 100
citations: ["https://vercel.com/docs/caching/cdn-cache", "https://vercel.com/docs/caching/cache-control-headers", "https://vercel.com/docs/project-configuration"]
maxBriefChars: 900
---

## Investigation Brief
Treat edge caching as a safety question first. The route must be a public, cacheable GET path before a shared-cache recommendation is allowed.

## Evidence To Check
Use `methodDistribution`, `cacheBreakdown`, and headers. Before `s-maxage`, rule out cookies, sessions, authorization, draft state, and user-specific data.

## Do Not Recommend When
Do not cache mutations, dashboards, account data, request-personalized responses, or routes whose value changes per viewer. Do not mix `private` with shared-cache directives.

## Verification
Name GET share, cache mix, file line, and policy: mechanism, scope, TTL/freshness, and `Vary`. If the right policy is `no-store`, emit no-change/observation.
