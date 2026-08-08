---
id: next-heavy-ui-lazy-load-boundaries
title: Next.js heavy UI lazy-load boundaries
status: active
candidateKinds: ["cwv_poor"]
frameworks: ["next@*"]
metrics: ["LCP", "INP"]
priority: 82
citations: ["https://nextjs.org/docs/app/guides/lazy-loading", "https://web.dev/articles/optimize-inp"]
maxBriefChars: 850
---

## Investigation Brief
Heavy above-the-fold or rarely used UI can hurt LCP and INP when it ships too much JavaScript on first load. Look for concrete route-local UI, not generic bundle advice.

## Evidence To Check
Inspect client components, menus, search overlays, personalization widgets, maps, editors, and large imported libraries. Check whether they can load on interaction, viewport, or route entry with `next/dynamic` or dynamic import.

## Do Not Recommend When
Do not lazy-load essential above-the-fold content needed for initial meaning or accessibility. Do not use `ssr: false` from a Server Component.

## Verification
Name the poor metric, heavy UI boundary, imported library or component, and exact line to split.
