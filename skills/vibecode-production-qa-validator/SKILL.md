---
name: vibecode-production-qa-validator
description: "13-phase production QA for fullstack Next.js apps: build verification, SEO tags, OG images, favicon, route regression, API auth, page speed, lazy load, vulnerability scan, UI/UX cards, error boundaries, database, secure rendering, and cleanup."
category: devops
risk: safe
source: self
source_type: self
date_added: "2026-05-31"
author: Whoisabhishekadhikari
tags: [qa, nextjs, production, deployment, seo, authentication, api, performance, favicon, cleanup, lighthouse, database, security, ui-ux]
tools: [claude, cursor, gemini, claude-code, opencode]
version: 2.0.0
---

# Production QA Validator

Run phases in order. Fix failures before moving to next.

```bash
export PROD_URL="https://yourdomain.com"
export QA_AUTH_HEADER=""       # optional: "Bearer eyJ..."
export PAGESPEED_API_KEY=""    # optional: for auto PageSpeed API
```

---

## Consolidated Runner

```bash
qa:all() { qa:code && qa:build && qa:routes / /about /contact /privacy /terms /faq /sitemap.xml /robots.txt /api/health && qa:seo && qa:api /api/health /api/tools && qa:git && qa:smoke; }
qa:full() { qa:all && qa:auth && qa:auth:cookies && qa:lazyload && qa:heavyload && qa:vulns && qa:cleanup && qa:ux:cards && qa:ux:boundaries && qa:ux:animation && qa:database && qa:secure; }
```

---

### Phase 1: Code Integrity

- [ ] `npx tsc --noEmit`
- [ ] `npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0`
- [ ] `npm test -- --runInBand --passWithNoTests`

```bash
qa:code() { npx tsc --noEmit && npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0 && npm test -- --runInBand --passWithNoTests; }
```

---

### Phase 2: Build Verification

- [ ] `npm run build` succeeds
- [ ] SEO pages show `○`/`●` not `λ`
- [ ] Build log has no errors

```bash
qa:build() { npm run build 2>&1 | tee /tmp/qa-build.log && ! grep -qi "error\|failed" /tmp/qa-build.log; }
```

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

```bash
qa:auth() {
  local F=0
  for ep in /api/auth/login /api/auth/session /api/auth/logout; do
    curl -so /dev/null -w "%{http_code}" "$PROD_URL$ep" | grep -q "200\|401" || { echo "  ✗ $ep unreachable"; ((F++)); }
  done
  curl -so /dev/null -w "%{http_code}" "$PROD_URL/api/protected" | grep -q "401\|403" || echo "  ⚠ Protected route not denying unauthenticated"
  return $F
}
qa:auth:cookies() {
  for ep in /api/auth/session /api/auth/login; do
    curl -sI "$PROD_URL$ep" | grep -i "^set-cookie:" | while IFS= read -r c; do
      echo "  $ep: $(echo "$c" | cut -d= -f1)"
      echo "$c" | grep -qi "HttpOnly" || echo "    ✗ Missing HttpOnly"
      echo "$c" | grep -qi "Secure" || echo "    ✗ Missing Secure"
      echo "$c" | grep -qi "SameSite" || echo "    ⚠ Missing SameSite"
    done
  done
}
```

---

### Phase 4: Route Regression

- [ ] Core pages, sitemap, robots.txt all 200
- [ ] URLs use kebab-case, no duplicate slugs
- [ ] robots.txt allows indexing
- [ ] Sitemap XML valid, all URLs resolve 200

```bash
qa:routes() { local F=0; for p; do local C=$(curl -so /dev/null -w "%{http_code}" "$PROD_URL$p"); echo "$C $p"; [ "$C" = "200" ] || ((F++)); done; return $F; }
qa:robots() { curl -s "$PROD_URL/robots.txt" | grep -qi "Disallow: /$" && echo "  ✗ Blocks all crawlers" || echo "  ✓ OK"; }
qa:sitemap() { curl -s "$PROD_URL/sitemap.xml" | python3 -c "import sys,xml.etree.ElementTree as ET; ET.parse(sys.stdin); print('✓ Valid XML')"; }
```

