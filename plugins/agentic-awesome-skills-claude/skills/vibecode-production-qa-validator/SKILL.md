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

## When to Use

- Use before shipping or promoting a fullstack Next.js app to production.
- Use after large UI, SEO, auth, API, database, or dependency changes need a concrete launch-readiness pass.
- Use when you need a compact command-driven checklist for build, route, metadata, performance, security, and cleanup checks.

```bash
export PROD_URL="https://yourdomain.com"
export QA_TARGET_ENV="staging" # staging or production
export QA_REMOTE_CONSENT=""     # set to YES only after confirming the target and authorization
export QA_AUTH_HEADER=""       # optional: "Bearer eyJ..."
export PAGESPEED_API_KEY=""    # optional: for auto PageSpeed API
```

Before any remote check, confirm that you own or are authorized to test the exact host. Production checks can create load and should use a maintenance window or an explicitly approved test plan.

---

## Consolidated Runner

```bash
qa:local-bin() { [ -x "node_modules/.bin/$1" ] || { echo "  ✗ Missing local binary: $1 (install declared dependencies first)" >&2; return 1; }; }
qa:target() {
  [ "$QA_REMOTE_CONSENT" = "YES" ] || { echo "  ✗ Set QA_REMOTE_CONSENT=YES after confirming authorization" >&2; return 1; }
  case "$QA_TARGET_ENV" in staging|production) ;; *) echo "  ✗ QA_TARGET_ENV must be staging or production" >&2; return 1;; esac
  case "$PROD_URL" in https://*/*|https://*) ;; *) echo "  ✗ PROD_URL must be an HTTPS origin" >&2; return 1;; esac
  printf '%s' "$PROD_URL" | grep -Eq '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' || { echo "  ✗ PROD_URL must contain only an HTTPS origin (no credentials, path, query, or fragment)" >&2; return 1; }
  [ "$PROD_URL" != "https://yourdomain.com" ] || { echo "  ✗ Replace the placeholder PROD_URL" >&2; return 1; }
  echo "  ✓ Authorized target: $QA_TARGET_ENV $PROD_URL"
}
qa:all() { qa:target && qa:code && qa:build && qa:routes / /about /contact /privacy /terms /faq /sitemap.xml /robots.txt /api/health && qa:robots && qa:sitemap && qa:seo && qa:seo:ogimage && qa:api /api/health /api/tools && qa:git && qa:smoke; }
qa:full() { qa:all && qa:auth && qa:auth:cookies && qa:lazyload && qa:heavyload && qa:vulns && qa:cleanup && qa:ux:cards && qa:ux:boundaries && qa:ux:animation && qa:database && qa:db:migrations && qa:secure; }
```

---

### Phase 1: Code Integrity

- [ ] Local `tsc --noEmit`
- [ ] Local `eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0`
- [ ] `npm test -- --runInBand --passWithNoTests`

```bash
qa:code() { qa:local-bin tsc && qa:local-bin eslint && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0 && npm test -- --runInBand --passWithNoTests; }
```

---

### Phase 2: Build Verification

- [ ] `npm run build` succeeds
- [ ] Build output uses current Next.js route markers (`○` static, `ƒ` dynamic) as expected
- [ ] Build log has no errors

```bash
qa:build() { local log; log="$(mktemp "${TMPDIR:-/tmp}/qa-build.XXXXXX.log")" || return 1; set -o pipefail; npm run build 2>&1 | tee "$log"; local rc=$?; set +o pipefail; [ "$rc" -eq 0 ] && ! grep -qi "error\|failed" "$log"; local ok=$?; rm -f "$log"; return "$ok"; }
```

