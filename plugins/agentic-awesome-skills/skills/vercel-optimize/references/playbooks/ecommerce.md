# E-commerce

Storefronts with cart, checkout, product catalogs. Often Stripe-integrated. Traffic skews toward catalog browsing (cacheable) and checkout (uncacheable).

## Typical billing shape

Edge Requests dominate (catalog browsing, image asset traffic) → Image Optimization (product images) → Function Duration (cart/checkout APIs). ISR Reads matter when product pages use ISR.

## Priority patterns

1. **Catalog pages: aggressive ISR + image optimization.** Product list and product detail pages should be ISR with a sensible `revalidate` (60s-3600s). Every image should go through `next/image` (or the framework equivalent). For Vercel-hosted storefronts, image cost can dominate everything else.
2. **Checkout: keep dynamic, but parallelize external calls.** Cart/checkout/payment routes are correctly dynamic. The win is in reducing their function duration — `Promise.all` for independent calls to Stripe + inventory + tax services. Cite `vercel-react-best-practices:async-parallel`.
3. **Cart drawer hydration: lift `'use client'` to the leaf.** Cart components are interactive, but the page wrapping them shouldn't be. Hoist server-rendered parts upward; only the buttons/forms are client.
4. **Webhooks: separate, not on the user path.** Stripe/Shopify webhook handlers should live as their own routes with short duration limits. They don't share traffic patterns with the storefront.
5. **Edge middleware for A/B + region routing only.** Catalog locale routing is a fine fit. Auth/cart state belongs in the dynamic page, not middleware.

## Frequent gotchas

- **Product images served raw.** `<img src={product.imageUrl}>` for hundreds of variants costs more than the rest of the bill combined. Always next/image.
- **`force-dynamic` on the storefront homepage.** Often added during development to test cart-state behavior, never removed. Audit ruthlessly.
- **Sequential Stripe calls.** "Create customer" → "create subscription" → "create invoice" is often three sequential awaits where two could run in parallel.
- **Bot traffic on product search.** Marketing-driven traffic + bot traffic on search routes inflates edge request cost. Bot Protection often pays for itself within a month.

## Cross-references

- `vercel-react-best-practices:async-parallel` — parallelize Stripe/inventory/tax calls in checkout
- `vercel-react-best-practices:async-suspense-boundaries` — stream the checkout shell, fill cart drawer later
- `vercel-react-best-practices:bundle-defer-third-party` — defer analytics (GA, Mixpanel) post-hydration
- `https://nextjs.org/docs/app/api-reference/components/image` — for the catalog image fix
- `https://vercel.com/docs/bot-management` — for bot traffic on search/product routes
