---
name: seo-hreflang
description: >
  Hreflang and international SEO audit, validation, and generation. Detects
  common mistakes, validates language/region codes, and generates correct
  hreflang implementations. Use when user says "hreflang", "i18n SEO",
  "international SEO", "multi-language", "multi-region", or "language tags".
risk: unknown
source: "https://github.com/AgriciDaniel/claude-seo"
date_added: "2026-03-21"
user-invokable: true
argument-hint: "[url]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebFetch
---

# Hreflang & International SEO

## When to Use
- Use when validating or generating hreflang for multilingual or multiregional sites.
- Use when the user mentions international SEO, language tags, x-default, or hreflang issues.
- Use when auditing locale alternates across HTML, headers, or sitemap implementations.

Validate existing hreflang implementations or generate correct hreflang tags
for multi-language and multi-region sites. Supports HTML, HTTP header, and
XML sitemap implementations.

## Validation Checks

### 1. Self-Referencing Tags
- Every page must include an hreflang tag pointing to itself
- The self-referencing URL must exactly match the page's canonical URL
- Missing self-referencing tags cause Google to ignore the entire hreflang set

### 2. Return Tags
- If page A links to page B with hreflang, page B must link back to page A
- Every hreflang relationship must be bidirectional (A→B and B→A)
- Missing return tags invalidate the hreflang signal for both pages
- Check all language versions reference each other (full mesh)

### 3. x-default Tag
- Required: designates the fallback page for unmatched languages/regions
- Typically points to the language selector page or English version
- Only one x-default per set of alternates
- Must also have return tags from all other language versions

### 4. Language Code Validation
- Must use ISO 639-1 two-letter codes (e.g., `en`, `fr`, `de`, `ja`)
- Common errors:
  - `eng` instead of `en` (ISO 639-2, not valid for hreflang)
  - `jp` instead of `ja` (incorrect code for Japanese)
  - `zh` without region qualifier (ambiguous; use `zh-Hans` or `zh-Hant`)

### 5. Region Code Validation
- Optional region qualifier uses ISO 3166-1 Alpha-2 (e.g., `en-US`, `en-GB`, `pt-BR`)
- Format: `language-REGION` (lowercase language, uppercase region)
- Common errors:
  - `en-uk` instead of `en-GB` (UK is not a valid ISO 3166-1 code)
  - `es-LA` (Latin America is not a country; use specific countries)
  - Region without language prefix

### 6. Canonical URL Alignment
- Hreflang tags must only appear on canonical URLs
- If a page has `rel=canonical` pointing elsewhere, hreflang on that page is ignored
- The canonical URL and hreflang URL must match exactly (including trailing slashes)
- Non-canonical pages should not be in any hreflang set

### 7. Protocol Consistency
- All URLs in an hreflang set must use the same protocol (HTTPS or HTTP)
- Mixed HTTP/HTTPS in hreflang sets causes validation failures
- After HTTPS migration, update all hreflang tags to HTTPS

### 8. Cross-Domain Support
- Hreflang works across different domains (e.g., example.com and example.de)
- Cross-domain hreflang requires return tags on both domains
- Verify both domains are verified in Google Search Console
- Sitemap-based implementation recommended for cross-domain setups

## Common Mistakes

| Issue | Severity | Fix |
|-------|----------|-----|
| Missing self-referencing tag | Critical | Add hreflang pointing to same page URL |
| Missing return tags (A→B but no B→A) | Critical | Add matching return tags on all alternates |
| Missing x-default | High | Add x-default pointing to fallback/selector page |
| Invalid language code (e.g., `eng`) | High | Use ISO 639-1 two-letter codes |
| Invalid region code (e.g., `en-uk`) | High | Use ISO 3166-1 Alpha-2 codes |
| Hreflang on non-canonical URL | High | Move hreflang to canonical URL only |
| HTTP/HTTPS mismatch in URLs | Medium | Standardize all URLs to HTTPS |
| Trailing slash inconsistency | Medium | Match canonical URL format exactly |
| Hreflang in both HTML and sitemap | Low | Choose one method (sitemap preferred for large sites) |
| Language without region when needed | Low | Add region qualifier for geo-targeted content |

