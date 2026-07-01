---
name: frontend-seo
description: A portable, framework-agnostic SEO system for any React or React Native-for-web frontend. Centralizes site metadata in one constants module, derives canonical URLs from a single base, builds per-route metadata (title, description, canonical, Open Graph, Twitter/X cards), generates...
risk: unknown
source: https://github.com/stareezy-1/frontend-architecture-skill/tree/main/skills/frontend-seo
source_repo: stareezy-1/frontend-architecture-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/stareezy-1/frontend-architecture-skill/blob/main/LICENSE
---

# Frontend SEO (portable, builder-based)
## When to Use

Use this skill when you need a portable, framework-agnostic SEO system for any React or React Native-for-web frontend. Centralizes site metadata in one constants module, derives canonical URLs from a single base, builds per-route metadata (title, description, canonical, Open Graph, Twitter/X cards), generates...


> Portable skill — readable by Claude Code, OpenCode, Codex, Cursor, Windsurf, and others.
> This skill describes an **SEO system** — a set of pure builder functions plus a thin
> framework adapter — not a component library or a visual style.
> It pairs with the **frontend-architecture** skill: the SEO system lives in a single
> service module (`services/seo/`) and is consumed through one barrel.

The goal: every route ships **correct, consistent, machine-readable metadata** without
anyone copy-pasting `<meta>` tags. Site identity lives in **one** constants module, URLs are
**always absolute and canonical**, and search engines get a **sitemap, robots rules, an RSS
feed, and typed JSON-LD** derived from the same content the app already renders.

---

## 0. The five core ideas

1. **One source of truth for identity.** Site URL, name, description, keywords, author, social handles, OG image, and verification tokens live in a single `constants/seo` module. Nothing about the site's identity is hardcoded anywhere else.
2. **URLs are always absolute and canonical.** A single `canonicalUrl(path)` function turns any path into an absolute, trailing-slash-normalized URL. Every sitemap entry, RSS link, OG URL, and JSON-LD `@id` flows through it.
3. **Builders are pure; the adapter is thin.** Metadata, sitemap, robots, RSS, and JSON-LD are produced by pure functions that take data and return plain objects. Only one small function touches the framework's metadata type. Pure functions are trivially unit-testable.
4. **Structured data is typed and reused.** JSON-LD objects share a `JsonLd` type and a small set of `schema.org` builders (`Person`, `WebSite`, `BlogPosting`, `CreativeWork`, `BreadcrumbList`, `FAQPage`). Entities cross-reference each other by stable `@id`.
5. **Discovery surfaces are generated from content.** `sitemap.xml`, `robots.txt`, and the RSS feed are built from the same content collections the app renders — never maintained by hand, never drifting.

Everything below is the mechanical application of these five ideas.

---

## 1. Directory layout

The SEO system is one service module plus its constants and types. It slots directly into the
`frontend-architecture` shape (`shared/` or `services/`).

```
src/
├── constants/
│   └── seo.ts                  ← SINGLE source of truth for site identity
├── types/
│   └── seo.ts                  ← SchemaType, RouteDescriptor, SitemapEntry,
│                                  RobotsConfig, RssItem, Redirect, JsonLd
├── services/seo/
│   ├── index.ts                ← barrel: canonicalUrl, buildMetadata,
│   │                              sitemapEntries, robots, rssItems,
│   │                              structuredData, redirects
│   └── structured-data.ts      ← per-type JSON-LD builders (Person, WebSite, …)
└── app/ (or routes/)           ← THIN adapter: route files call the builders
    ├── layout.tsx              ← global default metadata (from constants/seo)
    ├── sitemap.ts              ← mounts sitemapEntries()
    ├── robots.ts               ← mounts robots()
    └── feed.xml/route.ts       ← mounts rssItems()
```

Rule of thumb: **builders never import the framework** (except the one `buildMetadata` adapter);
**route files never build SEO data inline** — they call a builder and mount the result.

---

## 2. One source of truth for identity (`constants/seo`)

Everything about the site's identity is a named constant. No bare strings scattered across
route files, no second copy of the description, no hardcoded base URL.