---

### Phase 5: SEO — Tags, Images, Favicon, Slugs

- [ ] `<title>` 30–60 chars, unique per page
- [ ] `<meta name="description">` in raw HTML
- [ ] og:title matches `<title>`, og:url matches canonical
- [ ] og:image ≥ 1200×630px, absolute URL, loads 200
- [ ] twitter:card = summary_large_image
- [ ] Canonical self-referencing, no duplicates
- [ ] `/favicon.ico` 200, apple-touch-icon present
- [ ] `hreflang` tags if multilingual
- [ ] JSON-LD structured data present
- [ ] Slugs: kebab-case, < 80 chars, no stop words

```bash
qa:seo() {
  local H=$(curl -s "$PROD_URL"); local F=0
  for t in "og:title" "og:description" "og:image" "twitter:card" "canonical" "description"; do echo "$H" | grep -qi "$t" || { echo "  ✗ $t"; ((F++)); }; done
  echo "$H" | grep -qi "<title>" || { echo "  ✗ <title>"; ((F++)); }
  local T=$(echo "$H" | grep -oP '<title>\K[^<]+'); local L=${#T}; [ $L -ge 30 -a $L -le 60 ] || echo "  ⚠ Title ${L}chars (target 30-60)"
  curl -so /dev/null -w "%{http_code}" "$PROD_URL/favicon.ico" | grep -q 200 || echo "  ⚠ No favicon.ico"
  return $F
}
qa:seo:ogimage() {
  local I=$(curl -s "$PROD_URL" | grep -oP 'og:image" content="\K[^"]+'); [[ "$I" =~ ^http ]] || I="$PROD_URL$I"
  curl -so /dev/null -w "%{http_code}" "$I" | grep -q 200 || { echo "  ✗ og:image returns non-200"; return 1; }
  command -v identify &>/dev/null && curl -s "$I" | identify -format "%wx%h" - 2>/dev/null | grep -qP "12\d{2}x6\d{2}" && echo "  ✓ ≥ 1200x630" || echo "  ⚠ Install imagemagick to check dimensions"
}
```

---

### Phase 6: API Route Behavior

- [ ] Correct status codes + Content-Type
- [ ] Errors return consistent JSON `{ error, message }`
- [ ] Response times < 200ms
- [ ] CORS headers correct (if cross-origin)

```bash
qa:api() {
  for p; do
    local R=$(curl -so /dev/null -w "%{http_code} %{content_type}" "$PROD_URL$p")
    echo "  $p → $R"
  done
  local E=$(curl -s "$PROD_URL/api/nonexistent")
  echo "$E" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'error' in d; print('✓ Consistent errors')" 2>/dev/null || echo "  ⚠ Inconsistent error shape"
}
```

---

### Phase 7: Git Hygiene

- [ ] No secrets/credentials in diff
- [ ] No `.next`/`node_modules` staged
- [ ] Commit: `type(scope): message`

```bash
qa:git() {
  local S=$(git diff HEAD 2>/dev/null | grep -i "password\|secret\|api_key\|localhost:3000" | grep "^+")
  [ -n "$S" ] && { echo "  ✗ Secrets in diff!"; echo "$S"; return 1; } || echo "  ✓ No secrets"
  local A=$(git status --short 2>/dev/null | grep -E "\.next|node_modules" | head -3)
  [ -n "$A" ] && echo "  ⚠ Build artifacts:" && echo "$A" || echo "  ✓ No artifacts"
}
```

---

### Phase 8: Post-Deployment Smoke Test

- [ ] Homepage 200, key pages 200
- [ ] OG image loads 200
- [ ] No console errors (manual)
- [ ] Auth flow works (manual)

```bash
qa:smoke() {
  curl -sI "$PROD_URL" | head -1 | grep -q "200" && echo "  ✓ Homepage" || echo "  ✗ Homepage"
  curl -sI "$PROD_URL/sitemap.xml" | head -1 | grep -q "200" && echo "  ✓ Sitemap" || echo "  ✗ Sitemap"
}
```