## Implementation Methods

### Method 1: HTML Link Tags
Best for: Sites with <50 language/region variants per page.

```html
<link rel="alternate" hreflang="en-US" href="https://example.com/page" />
<link rel="alternate" hreflang="en-GB" href="https://example.co.uk/page" />
<link rel="alternate" hreflang="fr" href="https://example.com/fr/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page" />
```

Place in `<head>` section. Every page must include all alternates including itself.

### Method 2: HTTP Headers
Best for: Non-HTML files (PDFs, documents).

```
Link: <https://example.com/page>; rel="alternate"; hreflang="en-US",
      <https://example.com/fr/page>; rel="alternate"; hreflang="fr",
      <https://example.com/page>; rel="alternate"; hreflang="x-default"
```

Set via server configuration or CDN rules.

### Method 3: XML Sitemap (Recommended for large sites)
Best for: Sites with many language variants, cross-domain setups, or 50+ pages.

See Hreflang Sitemap Generation section below.

### Method Comparison
| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| HTML link tags | Small sites (<50 variants) | Easy to implement, visible in source | Bloats `<head>`, hard to maintain at scale |
| HTTP headers | Non-HTML files | Works for PDFs, images | Complex server config, not visible in HTML |
| XML sitemap | Large sites, cross-domain | Scalable, centralized management | Not visible on page, requires sitemap maintenance |

## Hreflang Generation

### Process
1. **Detect languages**: Scan site for language indicators (URL path, subdomain, TLD, HTML lang attribute)
2. **Map page equivalents**: Match corresponding pages across languages/regions
3. **Validate language codes**: Verify all codes against ISO 639-1 and ISO 3166-1
4. **Generate tags**: Create hreflang tags for each page including self-referencing
5. **Verify return tags**: Confirm all relationships are bidirectional
6. **Add x-default**: Set fallback for each page set
7. **Output**: Generate implementation code (HTML, HTTP headers, or sitemap XML)

## Hreflang Sitemap Generation

### Sitemap with Hreflang
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://example.com/page</loc>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://example.com/page" />
    <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/page" />
    <xhtml:link rel="alternate" hreflang="de" href="https://example.de/page" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/page" />
  </url>
  <url>
    <loc>https://example.com/fr/page</loc>
    <xhtml:link rel="alternate" hreflang="en-US" href="https://example.com/page" />
    <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/page" />
    <xhtml:link rel="alternate" hreflang="de" href="https://example.de/page" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/page" />
  </url>
</urlset>
```

Key rules:
- Include the `xmlns:xhtml` namespace declaration
- Every `<url>` entry must include ALL language alternates (including itself)
- Each alternate must appear as a separate `<url>` entry with its own full set
- Split at 50,000 URLs per sitemap file

## Output

### Hreflang Validation Report

#### Summary
- Total pages scanned: XX
- Language variants detected: XX
- Issues found: XX (Critical: X, High: X, Medium: X, Low: X)

#### Validation Results
| Language | URL | Self-Ref | Return Tags | x-default | Status |
|----------|-----|----------|-------------|-----------|--------|
| en-US | https://... | ✅ | ✅ | ✅ | ✅ |
| fr | https://... | ❌ | ⚠️ | ✅ | ❌ |
| de | https://... | ✅ | ❌ | ✅ | ❌ |

### Generated Hreflang Tags
- HTML `<link>` tags (if HTML method chosen)
- HTTP header values (if header method chosen)
- `hreflang-sitemap.xml` (if sitemap method chosen)

### Recommendations
- Missing implementations to add
- Incorrect codes to fix
- Method migration suggestions (e.g., HTML to sitemap for scale)

## Error Handling

| Scenario | Action |
|----------|--------|
| URL unreachable (DNS failure, connection refused) | Report the error clearly. Do not guess site structure. Suggest the user verify the URL and try again. |
| No hreflang tags found | Report the absence. Check for other internationalization signals (subdirectories, subdomains, ccTLDs) and recommend the appropriate hreflang implementation method. |
| Invalid language/region codes detected | List each invalid code with the correct replacement. Provide a corrected hreflang tag set ready to implement. |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