```ts
// constants/seo.ts
export const SITE_URL = "https://example.com"; // no trailing slash
export const SITE_NAME = "Jane Doe";
export const SITE_HANDLE = "@janedoe";
export const SITE_LOCALE = "en_US";

export const SITE_TITLE_DEFAULT = "Jane Doe — Senior Engineer";
export const SITE_TITLE_TEMPLATE = "%s | Jane Doe"; // child pages fill %s

export const SITE_DESCRIPTION =
  "Senior engineer building cross-platform products with React and TypeScript.";

export const SITE_KEYWORDS = ["Jane Doe", "React", "TypeScript", "Engineer"];

export const AUTHOR_NAME = "Jane Doe";
export const AUTHOR_EMAIL = "jane@example.com";
export const AUTHOR_GITHUB = "https://github.com/janedoe";
export const AUTHOR_LINKEDIN = "https://www.linkedin.com/in/janedoe/";

export const OG_IMAGE_PATH = "/og-image.png"; // relative; canonicalized at use
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const GOOGLE_SITE_VERIFICATION = "your-search-console-token";
```

Why: changing the description or the OG image touches **one line**. Structured data, OG tags, and
Twitter cards all read the same values, so they can never disagree.

---

## 3. Typed data models (`types/seo`)

Minimal but typed. These are the contracts every builder honors.

```ts
// types/seo.ts
export type SchemaType =
  | "Person"
  | "WebSite"
  | "BlogPosting"
  | "CreativeWork"
  | "BreadcrumbList"
  | "FAQPage";

/** Describes a route for metadata generation. */
export interface RouteDescriptor {
  path: string; // e.g. "/blog/my-post"
  title: string;
  description: string;
  ogImage?: string; // falls back to OG_IMAGE_PATH
  indexable?: boolean; // whether it appears in the sitemap
}

export interface SitemapEntry {
  url: string; // absolute
  lastModified?: string;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
}

export interface RobotsConfig {
  rules: Array<{ userAgent: string; allow?: string[]; disallow?: string[] }>;
  sitemap: string; // absolute
}

export interface RssItem {
  title: string;
  link: string; // absolute
  description: string;
  pubDate: string; // ISO-8601
  guid: string;
}

export interface Redirect {
  source: string;
  destination: string;
  permanent: boolean; // 301 when true
}

/** A JSON-LD object: always a schema.org context + type, plus type-specific fields. */
export interface JsonLd {
  "@context": "https://schema.org";
  "@type": SchemaType;
  [key: string]: unknown;
}
```

Note the `I`-prefix convention from `frontend-architecture` applies to **stateful UI interfaces**;
these SEO data models are plain DTOs and follow the source project's existing convention
(here, unprefixed). Keep whichever convention the host project already uses — consistency wins.

---

## 4. Canonical URLs (the spine of the system)

One function, used everywhere. It guarantees absolute, normalized, double-slash-free URLs so
search engines never see two URLs for the same page.

```ts
// services/seo/index.ts
import { SITE_URL } from "@/constants/seo";

export function canonicalUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return SITE_URL; // root → base, no trailing slash
  const withoutTrailing = normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
  return `${SITE_URL}${withoutTrailing}`;
}
```

**Hard rules:**

- Never concatenate `SITE_URL + path` by hand — always `canonicalUrl(path)`.
- Pick one trailing-slash policy (this skill: **no trailing slash**) and apply it everywhere.
- Every OG `url`, sitemap `url`, RSS `link`, and JSON-LD `@id`/`url` goes through `canonicalUrl`.

---

## 5. Per-route metadata

### 5.1 The pure builder

`buildMetadata` is the **only** function allowed to know about the framework's metadata type.
Everything else is framework-free.

```ts
// services/seo/index.ts  (Next.js example — swap the return type for other frameworks)
import type { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/constants/seo";
import type { RouteDescriptor } from "@/types/seo";

export function buildMetadata(route: RouteDescriptor): Metadata {
  const canonical = canonicalUrl(route.path);
  const ogImageUrl = canonicalUrl(route.ogImage ?? OG_IMAGE_PATH);

  return {
    title: route.title,
    description: route.description,
    alternates: { canonical },
    openGraph: { images: [ogImageUrl] },
  };
}
```

### 5.2 Global defaults live in the root layout

