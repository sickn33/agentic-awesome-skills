---
name: social-metadata-hardening
description: "Fix social sharing previews so URLs render as rich cards on Facebook, LinkedIn, X/Twitter, WhatsApp, Telegram, and more. Covers OG tags, Twitter cards, absolute image URLs, and debugging."
category: seo
risk: safe
source: self
source_type: self
date_added: "2026-05-31"
author: Whoisabhishekadhikari
tags: [seo, open-graph, twitter-card, social-sharing, og-image, nextjs, metadata]
tools: [claude, cursor, gemini, claude-code]
version: 1.0.0
---

# Social Metadata Hardening Skill

Fix social sharing so every important URL unfurls as a rich card across all platforms.

---

## When to Use

- Use when shared links show missing, stale, cropped, or incorrect previews on social and chat platforms.
- Use when auditing Open Graph, Twitter/X card, image URL, alt text, or `metadataBase` coverage in a web app.
- Use before launch when every public page needs predictable rich previews across LinkedIn, X, Facebook, WhatsApp, Slack, Discord, and Telegram.

---

## Why Previews Break

| Problem | Root Cause |
|---------|-----------|
| No preview at all | Missing og:title, og:description, or og:image |
| Broken image | Relative URL (must be absolute) |
| Wrong image size | Image not 1200×630px (OG standard) |
| Plain text card | Twitter card type missing or set to `summary` |
| Stale preview | Platform caching old metadata |
| Metadata missing on crawl | Tags added by client-side JS (crawlers don't run JS) |

---

## The Gold Standard Metadata Block

Every shareable page needs ALL of these in static HTML:

```js
// Next.js App Router — lib/socialMetadata.js
export function buildSocialMetadata({
  title,
  description,
  path,          // '/blog/my-post'
  image,         // '/images/og/my-post.jpg' or full URL
  imageAlt,
  imageWidth = 1200,
  imageHeight = 630,
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.yourdomain.com';
  
  // Always produce an absolute URL
  const imageUrl = image?.startsWith('http') ? image : `${baseUrl}${image}`;
  const pageUrl  = `${baseUrl}${path}`;
  
  // Detect MIME type from extension
  const ext = imageUrl.split('.').pop().toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const imageType = mimeMap[ext] || 'image/jpeg';

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',  // use 'article' for blog posts
      images: [{
        url: imageUrl,
        secureUrl: imageUrl,   // explicit HTTPS version
        width: imageWidth,
        height: imageHeight,
        alt: imageAlt || title,
        type: imageType,
      }],
    },
    twitter: {
      card: 'summary_large_image',  // NOT 'summary' — that shows a tiny image
      title,
      description,
      images: [imageUrl],
    },
  };
}
```

---

## Applying the Helper

### Static page
```js
// app/about/page.js
import { buildSocialMetadata } from '@/lib/socialMetadata';

export const metadata = buildSocialMetadata({
  title: 'About Us | My Site',
  description: 'Learn about our team and mission.',
  path: '/about',
  image: '/images/og/about.jpg',
  imageAlt: 'The My Site team',
});
```

### Dynamic page (blog post, tool page)
```js
// app/blog/[slug]/page.js
import { buildSocialMetadata } from '@/lib/socialMetadata';

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  return buildSocialMetadata({
    title: `${post.title} | My Blog`,
    description: post.excerpt,
    path: `/blog/${params.slug}`,
    image: post.ogImage || '/images/og/default.jpg',
    imageAlt: post.title,
  });
}
```

### Homepage (app/layout.js or app/page.js)
```js
export const metadata = {
  metadataBase: new URL('https://www.yourdomain.com'), // REQUIRED for absolute URLs
  ...buildSocialMetadata({
    title: 'My Site — Tagline Here',
    description: 'Site-wide description.',
    path: '/',
    image: '/images/og/home.jpg',
  }),
};
```

> ⚠️ **Set `metadataBase` when using relative metadata URLs.** If your helper already outputs absolute canonical/OG URLs, previews can still work without it.

---

## OG Image Checklist

Good OG images:
- **1200 × 630px** (2:1 ratio — works on all platforms)
- **Under 8MB** (Facebook limit)
- Served over **HTTPS**
- File name has **no spaces** (use hyphens)
- Format: **JPEG or PNG** (WebP works on most but not all crawlers)
- **Accessible via GET** with no authentication

```bash
# Verify your OG image is reachable and correct size
curl -sI https://www.yourdomain.com/images/og/home.jpg | grep -i "content-type\|content-length\|status"
```

---

## Platform-Specific Notes

### Facebook / Meta
- Caches aggressively — use the [Sharing Debugger](https://developers.facebook.com/tools/debug/) to force recrawl
- Minimum image: 200×200px (but use 1200×630 for quality)
- Needs: `og:title`, `og:description`, `og:image`, `og:url`

### X / Twitter
- Use `twitter:card = summary_large_image` for full-width images
- `twitter:image` must be an absolute URL
- Use the [Card Validator](https://cards-dev.twitter.com/validator) to test

### LinkedIn
- Caches hard — use [Post Inspector](https://www.linkedin.com/post-inspector/) to refresh
- Respects `og:` tags; ignores `twitter:` tags
- Image must be ≥1.91:1 aspect ratio

### WhatsApp / Telegram
- Read OG tags on first share; cache can last hours
- Re-share after a few hours for the cache to clear naturally

### Slack / Discord
- Both use OG tags; both cache
- Discord also supports `og:type = article` for richer embeds

---

## Debugging Social Previews

### 1. Check raw HTML for tags
```bash
curl -s https://www.yourdomain.com/blog/my-post | grep -i "og:\|twitter:"
```
If tags don't appear → they're being added by JavaScript (not crawlable). Fix: move to `export const metadata` or `generateMetadata`.

### 2. Validate with platform tools

| Platform | Tool |
|----------|------|
| Facebook | https://developers.facebook.com/tools/debug/ |
| LinkedIn | https://www.linkedin.com/post-inspector/ |
| Twitter/X | https://cards-dev.twitter.com/validator |
| General | https://metatags.io |

### 3. Force cache refresh
After deploying fixes, paste the URL into each platform's debugger and click "Fetch new scrape information" (or equivalent).

---

## Social Metadata Checklist

- [ ] `metadataBase` set in root layout
- [ ] All shareable pages use shared `buildSocialMetadata` helper
- [ ] OG image URLs are absolute (start with `https://`)
- [ ] `secureUrl` set equal to `url` in OG image block
- [ ] Image is 1200×630px, under 8MB, HTTPS
- [ ] `twitter:card` is `summary_large_image` (not `summary`)
- [ ] Image alt text present
- [ ] Tags visible in raw HTML (not JavaScript-rendered)
- [ ] All platform debuggers show correct preview
- [ ] Cache refreshed on all platforms after deployment

## Limitations

- Cannot force immediate cache refresh on every social platform; some previews may remain stale after a correct fix.
- Requires publicly reachable deployed URLs for reliable validation with platform debuggers.
- Does not replace brand, accessibility, or legal review of image text, alt text, and preview copy.
