# Marketing site

Landing pages, lead-capture forms, A/B-tested variants, region-routed homepages. Traffic is bursty (campaigns drive spikes). Bot traffic can be substantial.

## Typical billing shape

Edge Requests dominate. Image Optimization is high (hero images, illustrations, product screenshots). Bandwidth matters for video content. Function Duration is usually low — most pages are static or ISR.

## Priority patterns

1. **Aggressive caching at the edge.** Marketing pages rarely change between campaign updates. `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800` keeps the CDN warm for 24h and stale-serves for a week.
2. **Bot Protection.** Marketing campaigns attract competitor scrapers and bot traffic that inflates edge requests without delivering value. If edge cost is > $100/month and Bot Protection is disabled, this is almost always the top platform rec.
3. **ISR for content-driven sections.** Customer logos, testimonials, "latest blog post" widgets, pricing tables — anything coming from a CMS. Revalidate hourly or on webhook.
4. **A/B test logic at the edge, not in the page.** Edge Middleware for the variant assignment; cached static page per variant. Don't render the variant choice on every request.
5. **Defer all third-party JS post-hydration.** Analytics, chat widgets, marketing pixels, cookie banners. None of them block the LCP. Cite `vercel-react-best-practices:bundle-defer-third-party`.

## Frequent gotchas

- **Hero images served at native resolution.** A 4MP hero image on every viewport, including mobile. `next/image` with `sizes` is mandatory.
- **Cookie banner blocks first paint.** GDPR-compliant cookie banners often render synchronously in the head. Defer; render after hydration; persist consent state via a tiny inline script.
- **Tracking pixel waterfalls.** Three different analytics services loaded in a chain. Load them after hydration in parallel; better yet, replace some with server-side tracking via webhook.
- **`/api/contact` is the only function but runs hot.** Marketing sites are mostly static but the contact form gets bot-spammed. Rate limit at middleware; consider a queue for outgoing emails.

## Cross-references

- `https://vercel.com/docs/bot-management` — almost always the right platform rec
- `https://vercel.com/docs/incremental-static-regeneration` — for CMS-driven sections
- `https://nextjs.org/docs/app/api-reference/components/image` — hero/illustration optimization
- `vercel-react-best-practices:bundle-defer-third-party` — defer analytics/pixels
- `https://nextjs.org/docs/app/building-your-application/routing/middleware` — A/B variant routing at the edge
