---
id: core-web-vitals-client-bottlenecks
title: Core Web Vitals client bottlenecks
status: active
candidateKinds: ["cwv_poor"]
frameworks: ["*"]
priority: 90
citations: ["https://vercel.com/docs/speed-insights", "https://web.dev/articles/vitals", "https://web.dev/articles/optimize-lcp", "https://web.dev/articles/optimize-inp", "https://web.dev/articles/optimize-cls"]
maxBriefChars: 850
---

## Investigation Brief
Core Web Vitals candidates need metric-specific investigation. LCP, INP, and CLS usually have different causes and fixes.

## Evidence To Check
Use the metric exceeding its good threshold in the deep dive first. For LCP, inspect server response and critical media. For INP, inspect heavy client JavaScript and interaction handlers. For CLS, inspect dimensions, fonts, and injected content.

## Do Not Recommend When
Do not emit a generic “improve Web Vitals” recommendation. Do not optimize a metric that is within its good threshold for this route.

## Verification
Name the p75 exceeding its good threshold metric, its value, and the exact source mechanism behind that metric.
