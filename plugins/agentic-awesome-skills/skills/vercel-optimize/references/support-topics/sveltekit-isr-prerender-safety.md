---
id: sveltekit-isr-prerender-safety
title: SvelteKit ISR and prerender safety
status: active
candidateKinds: ["uncached_route", "isr_overrevalidation"]
frameworks: ["sveltekit@*"]
priority: 90
citations: ["https://vercel.com/docs/frameworks/full-stack/sveltekit", "https://svelte.dev/docs/kit/adapter-vercel", "https://svelte.dev/docs/kit/page-options"]
maxBriefChars: 850
---

## Investigation Brief
For SvelteKit, the right lever is often `prerender` or adapter ISR on public consumer pages. First prove every visitor can safely see the same response for the configured interval.

## Evidence To Check
Inspect `+page`, `+page.server`, `+server`, layouts, `prerender`, `ssr`, and adapter `isr` config. Compare route cache results, ISR writes, and whether the route reads cookies, auth, or per-user locals.

## Do Not Recommend When
Do not use ISR for dashboards, carts, checkout, account data, drafts, or any route whose output varies per visitor. Do not add ISR when `prerender = true` already makes it irrelevant.

## Verification
Name the route, current SvelteKit page option or adapter config, observed cache or ISR signal, and the exact file line to change.