Set the title template, default OG/Twitter cards, robots policy, icons, manifest, and
verification **once** at the root. Child routes only override what differs.

```tsx
// app/layout.tsx — global metadata, all values from constants/seo
import type { Metadata } from "next";
import {
  SITE_URL,
  SITE_NAME,
  SITE_HANDLE,
  SITE_LOCALE,
  SITE_TITLE_DEFAULT,
  SITE_TITLE_TEMPLATE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  AUTHOR_NAME,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  GOOGLE_SITE_VERIFICATION,
} from "@/constants/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE_DEFAULT, template: SITE_TITLE_TEMPLATE },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: AUTHOR_NAME, url: SITE_URL }],
  alternates: {
    canonical: SITE_URL,
    types: { "application/rss+xml": `${SITE_URL}/feed.xml` },
  },
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [
      { url: OG_IMAGE_PATH, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE_HANDLE,
    creator: SITE_HANDLE,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: { google: GOOGLE_SITE_VERIFICATION },
  manifest: "/manifest.webmanifest",
};
```

### 5.3 Per-route override (dynamic pages)

A dynamic route reads its entity and returns route-specific metadata. The title template fills
`%s` automatically, so just pass the page title.

```tsx
// app/blog/[slug]/page.tsx
import { buildMetadata } from "@/services/seo";

export async function generateMetadata({ params }) {
  const post = await loadPost(params.slug);
  return buildMetadata({
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.description,
    ogImage: post.heroImage,
  });
}
```

**Hard rules:**

- Set defaults once in the layout; override per route only where it differs.
- Use a title **template** so child pages don't repeat the site name.
- Every page resolves a single `canonical` — never emit duplicate or relative canonicals.

---

## 6. Discovery surfaces (generated from content)

### 6.1 Sitemap

Build entries from the **same content collections** the app renders, deduped, all absolute.

```ts
// services/seo/index.ts
import { ROUTES } from "@/constants/routes";
import type { SitemapEntry } from "@/types/seo";

const PRIMARY_ROUTES: Array<{
  path: string;
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
}> = [
  { path: ROUTES.HOME, changeFrequency: "weekly", priority: 1.0 },
  { path: ROUTES.BLOG, changeFrequency: "daily", priority: 0.9 },
  // …other primary routes
];

export function sitemapEntries(options: {
  blogSlugs: string[];
  projectSlugs: string[];
}): SitemapEntry[] {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const add = (e: SitemapEntry) => {
    if (!seen.has(e.url)) {
      seen.add(e.url);
      entries.push(e);
    }
  };
  const today = new Date().toISOString().split("T")[0];

  for (const r of PRIMARY_ROUTES)
    add({
      url: canonicalUrl(r.path),
      lastModified: today,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    });
  for (const slug of options.blogSlugs)
    add({
      url: canonicalUrl(`/blog/${slug}`),
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  for (const slug of options.projectSlugs)
    add({
      url: canonicalUrl(`/projects/${slug}`),
      lastModified: today,
      changeFrequency: "monthly",
      priority: 0.8,
    });

  return entries;
}
```

```ts
// app/sitemap.ts — thin adapter
import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/services/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries = sitemapEntries({
    blogSlugs: loadPublishedBlogSlugs(),
    projectSlugs: loadProjectSlugs(),
  });
  return entries.map((e) => ({
    url: e.url,
    lastModified: e.lastModified ? new Date(e.lastModified) : new Date(),
    changeFrequency:
      e.changeFrequency as MetadataRoute.Sitemap[0]["changeFrequency"],
    priority: e.priority,
  }));
}
```

### 6.2 Robots

```ts
// app/robots.ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/_next/", "/admin/"] },
      { userAgent: "Googlebot", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
```

Always **disallow private surfaces** (`/api/`, `/admin/`, build internals) and **point at the sitemap**.

### 6.3 RSS feed

```ts
// services/seo/index.ts
import type { RssItem } from "@/types/seo";

export function rssItems(posts: BlogPost[]): RssItem[] {
  return posts.map((post) => {
    const link = canonicalUrl(`/blog/${post.slug}`);
    return {
      title: post.title,
      link,
      description: post.description,
      pubDate: post.publishDate,
      guid: link,
    };
  });
}
```

