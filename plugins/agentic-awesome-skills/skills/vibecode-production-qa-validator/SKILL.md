---
name: vibecode-production-qa-validator
description: "13-phase production QA for fullstack Next.js apps: build verification, SEO tags, OG images, favicon, route regression, API auth, page speed, lazy load, vulnerability scan, UI/UX cards, error boundaries, database, secure rendering, and cleanup."
category: devops
risk: critical
source: self
source_type: self
date_added: "2026-05-31"
author: Whoisabhishekadhikari
tags: [qa, nextjs, production, deployment, seo, authentication, api, performance, favicon, cleanup, lighthouse, database, security, ui-ux]
tools: [claude, cursor, gemini, claude-code, opencode]
version: 2.0.0
---

# Production QA Validator

Use the applicable phases in order and record evidence for each as passed, failed, incomplete or not applicable with a reason. Missing tooling, no tests, failed network calls and unperformed manual checks are incomplete, never success. Confirm project scripts, versions, approved URLs/methods, request limits, credentials and mutation boundaries before running. Builds/tests/lint/plugins can execute project code, write caches or reach services; they are not inherently read-only. Do not install hooks or overwrite existing config without authorization.

## When to Use

- Use before shipping or promoting a fullstack Next.js app to production.
- Use after large UI, SEO, auth, API, database, or dependency changes need a concrete launch-readiness pass.
- Use when you need a compact command-driven checklist for build, route, metadata, performance, security, and cleanup checks.

```bash
export PROD_URL="https://yourdomain.com"
export QA_AUTH_HEADER=""       # optional: "Bearer eyJ..."
export PAGESPEED_API_KEY=""    # optional: for auto PageSpeed API
```

---

## Evidence and a Bounded Route Check

The former consolidated `qa:*` runner returned successful exit codes after warnings, hid tool/network failures and inferred security from grep matches. It has been removed; a checklist is not an implemented automated gate. Use the project's actual checks and parse structured outputs. Keep raw logs private and redact secrets rather than echoing matched credential lines.

```bash
# Bash, approved staging target only; expect the exact documented status.
qa_route() {
  local route="$1" expected="$2" code
  code=$(curl --silent --show-error --max-time 15 --connect-timeout 5 \
    --output /dev/null --write-out '%{http_code}' "$PROD_URL$route") || return 1
  printf '%s %s\n' "$code" "$route"
  [ "$code" = "$expected" ]
}
qa_route / 200
qa_route /api/protected 401  # choose401/403 from the actual contract
```

Do not follow redirects carrying credentials to other origins. A status check proves only that response, not content, authorization, availability, SEO or a complete workflow. Auth probes need real configured endpoints and correct methods; never call logout/login mutations indiscriminately in production. Validate object/tenant isolation with owned synthetic accounts and explicit negative cases.

---

### Phase 1: Code Integrity

- [ ] The project's pinned typecheck script
- [ ] The project's pinned lint script (flags differ by ESLint version)
- [ ] `npm test  # use the actual runner; zero discovered tests is incomplete`



---

### Phase 2: Build Verification

- [ ] `npm run build` succeeds
- [ ] Verify intended static/dynamic behavior; dynamic rendering is valid for many SEO pages
- [ ] Build log has no errors



| Symbol | Meaning |
|--------|---------|
| `○` | Static |
| `●` | SSG |
| `λ` | Dynamic/serverless |
| `⊕` | Partial prerender |

---

### Phase 3: API Session & Authentication

- [ ] Auth endpoints respond (login, session, logout)
- [ ] Protected routes return 401/403
- [ ] Session cookie: HttpOnly + Secure + SameSite
- [ ] Cookie not expired, Path/Domain correct
- [ ] No rate limiting bypass



---

### Phase 4: Route Regression

- [ ] Core pages, sitemap, robots.txt all 200
- [ ] URLs use kebab-case, no duplicate slugs
- [ ] robots.txt allows indexing
- [ ] Sitemap XML valid, all URLs resolve 200



---

