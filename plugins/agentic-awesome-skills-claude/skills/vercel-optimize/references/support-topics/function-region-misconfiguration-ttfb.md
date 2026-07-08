---
id: function-region-misconfiguration-ttfb
title: Function region misconfiguration (TTFB)
status: active
candidateKinds: ["region_misconfig"]
frameworks: ["*"]
scannerPatterns: ["region-pin-in-config"]
priority: 85
citations: ["https://vercel.com/docs/functions/configuring-functions/region", "https://vercel.com/docs/regions"]
maxBriefChars: 950
---

## Investigation Brief
A single function region is pinned. Per-region TTFB data is unavailable today (`evidence.dataGap`); treat as an audit prompt — validate the pinned region against user geo and data-source location before recommending changes.

## Evidence To Check
Scanner subtype (`vercel-json-single`, `segment-preferred`) and pinned regions. Cross-check Speed Insights TTFB and country analytics for traffic geo. Locate the data source — proximity to it often wins on cache-miss paths.

## Do Not Recommend When
Skip if TTFB is healthy across countries. Skip if pinned intentionally for data proximity. Skip on small projects (<20 routes). Do not propose multi-region without confirming the data layer is reachable without cross-region egress.

## Verification
Name pinned region(s), traffic geo, data-source location, and a specific call: relocate, expand, or keep with a TTFB monitor.