| Symbol | Meaning |
|--------|---------|
| `○` | Static |
| `ƒ` | Dynamic (server-rendered on demand) |

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
  curl -so /dev/null -w "%{http_code}" "$PROD_URL/api/protected" | grep -Eq "401|403" || { echo "  ✗ Protected route not denying unauthenticated"; ((F++)); }
  return $F
}
qa:auth:cookies() {
  local F=0 found=0 c headers
  for ep in /api/auth/session /api/auth/login; do
    headers=$(curl -fsSI "$PROD_URL$ep") || { echo "  ✗ $ep headers unavailable"; ((F++)); continue; }
    while IFS= read -r c; do
      echo "$c" | grep -qi "^set-cookie:" || continue
      found=1
      echo "  $ep: Set-Cookie"
      echo "$c" | grep -qi "HttpOnly" || { echo "    ✗ Missing HttpOnly"; ((F++)); }
      echo "$c" | grep -qi "Secure" || { echo "    ✗ Missing Secure"; ((F++)); }
      echo "$c" | grep -qi "SameSite" || { echo "    ✗ Missing SameSite"; ((F++)); }
    done <<< "$headers"
  done
  [ "$found" -eq 1 ] || { echo "  ✗ No session cookie observed"; ((F++)); }
  return "$F"
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
qa:robots() { local body; body=$(curl -fsS "$PROD_URL/robots.txt") || return 1; if echo "$body" | grep -qi "Disallow: /$"; then echo "  ✗ Blocks all crawlers"; return 1; else echo "  ✓ OK"; fi; }
qa:sitemap() { curl -fsS "$PROD_URL/sitemap.xml" | python3 -c "import sys,xml.etree.ElementTree as ET; ET.parse(sys.stdin); print('✓ Valid XML')"; }
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
  local T=$(echo "$H" | grep -oP '<title>\K[^<]+'); local L=${#T}; [ $L -ge 30 -a $L -le 60 ] || { echo "  ✗ Title ${L}chars (require 30-60)"; ((F++)); }
  curl -fsSo /dev/null "$PROD_URL/favicon.ico" || { echo "  ✗ No favicon.ico"; ((F++)); }
  return $F
}
qa:seo:ogimage() {
  local I dimensions width height
  I=$(curl -fsS "$PROD_URL" | grep -oP 'og:image" content="\K[^"]+' | head -1) || return 1
  [[ "$I" =~ ^https?:// ]] || I="$PROD_URL$I"
  curl -fsSo /dev/null "$I" || { echo "  ✗ og:image is unavailable"; return 1; }
  command -v identify >/dev/null 2>&1 || { echo "  ✗ ImageMagick identify is required for the declared dimension check"; return 1; }
  dimensions=$(curl -fsS "$I" | identify -format "%w %h" - 2>/dev/null) || return 1
  read -r width height <<EOF
$dimensions
EOF
  [ "$width" -ge 1200 ] && [ "$height" -ge 630 ] || { echo "  ✗ og:image is ${width}x${height}; require at least 1200x630"; return 1; }
  echo "  ✓ og:image is ${width}x${height}"
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
  local F=0
  for p; do
    local R=$(curl -so /dev/null -w "%{http_code} %{content_type}" "$PROD_URL$p")
    echo "  $p → $R"
    echo "$R" | grep -Eq '^2[0-9]{2} .*json' || ((F++))
  done
  local E=$(curl -s "$PROD_URL/api/nonexistent")
  echo "$E" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'error' in d and 'message' in d; print('✓ Consistent errors')" 2>/dev/null || { echo "  ✗ Inconsistent error shape"; ((F++)); }
  return "$F"
}
```

---

### Phase 7: Git Hygiene

- [ ] No secrets/credentials in diff
- [ ] No `.next`/`node_modules` staged
- [ ] Commit: `type(scope): message`

```bash
qa:git() {
  local S="" f F=0
  while IFS= read -r f; do
    [ -f "$f" ] && git diff HEAD -- "$f" 2>/dev/null | grep '^+' | grep -IqiE 'password|secret|api_key' && S="${S}${S:+ }$f"
  done < <(git diff --name-only HEAD)
  [ -n "$S" ] && { echo "  ✗ Potential secret patterns in changed files (values redacted): $S"; ((F++)); } || echo "  ✓ No secret patterns"
  local A=$(git status --short 2>/dev/null | grep -E "\.next|node_modules" | head -3)
  [ -n "$A" ] && { echo "  ✗ Build artifacts:"; echo "$A"; ((F++)); } || echo "  ✓ No artifacts"
  return "$F"
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
  local F=0
  curl -fsSI "$PROD_URL" >/dev/null && echo "  ✓ Homepage" || { echo "  ✗ Homepage"; ((F++)); }
  curl -fsSI "$PROD_URL/sitemap.xml" >/dev/null && echo "  ✓ Sitemap" || { echo "  ✗ Sitemap"; ((F++)); }
  return "$F"
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
  [ "$N" -gt 0 ] || { echo "  ✗ No lazy-loaded images found"; return 1; }
  grep -rEq "next/dynamic|dynamic\(\(" app/ --include="*.tsx" 2>/dev/null || { echo "  ✗ No dynamic imports"; return 1; }
  echo "  ✓ Dynamic import found (matching source content redacted)"
}
qa:heavyload() {
  ls -lhS .next/static/chunks/*.js 2>/dev/null | head -5
  local W=$(curl -so /dev/null -w "%{size_download}" "$PROD_URL" 2>/dev/null || echo 0)
  echo "  HTML weight: ~$((W/1024))KB"
  [ "$W" -gt 0 ] && [ "$W" -lt 1048576 ] || { echo "  ✗ HTML fetch failed or exceeds 1MB"; return 1; }
  echo "  - Run the declared local Lighthouse binary for full weight analysis"
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
  local audit F=0
  audit=$(npm audit --json 2>/dev/null) || true
  echo "$audit" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert "metadata" in d' 2>/dev/null || { echo "  ✗ npm audit did not return a valid report"; return 1; }
  echo "$audit" | grep -Eq '"(critical|high)"[[:space:]]*:[[:space:]]*[1-9]' && { echo "  ✗ Critical/high vulnerabilities detected"; ((F++)); } || echo "  ✓ No critical/high vulns"
  npm outdated 2>/dev/null | head -5 | grep . || echo "  ✓ All up to date"
  local D=$(git grep -IlE "eval\(|new Function\(|document\.write\(" -- app src 2>/dev/null | head -5) # security-allowlist: defensive source scan
  [ -n "$D" ] && { echo "  ✗ Dangerous patterns detected in:"; echo "$D"; ((F++)); } || echo "  ✓ No dangerous patterns"
  return "$F"
}
qa:cleanup() {
  local F=0
  if git diff --cached --unified=0 --no-color 2>/dev/null | grep '^+' | grep -Eqi 'console\.log|debugger'; then
    echo "  ✗ Debug artifacts detected in staged additions (content redacted)"
    ((F++))
  else
    echo "  ✓ No debug artifacts"
  fi
  local T=$(git grep -IlE "TODO|FIXME|HACK" -- app src 2>/dev/null | head -5)
  [ -n "$T" ] && { echo "  ✗ TODO/FIXME/HACK markers remain in:"; echo "$T"; ((F++)); } || echo "  ✓ No TODO/FIXME/HACK markers"
  return "$F"
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
  local F=0
  local E=$(grep -rn "text-overflow\|line-clamp\|truncate" app/ --include="*.css" --include="*.tsx" 2>/dev/null | head -3)
  [ -n "$E" ] && echo "  ✓ Text overflow handling" || { echo "  ✗ No text overflow handling"; ((F++)); }
  local A=$(grep -rn "aspect-\|object-fit" app/ --include="*.css" --include="*.tsx" 2>/dev/null | head -3)
  [ -n "$A" ] && echo "  ✓ aspect-ratio/object-fit used" || { echo "  ✗ No aspect-ratio set"; ((F++)); }
  return "$F"
}
qa:ux:boundaries() {
  local F=0
  for f in app/error.tsx app/global-error.tsx app/not-found.tsx app/loading.tsx; do
    [ -f "$f" ] && echo "  ✓ $f" || { echo "  ✗ Missing $f"; ((F++)); }
  done
  return "$F"
}
qa:ux:animation() {
  local F=0
  local A=$(grep -rIl "animation.*width\|transition.*height\|@keyframes.*top\|@keyframes.*margin" app/ --include="*.css" --include="*.tsx" 2>/dev/null | head -5)
  [ -n "$A" ] && { echo "  ✗ Layout-triggering animations in:"; echo "$A"; ((F++)); } || echo "  ✓ No layout-triggering animations"
  local P=$(grep -r "@media.*prefers-reduced-motion" app/ --include="*.css" --include="*.tsx" 2>/dev/null | head -3)
  [ -n "$P" ] && echo "  ✓ prefers-reduced-motion found in CSS" || { echo "  ✗ No prefers-reduced-motion in CSS"; ((F++)); }
  return "$F"
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
  local F=0
  local H=$(grep -rn "postgres://\|mysql://\|mongodb://" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v ".env" | head -5)
  [ -n "$H" ] && { echo "  ✗ Hardcoded DB URL found (value redacted)"; ((F++)); } || echo "  ✓ No hardcoded DB URLs"
  local R=$(grep -rIl "\$queryRaw\|\.raw(" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5)
  [ -n "$R" ] && { echo "  ✗ Raw SQL requires manual safety review in:"; echo "$R"; ((F++)); } || echo "  ✓ No raw SQL"
  local N=$(grep -rn "\.findMany\|\.findUnique" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "include:" | cut -d: -f1 | sort -u | head -5)
  [ -n "$N" ] && { echo "  ✗ Possible N+1 requires manual review in:"; echo "$N"; ((F++)); } || echo "  ✓ No possible N+1 patterns"
  return "$F"
}
qa:db:migrations() {
  local P M
  P=$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d -print -quit 2>/dev/null)
  M=$(find db/migrations -maxdepth 1 -type f -name '*.sql' -print -quit 2>/dev/null)
  [ -n "$P" ] && { echo "  ✓ Prisma migrations present"; return 0; }
  [ -n "$M" ] && { echo "  ✓ SQL migrations present"; return 0; }
  echo "  ✗ No Prisma or SQL migrations found"
  return 1
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
  local F=0
  local S=$(git grep -IlE "api_key|API_KEY|secret_key|PRIVATE_KEY" -- ':!*.env*' ':!*test*' 2>/dev/null | head -5)
  [ -n "$S" ] && { echo "  ✗ Potential secrets in source (values redacted):"; echo "$S"; ((F++)); } || echo "  ✓ No hardcoded secrets"
  local D=$(grep -rIl "dangerouslySetInnerHTML" app/ src/ --include="*.tsx" 2>/dev/null | head -5)
  [ -n "$D" ] && { echo "  ✗ XSS risk — review sanitization in:"; echo "$D"; ((F++)); } || echo "  ✓ No dangerouslySetInnerHTML"
  local T=$(grep -rn "localStorage\|sessionStorage" app/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -i "token\|jwt\|secret" | cut -d: -f1 | sort -u | head -5)
  [ -n "$T" ] && { echo "  ✗ Browser storage usage requires token/secret review in:"; echo "$T"; ((F++)); } || echo "  ✓ No browser storage usage"
  local E
  E=$(curl -fsS "$PROD_URL/api/nonexistent" 2>/dev/null) || { echo "  ✗ Could not inspect API error response"; return 1; }
  if echo "$E" | grep -qi "stack\|Error:"; then echo "  ✗ Stack trace leak"; ((F++)); else echo "  ✓ No stack leak"; fi
  return "$F"
}
```

---

## Pre-Commit Hook

Installing or replacing a Git hook mutates repository-local configuration. Inspect any existing hook and obtain explicit repository-owner approval before running this opt-in installation. The hook uses only declared local binaries and fails if they are absent.

```bash
test "$QA_INSTALL_HOOK_APPROVED" = "YES" || { echo "Set QA_INSTALL_HOOK_APPROVED=YES after approval" >&2; exit 1; }
test ! -e .git/hooks/pre-commit || { echo "Existing pre-commit hook found; merge it manually" >&2; exit 1; }
test -x node_modules/.bin/tsc && test -x node_modules/.bin/eslint || { echo "Install declared dependencies first" >&2; exit 1; }
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
./node_modules/.bin/tsc --noEmit || exit 1
./node_modules/.bin/eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0 || exit 1
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
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
      - run: npm ci
      - run: ./node_modules/.bin/tsc --noEmit
      - run: ./node_modules/.bin/eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0
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

- QA checks do not intentionally change the remote target, but local build, test, audit, and package scripts may write caches, build outputs, logs, or other project files.
- Use `PROD_URL` and `QA_AUTH_HEADER` only for an exact staging or production target you own or are authorized to test; set `QA_REMOTE_CONSENT=YES` only after confirming scope and impact.
- Hook installation is excluded from `qa:full` and requires separate explicit approval.
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