### Phase 5: SEO — Tags, Images, Favicon, Slugs

- [ ] `<title>` 30–60 chars, unique per page
- [ ] `<meta name="description">` in raw HTML
- [ ] og:title matches `<title>`, og:url matches canonical
- [ ] og:image uses the target platform's supported dimensions/format, absolute URL, loads 200
- [ ] twitter:card = summary_large_image
- [ ] Canonical self-referencing, no duplicates
- [ ] `/favicon.ico` 200, apple-touch-icon present
- [ ] `hreflang` tags if multilingual
- [ ] JSON-LD structured data present
- [ ] Slugs are stable/readable and preserve existing redirects; no arbitrary stop-word ban



---

### Phase 6: API Route Behavior

- [ ] Correct status codes + Content-Type
- [ ] Errors return consistent JSON `{ error, message }`
- [ ] Response latency meets the measured route-specific SLO
- [ ] CORS headers correct (if cross-origin)



---

### Phase 7: Git Hygiene

- [ ] No secrets/credentials in diff
- [ ] No `.next`/`node_modules` staged
- [ ] Commit: `type(scope): message`



---

### Phase 8: Post-Deployment Smoke Test

- [ ] Homepage 200, key pages 200
- [ ] OG image loads 200
- [ ] No console errors (manual)
- [ ] Auth flow works (manual)



---

### Phase 9: Page Speed, Lazy Load & Bundles

- [ ] Lighthouse ≥ 90 (Perf, A11y, SEO)
- [ ] Record lab/field conditions; assess field LCP≤2.5s, INP≤200ms and CLS≤0.1 at the75th percentile
- [ ] Below-fold images may lazy-load; prioritize the LCP/above-fold image
- [ ] Dynamic imports for heavy components
- [ ] Largest JS chunk < 200KB gzipped
- [ ] `font-display: swap`, no FOIT
- [ ] Total page weight < 1MB



---

### Phase 10: Cleanup & Vulnerability Scan

- [ ] `npm prune`, `depcheck` — no unused deps
- [ ] No console.log/debugger in staged code
- [ ] `npm audit` — zero critical/high vulnerabilities
- [ ] No eval/new Function/document.write
- [ ] TODOs resolved



---

### Phase 11: UI/UX — Cards, Animation, Error Boundaries

- [ ] Cards: equal height grid, no overlap, text ellipsis, responsive (1→2→3 col)
- [ ] No horizontal scroll at any viewport (320–1440px)
- [ ] Images: consistent `aspect-ratio` + `object-fit: cover`
- [ ] Touch targets ≥ 44×44px
- [ ] Animations use `transform`+`opacity` only (not layout props)
- [ ] `prefers-reduced-motion` respected
- [ ] Error boundaries at root + route level (`app/error.tsx`, `app/global-error.tsx`)
- [ ] `app/not-found.tsx` and `app/loading.tsx` exist
- [ ] All client fetches show loading + error + empty states
- [ ] Buttons: hover, focus-visible, active, disabled, loading states
- [ ] Forms prevent repeat submissions and server writes enforce atomic idempotency where needed



---

### Phase 12: Database & Data Layer

- [ ] Connection pool configured (no starvation)
- [ ] Schema in sync with migrations
- [ ] Indexes and batching justified by actual query plans/workload; measure N+1
- [ ] No hardcoded DB credentials in source
- [ ] No raw SQL injection risk
- [ ] No sensitive data leaked in API responses
- [ ] Migrations are idempotent



---

### Phase 13: Secure Data Rendering

- [ ] No secrets/tokens in client source or localStorage
- [ ] Use framework escaping or context-appropriate sanitization for untrusted HTML; sanitization is not a universal safe sink
- [ ] API errors don't leak stack traces
- [ ] Enforce object/tenant authorization regardless of identifier format; UUIDs are not access control
- [ ] User emails masked in UI
- [ ] NEXT_PUBLIC_ vars contain no secrets



---

## Pre-Commit Hook

Use the project's existing hook manager and preserve installed hooks. Configure only after authorization; local hooks can be bypassed and do not replace CI.



