---
id: dynamic-rendering-traps
title: Dynamic rendering traps
status: active
candidateKinds: ["rendering_candidate"]
frameworks: ["next@>=13.0.0"]
priority: 90
citations: ["https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config", "https://nextjs.org/docs/app/api-reference/functions/generate-static-params", "https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering"]
maxBriefChars: 850
---

## Investigation Brief
Rendering candidates are only actionable when the dynamic behavior is accidental. First prove that the route can be static, ISR, or partially static.

## Evidence To Check
Inspect `dynamic`, `revalidate`, `generateStaticParams`, route params, and dynamic APIs such as request headers or cookies. Check whether the dynamic call is in a layout, because that can affect a larger route tree.

## Do Not Recommend When
Do not remove dynamic rendering for auth, personalization, draft mode, per-request redirects, or request-specific data.

## Verification
The recommendation must cite the dynamic trigger and explain why the target route can tolerate static or ISR behavior.
