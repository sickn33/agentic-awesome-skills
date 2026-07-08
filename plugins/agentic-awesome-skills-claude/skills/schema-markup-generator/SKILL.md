---
name: schema-markup-generator
description: "Generate and implement JSON-LD structured data for web apps, blogs, FAQs, and SaaS sites. Supports WebSite, SoftwareApplication, BlogPosting, FAQPage, HowTo, and more."
category: seo
risk: safe
source: self
source_type: self
date_added: "2026-05-31"
author: Whoisabhishekadhikari
tags: [seo, schema, json-ld, structured-data, rich-results, nextjs, technical-seo]
tools: [claude, cursor, gemini, claude-code]
version: 1.0.0
---

# Schema Markup Generator Skill

Add JSON-LD structured data to pages to unlock rich results, improve CTR, and signal context to Google and AI systems.

---

## When to Use

- Use when adding or auditing JSON-LD schema for websites, SaaS apps, tools, articles, FAQs, breadcrumbs, or organization pages.
- Use when schema must be implemented in Next.js App Router or validated against Google Rich Results and Schema.org tooling.
- Use when a page has strong content but lacks structured data for search engines and rich-result eligibility.

---

## How to Add Schema in Next.js App Router

The cleanest approach is a reusable `JsonLd` component:

```jsx
// components/JsonLd.jsx
export function JsonLd({ data }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
```

Use it in any page:
```jsx
import { JsonLd } from '@/components/JsonLd';

export default function MyPage() {
  return (
    <>
      <JsonLd data={mySchemaObject} />
      {/* rest of page */}
    </>
  );
}
```

---

## Schema Types by Page Type

### WebSite + Sitelinks Searchbox (homepage only)
```js
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "100 SEO Tools",
  "url": "https://www.100seotools.com",
  "description": "Free online SEO tools for keyword research, technical audits, and more.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.100seotools.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

---

### SoftwareApplication (tool / SaaS app pages)
```js
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Keyword Density Checker",
  "applicationCategory": "WebApplication",
  "operatingSystem": "Web",
  "url": "https://www.100seotools.com/tools/keyword-density-checker",
  "description": "Free keyword density checker tool. Analyze keyword frequency and optimize your content for SEO.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Analyze keyword frequency",
    "Detect over-optimization",
    "Export results as CSV"
  ],
  "provider": {
    "@type": "Organization",
    "name": "100 SEO Tools",
    "url": "https://www.100seotools.com"
  }
}
```

---

### Article / BlogPosting (blog posts)
```js
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "How to Improve Your Core Web Vitals in 2025",
  "description": "A practical guide to improving LCP, FID, and CLS scores for better rankings.",
  "url": "https://www.100seotools.com/blog/improve-core-web-vitals",
  "datePublished": "2025-01-15",
  "dateModified": "2025-03-20",
  "author": {
    "@type": "Person",
    "name": "Jane Smith",
    "url": "https://www.100seotools.com/author/jane-smith"
  },
  "publisher": {
    "@type": "Organization",
    "name": "100 SEO Tools",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.100seotools.com/logo.png"
    }
  },
  "image": {
    "@type": "ImageObject",
    "url": "https://www.100seotools.com/images/blog/core-web-vitals.jpg",
    "width": 1200,
    "height": 630
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.100seotools.com/blog/improve-core-web-vitals"
  }
}
```

---

### FAQPage (FAQ sections, tool help pages)
```js
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is keyword density?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Keyword density is the percentage of times a keyword appears in a piece of content relative to the total word count. A healthy keyword density is typically 1-3%."
      }
    },
    {
      "@type": "Question",
      "name": "Is this tool free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, our keyword density checker is completely free with no registration required."
      }
    }
  ]
}
```

---

### HowTo (step-by-step tool guides)
```js
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Check Keyword Density",
  "description": "Step-by-step guide to analyzing keyword density using our free tool.",
  "totalTime": "PT2M",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Paste your content",
      "text": "Copy your article or webpage content and paste it into the text area.",
      "image": "https://www.100seotools.com/images/how-to/step1.jpg"
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Enter your target keyword",
      "text": "Type the keyword you want to analyze in the keyword field."
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Click Analyze",
      "text": "Press the Analyze button to get your keyword density report instantly."
    }
  ]
}
```

---

### BreadcrumbList (all non-homepage pages)
```js
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://www.100seotools.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "SEO Tools",
      "item": "https://www.100seotools.com/tools"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Keyword Density Checker",
      "item": "https://www.100seotools.com/tools/keyword-density-checker"
    }
  ]
}
```

---

### Organization (about, contact pages)
```js
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "100 SEO Tools",
  "url": "https://www.100seotools.com",
  "logo": "https://www.100seotools.com/logo.png",
  "sameAs": [
    "https://twitter.com/100seotools",
    "https://www.linkedin.com/company/100seotools"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "hello@100seotools.com"
  }
}
```

---

## Combining Multiple Schemas on One Page

A tool page can have BreadcrumbList + SoftwareApplication + FAQPage:

```jsx
export default function ToolPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd data={faqSchema} />
      {/* page content */}
    </>
  );
}
```

Each schema lives in its own `<script>` tag — do NOT merge them into one object.

---

## Validation

Always validate schema before deploying:

1. **Google Rich Results Test** — https://search.google.com/test/rich-results
2. **Schema.org Validator** — https://validator.schema.org/
3. **Google Search Console** → Enhancements → check for warnings after deployment

```bash
# Quick check: schema appears in HTML
curl -s https://www.yourdomain.com/tools/keyword-density | grep -A 5 "application/ld+json"
```

---

## Schema Markup Checklist

- [ ] Homepage has `WebSite` schema
- [ ] Tool/app pages have `SoftwareApplication` schema
- [ ] Blog posts have `BlogPosting` / `Article` schema
- [ ] FAQ sections have `FAQPage` schema
- [ ] Step-by-step guides have `HowTo` schema
- [ ] All non-homepage pages have `BreadcrumbList`
- [ ] About/contact page has `Organization` schema
- [ ] All URLs in schema are absolute HTTPS
- [ ] Schema validated with Google Rich Results Test
- [ ] No schema errors in Google Search Console

## Limitations

- Does not guarantee rich-result eligibility or display; Google and other consumers decide whether to use valid schema.
- Generated examples must be adapted to the site's real content, legal entity details, ratings, pricing, and availability.
- Always validate deployed HTML, not only source code, because frameworks and rendering modes can change the final markup.
