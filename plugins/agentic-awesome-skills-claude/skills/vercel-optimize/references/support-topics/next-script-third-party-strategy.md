---
id: next-script-third-party-strategy
title: Next.js third-party script strategy
status: active
candidateKinds: ["cwv_poor"]
frameworks: ["next@*"]
metrics: ["LCP", "INP"]
priority: 85
citations: ["https://nextjs.org/docs/app/api-reference/components/script", "https://web.dev/articles/optimize-inp"]
maxBriefChars: 850
---

## Investigation Brief
Third-party scripts are only actionable when they line up with the poor metric and route. For LCP or INP, prove a specific script blocks critical rendering, hydration, or interaction.

## Evidence To Check
Inspect `next/script`, raw `<script>`, tag managers, chat widgets, analytics, and consent code. Check `beforeInteractive`, `afterInteractive`, `lazyOnload`, and whether the script is route-local or global.

## Do Not Recommend When
Do not move required bot detection, consent, auth, or payment scripts later without product evidence. Do not recommend `worker` for App Router.

## Verification
Name the poor metric, script source, current strategy, and the exact route or layout line to change.
