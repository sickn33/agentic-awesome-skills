---
id: nuxt-route-rules-cache-isr
title: Nuxt routeRules cache and ISR
status: active
candidateKinds: ["uncached_route", "isr_overrevalidation", "rendering_candidate"]
frameworks: ["nuxt@>=3.0.0"]
priority: 90
citations: ["https://vercel.com/docs/frameworks/full-stack/nuxt", "https://nuxt.com/docs/4.x/api/utils/define-route-rules", "https://nuxt.com/docs/4.x/guide/concepts/rendering"]
maxBriefChars: 850
---

## Investigation Brief
For Nuxt on Vercel, route-level caching usually belongs in `routeRules`. Match the lever to the route: prerender for static pages, ISR for shared content, and SSR for request-specific views.

## Evidence To Check
Inspect `nuxt.config`, inline route rules, server routes, pages, auth/session reads, and observed cache or ISR read/write patterns. Verify whether the route should be Vercel cache-backed ISR rather than generic SWR.

## Do Not Recommend When
Do not cache authenticated, cart, checkout, preview, or per-user routes. Do not add routeRules without proving the route is public and the freshness window is acceptable.

## Verification
Name the observed route signal, current routeRule or missing rule, chosen cache mode, and exact config line.