---

## CI/CD (GitHub Actions)

Template only: select pinned compatible tools/actions, the actual test runner and explicit permissions. Do not enable production probes or pass secrets to untrusted PR code.

```yaml
name: QA
on: [push, pull_request]
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test # configure zero-test discovery to fail
      - run: npm run build
```

---

## Best Practices

| ✅ Do | ❌ Don't |
|-------|----------|
| Run full 13-phase flow before deploy | Skip typecheck or lint |
| Set `PROD_URL` in profile/.envrc | Hardcode URLs in scripts |
| OG images ≥ 1200×630 | Use small OG images |
| Animate with `transform`+`opacity` | Animate width/height/top |
| Show loading/error/empty states | Leave users on blank screens |
| `prefers-reduced-motion` for animations | Force motion on all users |
| HttpOnly + Secure cookies for tokens | localStorage for auth tokens |
| Error boundaries at all levels | White screen on crash |
| Database indexes + include/populate | N+1 queries in loops |
| `npm audit` before deploy | Deploy with known vulns |

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| OG tags missing in raw HTML | Use `export const metadata` in Next.js |
| `Disallow: /` in robots.txt | Blocks all crawlers — use specific paths |
| Cards different heights in grid | Use `display: grid` with equal-height rows, not flex |
| Text overflows card | Add `text-overflow: ellipsis` + `overflow: hidden` |
| Animation jank | Animate `transform` not `width`/`height` |
| Form submits twice | Disable button on first click |
| Console errors in prod | Add `no-console` ESLint rule |
| DB connection timeout | Add connection pooling (PgBouncer/Prisma Accelerate) |
| Sensitive data in API | Strip `passwordHash`/`secret` in response transformer |
| App crashes on error | Add `app/error.tsx` error boundary |
| Large JS bundles | Dynamic import heavy components, analyze with `next/bundle-analyzer` |
| Images load slowly | Measure the image; eagerly load/priority the LCP image, lazy-load appropriate below-fold assets |

---

## Security Notes

- Project commands can mutate state or execute arbitrary lifecycle/tool code; inspect them and use an isolated approved environment.
- `PROD_URL` and `QA_AUTH_HEADER` only for environments you own
- Use a reviewed secret scanner with redacted output; missing matches do not prove absence. Validate dependencies from structured audit results and propagate command failures.
- Auth tests with real credentials against prod is destructive — use staging

---

## Limitations

- Passing all phases reduces risk but doesn't eliminate production bugs
- Some checks depend on project-specific tooling (Prisma, NextAuth, etc.)
- Manual UX testing still required for critical user journeys
- SEO checks verify raw HTML only — not social preview rendering
- Route checks verify status codes, not content correctness

---

## Master Checklist

### Phase 1: Code
- [ ] `tsc --noEmit`, `eslint`, `npm test` pass

### Phase 2: Build
- [ ] `npm run build` succeeds, no errors, pages static

### Phase 3: Auth
- [ ] Endpoints respond, protected routes denied, secure cookies

### Phase 4: Routes
- [ ] All core pages 200, sitemap valid, robots.txt correct

### Phase 5: SEO
- [ ] title, description, og:*, twitter:card, canonical, favicon, slugs

### Phase 6: API
- [ ] Status, Content-Type, consistent errors, timing

### Phase 7: Git
- [ ] No secrets, no artifacts, conventional commit

### Phase 8: Smoke
- [ ] Homepage + key pages 200, og:image loads

### Phase 9: Speed
- [ ] Lighthouse ≥ 90, lazy images, dynamic imports, font-display: swap

### Phase 10: Clean
- [ ] No vulns, no debug artifacts, unused deps pruned

### Phase 11: UI/UX
- [ ] Cards responsive, error boundaries, button states, reduced-motion

### Phase 12: Database
- [ ] Indexes, no N+1, no hardcoded URLs, no sensitive leaks

### Phase 13: Secure Rendering
- [ ] No secrets in client, no XSS, no stack leaks, UUIDs
