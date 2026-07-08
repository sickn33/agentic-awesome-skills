# Content site

Documentation, blogs, knowledge bases, marketing-adjacent content with mostly static pages. Authoring may be headless-CMS-driven or markdown-in-repo.

## Typical billing shape

Edge Requests dominate (every page view is an edge request; static assets even more). Image Optimization is often the #2 line item. Function Duration tends to be low — most pages should be static or ISR.

## Priority patterns

1. **Pre-render everything that can be pre-rendered.** Blog index, individual posts, docs pages, category pages. Use `generateStaticParams` for App Router or `getStaticPaths` for Pages Router. Anything CMS-driven should run on a webhook revalidation, not on every request.
2. **ISR with a sensible cadence.** Pages that need fresh-ish content but don't need real-time accuracy go ISR. `revalidate: 3600` (hourly) is a good starting point for docs; `60s` for blog index pages.
3. **`next/image` for every image asset.** Hero images, author photos, post inline images, OG images. Even thumbnail-only sites benefit from format negotiation (WebP/AVIF).
4. **`next/font` for self-hosted fonts.** Eliminates FOIT/FOUT, eliminates the third-party request, prevents CLS.
5. **Prefetch on hover.** `next/link` does this by default. For other frameworks, consider intersection-observer-based prefetch on the visible link set.

## Frequent gotchas

- **`force-dynamic` on the blog index.** Almost never necessary. The index can ISR or be fully static.
- **Markdown rendering on every request.** If you're parsing MDX at request time, you're paying function-duration cost on what should be a static asset. Build-time MDX → static HTML.
- **Search rebuilt on every request.** Site search backed by a function that queries a CMS on every keystroke. Move to a search index (Algolia, Pagefind, build-time generated) and serve from the CDN.
- **CMS preview routes leaking into production traffic.** A `/preview/[slug]` route that's effectively another rendering path; sometimes called from production by mistake. Audit referrers.

## Cross-references

- `https://nextjs.org/docs/app/api-reference/functions/generate-static-params` — for pre-rendering
- `https://vercel.com/docs/incremental-static-regeneration` — for the ISR fix
- `https://nextjs.org/docs/app/api-reference/components/image` — image optimization
- `https://nextjs.org/docs/app/api-reference/components/font` — self-hosted fonts
- `vercel-react-best-practices:bundle-defer-third-party` — defer analytics/cookie banners
