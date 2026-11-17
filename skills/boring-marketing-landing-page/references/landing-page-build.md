# BUILD: Landing Page

**Load this when** the Architecture phase is done and the page is ready to build. The approved copy plus `architecture.md` are the spec; this file is the build standard. Don't redesign the message during the build: if a section reads weak while building, send it back through /boring-marketing-direct-response-copy's gate.

## 1. Pick the target

- **Default: single-file HTML.** One `index.html`, inline CSS, no framework, no build step. It's fast, deployable anywhere (Vercel, Netlify, an S3 bucket, a `python -m http.server` preview), and trivially editable by the user later. Choose this unless the project says otherwise.
- **Next.js page component** if the working directory's `package.json` has a `next` dependency: a single `page.tsx` (App Router) or `pages/<slug>.tsx` (Pages Router: check which the project uses), styled the way the project already styles things (Tailwind if Tailwind is present, CSS modules if those are, etc.). Match the project; don't import a new styling system for one page.

Output location: `./campaigns/{name}/page/` for standalone HTML; the project's route directory for Next.js (confirm the route path with the user first).

## 2. Map copy → sections

Build exactly the sections `architecture.md` specifies, in its order, with the approved copy mapped 1:1 onto them. The canonical mapping:

| Copy section | Page section | Build notes |
|---|---|---|
| Headline + subhead + primary CTA | `<header>` hero | H1 is the headline verbatim. One CTA button above the fold. No carousel, no video autoplay. |
| Problem / pain math | Problem block | The math stack renders as a short list or stacked lines, not a paragraph: the "= 22+ hours" line gets visual weight. |
| Mechanism / solution | Mechanism block | 2-4 short subsections or an icon-free 3-up grid. Resist feature-grid sprawl; the copy's So-What framing leads. |
| Founder story (if present) | Story block | Single column, narrower measure (~60ch), reads like a letter. Photo placeholder with a comment if no asset exists. |
| Proof / testimonials | Proof block | Each testimonial as a card: quote, name, role, outcome bolded. Aggregate stats get their own line with the source linked. |
| Offer / pricing | Offer block | Price, what's included, risk reversal. Second CTA here. |
| FAQ / disqualification | FAQ block | Native `<details>/<summary>`: no JS accordion. Include the AI-reader objections (refunds, who it's not for, comparison). |
| Final CTA + friction reducers | Closing CTA | CTA button + the one-line reducer stack beneath it. |

Also emit: `<title>` and meta description from the headline/subhead, OG tags (title, description, og:image placeholder path), and **FAQ JSON-LD** built from the FAQ copy. Its value today is LLM parseability, which serves the AI-reader layer directly.

## 3. Design tokens

If `./brand/creative-kit.md` exists, pull: primary/accent/background colors, font families (link Google Fonts only if the kit names them), border radius, and logo path. Map them to CSS custom properties so the user can retheme in one place.

If no kit: tasteful neutral defaults; system font stack, near-black text on off-white (`#1a1a1a` on `#fafaf8`), one accent color for CTAs only, generous whitespace. Never ship the purple-gradient-glassmorphism default; a copy-led page should look like a well-set document with one obvious button.

```css
:root {
  --bg: #fafaf8; --text: #1a1a1a; --muted: #555;
  --accent: #0d6e5f;          /* from creative-kit if present */
  --radius: 8px; --measure: 64ch;
  --font: system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

## 4. Single-file HTML standard

- Mobile-first: write base styles for small screens, one `@media (min-width: 720px)` pass for desktop. Test the hero at 375px width mentally: headline wraps, CTA full-width.
- Semantic skeleton: `header` → `main` with one `section` per copy block (`id`s: `problem`, `mechanism`, `proof`, `offer`, `faq`, `cta`) → `footer` with the minimum legal/contact links.
- Body text at 17-18px, line-height ~1.6, max measure ~64ch. Section rhythm via consistent vertical padding, not decorative dividers.
- No external JS libraries. The only scripts allowed: the variant split (below) and the analytics stub.
- Every image is a commented placeholder with intended content described, unless real assets exist: `<!-- IMAGE: founder at desk, ~800x600, from /boring-marketing-creative -->`.
- It must open correctly from `file://`: no absolute paths, no server-side anything.

**Skeleton** (fill every slot from the approved copy file, verbatim, not re-drafted):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{headline, trimmed to ~60 chars}</title>
  <meta name="description" content="{subhead, ~155 chars}">
  <meta property="og:title" content="{headline}">
  <meta property="og:description" content="{subhead}">
  <meta property="og:image" content="/og.png"><!-- IMAGE: og card, 1200x630 -->
  <style>
    :root { /* tokens from §3 */ }
    /* base (mobile) styles, then one @media (min-width: 720px) pass */
    html[data-variant="a"] .v-b, html[data-variant="b"] .v-a { display: none; }
  </style>
  <script type="application/ld+json">{ "@type": "FAQPage", ... }</script>
</head>
<body>
  <header class="hero">
    <h1><span class="v-a">{headline A}</span><span class="v-b">{headline B}</span></h1>
    <p>{subhead}</p>
    <a href="{cta-url}" data-cta="hero">{CTA verbatim}</a>
  </header>
  <main>
    <section id="problem">…</section>
    <section id="mechanism">…</section>
    <section id="proof">…</section>
    <section id="offer">…<a href="{cta-url}" data-cta="offer">{CTA}</a></section>
    <section id="faq"><details><summary>{q}</summary><p>{a}</p></details>…</section>
    <section id="cta">
      <a href="{cta-url}" data-cta="closing">{CTA}</a>
      <p class="reducers">{risk reversal} · {social proof} · {speed/ease}</p>
    </section>
  </main>
  <footer>…</footer>
  <script>/* variant split + analytics stubs, §6 */</script>
</body>
</html>
```

## 5. Next.js component standard

Same sections, same tokens. Specifics:

- Server component by default; the variant/analytics logic is the only client island (`"use client"` on a small `VariantGate` wrapper or inline `<Script>`), so the page stays static.
- Metadata via the `metadata` export (App Router) including OG fields; FAQ JSON-LD via a `<script type="application/ld+json">` rendered from a typed object.
- Variants as routes: `app/{slug}/a/page.tsx` and `b/page.tsx` thin wrappers around a shared `LandingPage({ variant })` component, with `app/{slug}/page.tsx` doing the sticky assignment + redirect. This beats query params in Next.js: each variant is statically rendered and shareable.

```tsx
// app/{slug}/a/page.tsx  (b/page.tsx is identical with variant="b")
import { LandingPage } from "../landing-page";
export const metadata = { title: "{headline A}", description: "{subhead}" };
export default function Page() { return <LandingPage variant="a" />; }

// app/{slug}/page.tsx: sticky assignment, client-side
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Assign() {
  const router = useRouter();
  useEffect(() => {
    const v = localStorage.getItem("lp_variant")
           ?? (Math.random() < 0.5 ? "a" : "b");
    localStorage.setItem("lp_variant", v);
    // ANALYTICS: capture lp_view here with { variant: v }
    router.replace(`/{slug}/${v}`);
  }, [router]);
  return null;
}
```

The shared `LandingPage` component takes the same section structure as the HTML skeleton in §4; CTA elements carry `data-cta` attributes and a click handler stub marked `// ANALYTICS:` exactly as in §6.

## 6. A/B variant split (HTML version)

Two approved copy variants → one page, query-param split, localStorage-sticky so a visitor never flips between variants. Ship this exact pattern:

```html
<script>
  // Variant assignment: ?v=a|b wins (for forced QA), else sticky random.
  (function () {
    var KEY = "lp_variant";
    var forced = new URLSearchParams(location.search).get("v");
    var v = (forced === "a" || forced === "b") ? forced
          : localStorage.getItem(KEY) || (Math.random() < 0.5 ? "a" : "b");
    localStorage.setItem(KEY, v);
    document.documentElement.dataset.variant = v;

    // ANALYTICS: wire your pageview event here, tagging the variant.
    // e.g. posthog.capture("lp_view", { variant: v })
    //      or gtag("event", "lp_view", { variant: v });

    document.querySelectorAll("[data-cta]").forEach(function (el) {
      el.addEventListener("click", function () {
        // ANALYTICS: conversion event, same variant tag, e.g.
        // posthog.capture("lp_cta_click", { variant: v, cta: el.dataset.cta });
      });
    });
  })();
</script>
```

Variant content swaps via CSS: both variants' headline/hook markup in the document, `html[data-variant="a"] .v-b { display:none }` and vice versa. Keep the split to the sections that actually differ between approved variants (usually hero + opening). Don't duplicate the whole page. Tag every CTA `data-cta="hero|offer|closing"` so click events identify placement.

Tell the user explicitly: the page emits NO tracking until they wire the two marked stubs, and point them at the A/B sample-honesty rule (under ~1,000 visitors/week, run the big-swing variants only).

## 7. Done means

Before presenting: one render check only, run silently (the client sees the finished page, not the check log). Parse the file (or load the `next dev` route once) and confirm it renders; no screenshot loops, no visual-QA passes, no other plugins. The one exception is a local page, which gets a single phone-width screenshot for the first-screen checklist (see SKILL.md, SHIP). Then verify every copy section made it in verbatim (builds drift: diff headline, price, and friction reducers against the approved copy file); confirm both variants render via `?v=a` / `?v=b`. Then hand off with: file paths, the one-line retheme instruction (`:root` tokens), where the two analytics stubs are, and the suggestion to run `/boring-marketing-creative` for the image placeholders.