---

### Phase 9: Page Speed, Lazy Load & Bundles

- [ ] Lighthouse ≥ 90 (Perf, A11y, SEO)
- [ ] FCP < 2.5s, LCP < 4.0s, CLS < 0.1
- [ ] Images lazy-loaded (`loading="lazy"`), WebP/AVIF
- [ ] Dynamic imports for heavy components
- [ ] Largest JS chunk < 200KB gzipped
- [ ] `font-display: swap`, no FOIT
- [ ] Total page weight < 1MB

```bash
qa:lazyload() {
  local N=$(grep -r "loading=" app/ --include="*.tsx" 2>/dev/null | grep -c "lazy" || true)
  echo "  Lazy images: $N"
  grep -rn "next/dynamic\|dynamic((" app/ --include="*.tsx" 2>/dev/null | head -5 | grep . || echo "  ⚠ No dynamic imports"
}
qa:heavyload() {
  ls -lhS .next/static/chunks/*.js 2>/dev/null | head -5
  local W=$(curl -so /dev/null -w "%{size_download}" "$PROD_URL" 2>/dev/null || echo 0)
  echo "  HTML weight: ~$((W/1024))KB"
  echo "  ⚠ Run 'npx lighthouse $PROD_URL --view' for full weight analysis"
}
# PageSpeed: open "https://pagespeed.web.dev/?url=$PROD_URL"
```

---

### Phase 10: Cleanup & Vulnerability Scan

- [ ] `npm prune`, `depcheck` — no unused deps
- [ ] No console.log/debugger in staged code
- [ ] `npm audit` — zero critical/high vulnerabilities
- [ ] No eval/new Function/document.write
- [ ] TODOs resolved

```bash
qa:vulns() {
  npm audit 2>/dev/null | grep -E "critical|high" | grep . && echo "  ✗ Vulnerabilities!" || echo "  ✓ No critical/high vulns"
  npm outdated 2>/dev/null | head -5 | grep . || echo "  ✓ All up to date"
  local D=$(grep -rn "eval(\|new Function(\|document.write(" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5)
  [ -n "$D" ] && echo "  ⚠ Dangerous patterns:" && echo "$D" || echo "  ✓ No dangerous patterns"
}
qa:cleanup() {
  local D=$(git diff --cached 2>/dev/null | grep "^+" | grep -i "console\.log\|debugger" | head -5)
  [ -n "$D" ] && echo "  ✗ Debug artifacts:" && echo "$D" || echo "  ✓ No debug artifacts"
  local T=$(git diff --cached 2>/dev/null | grep "^+" | grep -i "TODO\|FIXME\|HACK" | head -5)
  [ -n "$T" ] && echo "  ⚠ TODOs remain:" && echo "$T"
}
```

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
- [ ] Forms disable submit on click (no double-submit)

```bash
qa:ux:cards() {
  local E=$(grep -rn "text-overflow\|line-clamp\|truncate" app/ --include="*.css" --include="*.tsx" 2>/dev/null | head -3)
  [ -n "$E" ] && echo "  ✓ Text overflow handling" || echo "  ⚠ No text overflow handling"
  local A=$(grep -rn "aspect-\|object-fit" app/ --include="*.css" --include="*.tsx" 2>/dev/null | head -3)
  [ -n "$A" ] && echo "  ✓ aspect-ratio/object-fit used" || echo "  ⚠ No aspect-ratio set"
}
qa:ux:boundaries() {
  for f in app/error.tsx app/global-error.tsx app/not-found.tsx app/loading.tsx; do
    [ -f "$f" ] && echo "  ✓ $f" || echo "  ⚠ Missing $f"
  done
}
qa:ux:animation() {
  local A=$(grep -rn "animation.*width\|transition.*height\|@keyframes.*top\|@keyframes.*margin" app/ --include="*.css" --include="*.tsx" 2>/dev/null | head -5)
  [ -n "$A" ] && echo "  ⚠ Layout-triggering animations:" && echo "$A" || echo "  ✓ No layout-triggering animations"
  local P=$(grep -r "@media.*prefers-reduced-motion" app/ --include="*.css" --include="*.tsx" 2>/dev/null | head -3)
  [ -n "$P" ] && echo "  ✓ prefers-reduced-motion found in CSS" || echo "  ⚠ No prefers-reduced-motion in CSS"
}
```

