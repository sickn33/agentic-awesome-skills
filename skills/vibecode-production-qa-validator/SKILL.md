---
name: vibecode-production-qa-validator
description: "End-to-end production QA, build verification, and launch-readiness checklist for fullstack Next.js apps before going live or shipping a major update. Covers TypeScript, linting, tests, build, SEO tags, route regression, and sitemap validation."
category: devops
risk: safe
source: self
source_type: self
date_added: "2026-05-31"
author: Whoisabhishekadhikari
tags: [qa, testing, nextjs, production, build-validation, deployment, seo]
tools: [claude, cursor, gemini, claude-code]
version: 1.0.0
---

# Production QA Validator Skill

The end-to-end launch checklist for fullstack Next.js apps. Run this before every production deployment or after any major change.

---

## When to Use

- Use before deploying a vibe-coded or fast-built app to production.
- Use when validating build output, SEO tags, sitemap routes, API routes, git diff cleanliness, and post-deploy smoke checks.
- Use when you need a concrete definition of done for release readiness across code, runtime behavior, and public URLs.

---

## The Full Validation Command Sequence

Run in order — stop and fix on any failure before continuing:

```bash
# 1. TypeScript — catches type errors and broken imports
npx tsc --noEmit

# 2. Custom validation scripts (if present)
npm run validate 2>/dev/null || echo "No validate script"

# 3. Canonical/SEO linting (if present)
npm run lint:canon 2>/dev/null || echo "No canon lint"
npm run lint:anchors 2>/dev/null || echo "No anchor lint"  
npm run lint:links 2>/dev/null || echo "No link lint"

# 4. ESLint
npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0

# 5. Tests
npm test -- --runInBand --passWithNoTests

# 6. Production build — the final arbiter
npm run build
```

All 6 must pass before committing.

---

## Reading the Build Output

```bash
npm run build 2>&1 | tee build.log

# Check for errors
grep -i "error\|failed\|cannot" build.log | grep -v "no errors"

# Check static page count
grep "Static pages\|○\|●" build.log | tail -5
```

### Route symbols explained

| Symbol | Meaning | Expected? |
|--------|---------|-----------|
| `○` | Static (rendered at build time) | ✓ Good for most pages |
| `●` | SSG (generated from `generateStaticParams`) | ✓ Good for dynamic pages |
| `λ` | Serverless (dynamic, rendered on request) | ✓ APIs and truly dynamic pages only |
| `⊕` | Partial prerender | ✓ Fine |

If an important SEO page shows `λ` and should be static, add `generateStaticParams` or use `export const dynamic = 'force-static'`.

---

## SEO Tags in Raw HTML Verification

Crawlers don't run JavaScript. Metadata must be in the raw HTML response.

```bash
# Check a page's metadata
curl -s https://www.yourdomain.com/blog/my-post | grep -i \
  "og:title\|og:description\|og:image\|twitter:card\|canonical\|description"

# Expected output should include all of these:
# <meta property="og:title" content="..." />
# <meta property="og:description" content="..." />
# <meta property="og:image" content="https://..." />
# <meta name="twitter:card" content="summary_large_image" />
# <link rel="canonical" href="https://..." />
# <meta name="description" content="..." />
```

If tags are missing from raw HTML: they're added by client-side JavaScript. Fix: move to `export const metadata` or `generateMetadata`.

---

## Route Regression Testing

After any major change, verify all critical route types still return 200:

```bash
BASE="https://www.yourdomain.com"

# Core pages
for path in "/" "/about" "/contact" "/privacy" "/terms" "/faq"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "$STATUS $BASE$path"
done

# Sitemaps
for path in "/sitemap.xml" "/robots.txt"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "$STATUS $BASE$path"
done

# Sample dynamic routes (test a few real slugs)
for path in "/tools/keyword-density-checker" "/blog/my-post-slug"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "$STATUS $BASE$path"
done
```

All should return `200`. Investigate anything returning `404`, `500`, or `301`/`302` when a direct URL was expected.

---

## Sitemap Validation

```bash
# Fetch and validate sitemap XML
curl -s https://www.yourdomain.com/sitemap.xml | python3 -c "
import sys, xml.etree.ElementTree as ET
try:
    ET.parse(sys.stdin)
    print('✓ Valid XML')
except Exception as e:
    print(f'✗ Invalid XML: {e}')
"

# Count URLs in sitemap
curl -s https://www.yourdomain.com/sitemap.xml | grep -c "<loc>"
```

---

## API Route Testing

```bash
# Test API endpoints return expected content-type and status
for path in "/api/health" "/api/tools"; do
  RESULT=$(curl -s -o /dev/null -w "%{http_code} %{content_type}" "$BASE$path")
  echo "$RESULT $path"
done
```

---

## Pre-Commit Git Checklist

Before committing:

```bash
# Review what's changed
git diff --stat HEAD

# Ensure no secrets or local-only files
git diff HEAD | grep -i "password\|secret\|api_key\|localhost:3000" | grep "^+"

# Confirm no build artifacts are staged
git status | grep -E "\.next|node_modules"
```

Good commit message format:
```text
type(scope): brief description

fix(seo): add canonical tags to all blog pages
feat(tools): add keyword density checker page
refactor(metadata): consolidate OG/Twitter tags into shared helper
chore(cleanup): remove unused utils/oldHelper.js
```

---

## Post-Deployment Smoke Test

Run 5–10 minutes after deployment:

```bash
PROD="https://www.yourdomain.com"

# Homepage loads
curl -sI "$PROD" | grep -i "http\|status"

# Key page loads
curl -sI "$PROD/tools/keyword-density-checker" | grep "200\|301\|404"

# No JS errors (requires manual browser check)
# Open browser → Console → look for red errors

# OG image loads
curl -sI "$PROD/images/og/home.jpg" | grep -i "200\|content-type"
```

---

## Definition of Done

A change is **production-ready** only when ALL of the following are true:

- [ ] `npx tsc --noEmit` passes
- [ ] `npm run validate` passes (or no script)
- [ ] `npm run lint:canon` passes (or no script)
- [ ] `npx eslint .` passes with 0 warnings
- [ ] `npm test` passes or no tests exist
- [ ] `npm run build` completes successfully
- [ ] Important pages show `○` or `●` in build output (not `λ`)
- [ ] SEO tags visible in `curl` output for key pages
- [ ] All sitemap routes return valid XML
- [ ] No new 404s on previously working routes
- [ ] No secrets in git diff
- [ ] Commit message is scoped and descriptive
- [ ] Social preview platforms show correct card after cache refresh

## Limitations

- Passing this checklist reduces release risk but does not prove the absence of production bugs.
- Some checks depend on project-specific scripts, deployment topology, and external services that may not exist in every app.
- Manual exploratory testing is still required for critical user journeys, payments, auth, and data mutation flows.
