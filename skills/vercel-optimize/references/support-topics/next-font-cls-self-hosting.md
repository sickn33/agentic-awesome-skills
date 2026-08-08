---
id: next-font-cls-self-hosting
title: Next.js font CLS guardrail
status: active
candidateKinds: ["cwv_poor"]
frameworks: ["next@>=13.2.0"]
metrics: ["CLS"]
priority: 86
citations: ["https://nextjs.org/docs/app/api-reference/components/font", "https://web.dev/articles/optimize-cls"]
maxBriefChars: 800
---

## Investigation Brief
For poor CLS, check fonts only when the route actually loads external font CSS or swaps text after render.

## Evidence To Check
Inspect layouts and global styles for external font links, CSS imports, custom font-face rules, late-loading font classes, and whether `next/font` is already used.

## Do Not Recommend When
Do not migrate fonts when CLS is caused by images, ads, embeds, or injected UI. Do not suggest `next/font` for unsupported Next.js versions.

## Verification
Name the CLS value, font-loading mechanism, and the exact layout or stylesheet line to change.
