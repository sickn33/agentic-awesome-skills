---
name: vibe-code-cleanup
description: "Safe production cleanup and hardening for vibe-coded fullstack apps (Next.js, React, Node.js, etc.). Removes dead imports, unused files, broken references, and standardizes helpers without breaking routes or APIs."
category: fullstack
risk: safe
source: self
source_type: self
date_added: "2026-05-31"
author: Whoisabhishekadhikari
tags: [cleanup, refactor, nextjs, production, vibe-code, fullstack, nodejs]
tools: [claude, cursor, gemini, claude-code]
version: 1.0.0
---

# Vibe-Code Cleanup — Production Refactor Skill

A safe, incremental cleanup workflow for AI-generated / vibe-coded fullstack apps.
The goal is to make the codebase production-ready **without** breaking anything that already works.

## When to Use

- Use when a rapidly built app works but has broken imports, duplicated logic, dead code, unclear environment variables, or fragile release hygiene.
- Use before launch or handoff to convert exploratory code into a maintainable production baseline.
- Use when cleanup must preserve existing behavior and avoid broad rewrites of routes, APIs, auth, data models, or integrations.

## Core Philosophy

> **Surgery, not demolition.** Remove only what is provably dead. Preserve everything else.

Never:
- Rewrite working systems for cosmetic reasons
- Rename routes, slugs, or API endpoints that may be indexed or cached
- Change tool inputs/outputs, API contracts, DB schema, or auth flow
- Delete files you haven't verified are unused
- Make broad sweeping changes in a single commit

Always:
- Make small, targeted, reversible changes
- Validate after every meaningful batch of changes
- Prefer shared helpers over copy-pasted blocks
- Keep backward compatibility

---

## Step 1 — Reconnaissance (read before touching)

Before changing anything, map the codebase:

```bash
# List all pages/routes
find . -path "*/app/**/page.{js,jsx,ts,tsx}" | sort
find . -path "*/pages/**/*.{js,jsx,ts,tsx}" | grep -v "_" | sort

# Find broken imports (TS projects)
npx tsc --noEmit 2>&1 | head -80

# Find unused exports (optional, for larger projects)
npx ts-prune 2>/dev/null | head -40

# Check for console.log / debug leftovers
grep -r "console\.log\|debugger\|TODO\|FIXME\|HACK" --include="*.{js,ts,jsx,tsx}" -l
```

Document what you find. Do NOT change yet.

---

## Step 2 — Fix Broken Imports First

Broken imports cause build failures and should be fixed before anything else.

```bash
# TypeScript: list all errors
npx tsc --noEmit 2>&1

# Common patterns to fix:
# - Missing file (file was deleted or renamed)
# - Wrong relative path (../lib vs ../../lib)
# - Named export that doesn't exist
```

**Fix rule:** Fix the import reference. Do NOT delete the referenced file unless you've confirmed it's unused everywhere.

---

## Step 3 — Identify Dead Code (verify before removing)

A file/export is safe to remove **only if**:
1. No other file imports it (grep-confirmed)
2. It's not referenced in config, sitemap, or route manifest
3. It's not a public-facing URL (page.js, route.js)

```bash
# Check if a file is imported anywhere
grep -r "from.*my-file\|require.*my-file" --include="*.{js,ts,jsx,tsx}" .

# Check if a component is used anywhere  
grep -r "MyComponent" --include="*.{js,ts,jsx,tsx}" .
```

---

## Step 4 — Consolidate Repeated Logic into Helpers

Look for repeated patterns (metadata blocks, API fetch wrappers, error handlers) that appear in 3+ places.

**Good consolidation targets:**
- Page-level SEO metadata (Open Graph, Twitter cards, canonical)
- Fetch wrappers with error handling
- Repeated utility functions (slugify, formatDate, truncate)

**Bad consolidation targets (leave alone):**
- One-off business logic
- Route handlers with different contracts
- Anything touching DB schema or auth

**Pattern for shared metadata helper (Next.js):**
```js
// lib/socialMetadata.js
export function buildPageMetadata({ title, description, path, image }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';
  const imageUrl = image?.startsWith('http') ? image : `${baseUrl}${image}`;
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}${path}`,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${baseUrl}${path}`,
    },
  };
}
```

---

## Step 5 — Environment Variable Audit

```bash
# List all env vars used in code
grep -r "process\.env\." --include="*.{js,ts,jsx,tsx}" . | grep -oP 'process\.env\.\w+' | sort -u

# Compare against .env.example or .env.local
cat .env.example 2>/dev/null || cat .env.local 2>/dev/null
```

Flag any env vars used in code but missing from `.env.example`. Never add secrets to version control.

---

## Step 6 — Validate After Every Batch

Run this after every meaningful batch of cleanup changes:

```bash
# TypeScript check
npx tsc --noEmit

# Lint
npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0

# Build (catches runtime issues TypeScript misses)
npm run build

# Tests (if present)
npm test -- --runInBand --passWithNoTests
```

If build or typecheck breaks → **revert the last batch** before continuing.

---

## Step 7 — Commit Strategy

Each commit should be a single logical unit:

```
fix: remove broken import in app/blog/page.js
refactor: consolidate social metadata into lib/socialMetadata.js  
chore: remove verified-unused utils/oldHelper.js
fix: standardize env var references to NEXT_PUBLIC_BASE_URL
```

Never bundle UI changes + logic changes + file deletions in one commit. Smaller commits = easier rollback.

---

## What NOT to Clean Up

Treat these as off-limits unless there's a verified bug:

| Area | Why |
|------|-----|
| Route slugs / page paths | May be indexed by Google |
| API route contracts | Callers depend on exact shape |
| DB schema / Prisma models | Migration required |
| Auth flow logic | Security-sensitive |
| Third-party integration configs | Keys/webhooks are environment-specific |
| Working tool pages | User-facing functionality |

---

## Cleanup Checklist

- [ ] TypeScript errors fixed
- [ ] No broken imports
- [ ] Dead code removed (grep-verified)
- [ ] Shared helpers created for repeated patterns (3+ uses)
- [ ] No hardcoded secrets or local-only URLs
- [ ] All env vars documented in `.env.example`
- [ ] Build passes
- [ ] Tests pass (or no tests exist)
- [ ] Lint passes
- [ ] Each commit is scoped and explainable

## Limitations

- Does not infer product intent from code alone; confirm behavior before deleting routes, components, API contracts, or data models.
- Cleanup should be applied in small reviewed batches because broad refactors can hide regressions.
- Avoid changing auth, billing, persistence, or third-party integration behavior without explicit requirements and tests.