```ts
// app/feed.xml/route.ts — sort newest-first, CDATA-wrap free text
import { rssItems } from "@/services/seo";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/constants/seo";

export function GET(): Response {
  const items = rssItems(loadPublishedPostsNewestFirst());
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${SITE_NAME}</title><link>${SITE_URL}</link>
  <description>${SITE_DESCRIPTION}</description>
  ${items
    .map(
      (i) => `<item>
    <title><![CDATA[${i.title}]]></title><link>${i.link}</link>
    <description><![CDATA[${i.description}]]></description>
    <pubDate>${i.pubDate}</pubDate><guid>${i.guid}</guid>
  </item>`,
    )
    .join("")}
</channel></rss>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
```

CDATA-wrap titles/descriptions so apostrophes and markup never break the feed.

---

## 7. Structured data (typed JSON-LD)

### 7.1 The generic builder

```ts
// services/seo/index.ts
import type { JsonLd, SchemaType } from "@/types/seo";

export function structuredData(
  type: SchemaType,
  data: Record<string, unknown>,
): JsonLd {
  return { "@context": "https://schema.org", "@type": type, ...data };
}
```

### 7.2 Per-type builders, cross-referenced by stable `@id`

```ts
// services/seo/structured-data.ts
import { structuredData } from "./index";
import { SITE_URL, AUTHOR_NAME, SITE_DESCRIPTION } from "@/constants/seo";
import type { JsonLd } from "@/types/seo";

export function personJsonLd(): JsonLd {
  return structuredData("Person", {
    "@id": `${SITE_URL}/#person`, // stable identity others reference
    name: AUTHOR_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    sameAs: [
      /* social profile URLs */
    ],
  });
}

