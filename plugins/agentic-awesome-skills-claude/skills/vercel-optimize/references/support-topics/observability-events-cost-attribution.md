---
id: observability-events-cost-attribution
title: Observability Events cost attribution
status: active
candidateKinds: ["observability_events_attribution"]
frameworks: ["*"]
priority: 92
citations: ["https://vercel.com/docs/observability/observability-plus", "https://vercel.com/docs/alerts"]
maxBriefChars: 900
---

## Investigation Brief
Observability Events is the metered SKU under Observability Plus. When the current bill shows a large Observability Events share, event volume is the lever. Reduce upstream: lift cache hit rate, narrow middleware matchers, and reduce unnecessary custom-span cardinality.

## Evidence To Check
Verify the share from `usage.services`. Cross-reference `requestsByRouteCache`, `middlewareCount`, external API span counts, and third-party tracing (`tracesSampleRate=1`).

## Do Not Recommend When
Skip below 15% share. Skip when cache hit rate is already >90% across hot routes — the lever is elsewhere. Do not propose sampling unless the specific metered signal has a documented sampling control.

## Verification
Name the share, upstream drivers, and concrete remediation per driver, not generic "reduce events".