---

### Phase 12: Database & Data Layer

- [ ] Connection pool configured (no starvation)
- [ ] Schema in sync with migrations
- [ ] Indexes on all queried columns, no N+1
- [ ] No hardcoded DB credentials in source
- [ ] No raw SQL injection risk
- [ ] No sensitive data leaked in API responses
- [ ] Migrations are idempotent

```bash
qa:database() {
  local H=$(grep -rn "postgres://\|mysql://\|mongodb://" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".env" | head -5)
  [ -n "$H" ] && { echo "  ✗ Hardcoded DB URL:"; echo "$H"; } || echo "  ✓ No hardcoded DB URLs"
  local R=$(grep -rn "\$queryRaw\|\.raw(" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5)
  [ -n "$R" ] && echo "  ⚠ Raw SQL:" && echo "$R" || echo "  ✓ No raw SQL"
  local N=$(grep -rn "\.findMany\|\.findUnique" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "include:" | head -5)
  [ -n "$N" ] && echo "  ⚠ Possible N+1:" && echo "$N" || echo "  ✓ No N+1 patterns"
}
qa:db:migrations() {
  [ -d "prisma/migrations" ] && echo "  ✓ Prisma: $(ls prisma/migrations 2>/dev/null | wc -l) migrations" || echo "  - No prisma migrations dir"
  local M=$(ls db/migrations/*.sql 2>/dev/null | head -5); [ -n "$M" ] && echo "  ✓ SQL migrations:" && echo "$M" || echo "  - No SQL migration files"
}
```

---

### Phase 13: Secure Data Rendering

- [ ] No secrets/tokens in client source or localStorage
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] API errors don't leak stack traces
- [ ] Internal IDs use UUIDs not auto-increment
- [ ] User emails masked in UI
- [ ] NEXT_PUBLIC_ vars contain no secrets

```bash
qa:secure() {
  local S=$(git grep -n "api_key\|API_KEY\|secret_key\|PRIVATE_KEY" -- ':!*.env*' ':!*test*' 2>/dev/null | head -5)
  [ -n "$S" ] && echo "  ✗ Secrets in source:" && echo "$S" || echo "  ✓ No hardcoded secrets"
  local D=$(grep -rn "dangerouslySetInnerHTML" app/ src/ --include="*.tsx" 2>/dev/null | head -5)
  [ -n "$D" ] && echo "  ⚠ XSS risk — use DOMPurify:" && echo "$D" || echo "  ✓ No dangerouslySetInnerHTML"
  local T=$(grep -rn "localStorage\|sessionStorage" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -i "token\|jwt\|secret" | head -5)
  [ -n "$T" ] && echo "  ⚠ Tokens in storage — use httpOnly cookies:" && echo "$T" || echo "  ✓ No tokens in storage"
  curl -s "$PROD_URL/api/nonexistent" 2>/dev/null | grep -qi "stack\|Error:" && echo "  ✗ Stack trace leak" || echo "  ✓ No stack leak"
}
```

---

## Pre-Commit Hook

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
npx tsc --noEmit || exit 1
npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0 || exit 1
EOF
chmod +x .git/hooks/pre-commit
```

---

## CI/CD (GitHub Actions)

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
      - run: npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0
      - run: npm test -- --runInBand --passWithNoTests
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
| Images load slowly | Add `loading="lazy"`, use WebP/AVIF, resize to display size |

---

## Security Notes

- All `qa:*` functions are read-only (tsc, lint, test, build, curl, grep)
- `PROD_URL` and `QA_AUTH_HEADER` only for environments you own
- Basic secret scanning in `git diff` — for prod, use `trufflehog`/`git-secrets`
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