export function websiteJsonLd(): JsonLd {
  return structuredData("WebSite", {
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: AUTHOR_NAME,
    author: { "@id": `${SITE_URL}/#person` }, // reference, not a copy
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

export function blogPostingJsonLd(post: BlogPost, url: string): JsonLd {
  return structuredData("BlogPosting", {
    "@id": url,
    headline: post.title,
    description: post.description,
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    author: {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: post.author,
    },
    publisher: {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: AUTHOR_NAME,
    },
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: {
      "@type": "ImageObject",
      url: post.heroImage,
      width: 1200,
      height: 630,
    },
    keywords: post.tags.join(", "),
  });
}

export function breadcrumbListJsonLd(
  items: Array<{ name: string; url: string }>,
): JsonLd {
  return structuredData("BreadcrumbList", {
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

export function faqPageJsonLd(
  faqs: Array<{ question: string; answer: string }>,
): JsonLd {
  return structuredData("FAQPage", {
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  });
}
```

`CreativeWork` follows the same shape for projects/portfolio items (name, description, author by
`@id`, `keywords`, optional `codeRepository`/`sameAs`/`image`).

### 7.3 Injecting JSON-LD into a page

Render a `<script type="application/ld+json">` with `JSON.stringify`. Match the breadcrumb trail
to the page's real position.

```tsx
// app/blog/[slug]/page.tsx
import { canonicalUrl } from "@/services/seo";
import {
  blogPostingJsonLd,
  breadcrumbListJsonLd,
} from "@/services/seo/structured-data";

export default async function Page({ params }) {
  const post = await loadPost(params.slug);
  const url = canonicalUrl(`/blog/${post.slug}`);
  const postLd = blogPostingJsonLd(post, url);
  const crumbLd = breadcrumbListJsonLd([
    { name: "Home", url: canonicalUrl("/") },
    { name: "Blog", url: canonicalUrl("/blog") },
    { name: post.title, url },
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postLd) }}
        suppressHydrationWarning
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbLd) }}
        suppressHydrationWarning
      />
      {/* …page content */}
    </>
  );
}
```

**Hard rules:**

- Give each entity a **stable `@id`** (e.g. `${SITE_URL}/#person`) and **reference** it elsewhere instead of duplicating fields.
- One `BlogPosting`/`CreativeWork` per detail page; a `BreadcrumbList` on every nested page.
- `Person` + `WebSite` belong on the home page; `FAQPage` only where real Q&A is shown.
- Validate output with Google's Rich Results Test / Schema Markup Validator before shipping.

---

## 8. Framework adapters

The builders are framework-free. Only the mounting layer changes.

| Framework              | Per-route metadata                                                                              | sitemap / robots / feed                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Next.js App Router** | `export const metadata` (static) or `generateMetadata` (dynamic) returning `buildMetadata(...)` | `app/sitemap.ts`, `app/robots.ts`, `app/feed.xml/route.ts`                                 |
| **Remix**              | `meta` export per route, mapping `buildMetadata`'s fields to `<meta>` descriptors               | resource routes (`routes/sitemap[.]xml.ts`, etc.) returning the builder output as XML/text |
| **Astro**              | `<head>` in a layout reading the same constants; per-page frontmatter overrides                 | `src/pages/sitemap.xml.ts`, `robots.txt.ts`, `rss.xml.ts` endpoints                        |
| **React + Vite (SPA)** | `react-helmet-async` (or a head manager) fed by `buildMetadata`'s plain object                  | build-time script that writes `sitemap.xml`/`robots.txt` from the same builders            |
| **Expo Router (web)**  | static head config / `expo-router` head; SEO matters only on the web target                     | a small web-only build step calling `sitemapEntries`/`rssItems`                            |

For a `buildMetadata` that must stay framework-neutral, return a plain shape
(`{ title, description, canonical, ogImage }`) and let each adapter translate it — keep the
Next.js `Metadata` return type only in a Next.js project.

---

## 9. Conventions checklist (enforce in review)

- [ ] All site identity (URL, name, description, keywords, author, handles, OG image, verification) lives in **one** `constants/seo` module — no duplicates, no hardcoded base URL.
- [ ] Every absolute URL is produced by `canonicalUrl()` — no manual `SITE_URL + path`.
- [ ] One trailing-slash policy, applied everywhere.
- [ ] Global metadata (title template, default OG/Twitter, robots, verification, manifest) is set **once** in the root layout.
- [ ] Dynamic routes override metadata via `buildMetadata` (or the framework adapter), passing only what differs.
- [ ] Every page resolves exactly one `canonical`; no relative or duplicate canonicals.
- [ ] `sitemap.xml`, `robots.txt`, and the RSS feed are **generated from content collections**, deduped, all absolute. Private routes are disallowed in robots.
- [ ] JSON-LD uses the shared `structuredData`/`JsonLd` builders; entities cross-reference by stable `@id`.
- [ ] Each detail page emits its primary schema (`BlogPosting`/`CreativeWork`) + a `BreadcrumbList`; home emits `Person` + `WebSite`.
- [ ] Builder functions are pure and unit-tested; framework code stays in the thin adapter (route files).
- [ ] OG image, locale, and Twitter handle are present and consistent across OG + Twitter cards.
- [ ] Structured data validated with Google's Rich Results Test before release.

---

## 10. How to apply this skill

**Adding SEO to a site:** create `constants/seo`, `types/seo`, and `services/seo/` (barrel +
`structured-data.ts`). Wire global metadata in the root layout, then add `sitemap`, `robots`, and
`feed.xml` adapters that mount the builders.

**Adding a new content type (e.g. case studies):** add its slugs to `sitemapEntries`, add a
JSON-LD builder if it needs its own schema, and give its detail page a `generateMetadata` + a
`BreadcrumbList`.

**Debugging duplicate-content / indexing issues:** check that every page goes through
`canonicalUrl`, that the trailing-slash policy is uniform, and that the sitemap contains only
indexable, absolute URLs. Confirm robots isn't blocking what should be indexed.

**Reviewing SEO coverage:** run the checklist in §9. The highest-value catches are hardcoded URLs
that bypass `canonicalUrl` (duplicate-content risk) and JSON-LD that duplicates entity fields
instead of referencing a stable `@id`.

---

## Publishing / installing this skill

This skill follows the Anthropic `SKILL.md` format and is portable across agents.

1. Keep it under `skills/frontend-seo/SKILL.md` in a public GitHub repo.
2. Keep the frontmatter `name` and high-signal `description` — discovery indexes match against it.
3. Install with: `npx skills add <org>/<repo> --skill "frontend-seo"`.
4. Non-`SKILL.md` agents can be pointed here from `AGENTS.md` / `CLAUDE.md`; Kiro can mirror it as a steering file.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
