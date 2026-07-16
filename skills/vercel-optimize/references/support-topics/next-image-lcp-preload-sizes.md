---
id: next-image-lcp-preload-sizes
title: Next.js image LCP preload and sizes
status: active
candidateKinds: ["cwv_poor"]
frameworks: ["next@*"]
metrics: ["LCP"]
priority: 86
citations: ["https://nextjs.org/docs/app/api-reference/components/image", "https://web.dev/articles/optimize-lcp"]
maxBriefChars: 850
---

## Investigation Brief
For poor LCP, identify whether the LCP element is an image before touching unrelated JavaScript. Hero images need correct sizing, priority behavior, and source-cache hygiene.

## Evidence To Check
Inspect above-the-fold media for `next/image`, `fill` without `sizes`, deprecated `priority` on Next.js 16, missing `preload` or `fetchPriority`, oversized dimensions, and remote-image TTL/source behavior.

## Do Not Recommend When
Do not preload multiple possible LCP images or route tiny icons/SVG UI assets through image optimization. Do not change quality or TTL without checking source-update semantics.

## Verification
Name the LCP value, image element or component, current props/config, and the exact line to change.
