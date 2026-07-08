---
id: not-found-catchall-request-waste
title: Not-found and catch-all request waste
status: active
candidateKinds: ["uncached_route"]
frameworks: ["*"]
routePatterns: ["(^|/)404$", "not-found", "\\[\\.\\.\\."]
priority: 92
citations: ["https://vercel.com/docs/routing/", "https://vercel.com/docs/redirects/bulk-redirects/", "https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules", "https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets"]
maxBriefChars: 850
---

## Investigation Brief
High-volume 404 or catch-all traffic is often request waste. First determine whether the traffic is legacy URLs, bots, broken links, or a real product route.

## Evidence To Check
Use route volume, method share, cache result, bot share, and top request paths. Inspect redirects, rewrites, catch-all routes, sitemap/robots output, and any WAF rules already logging or blocking the pattern.

## Do Not Recommend When
Do not block or redirect legitimate product routes, search crawlers, or unknown traffic without a log-mode validation path. Do not replace a useful 404 page with a blanket rewrite.

## Verification
Name the dominant bad path pattern, observed request or bot volume, and the redirect, routing, or WAF rule that would stop the wasted function path.
