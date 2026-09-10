---
name: client-secret-exposure-audit
description: "Audit a deployed web app for secrets exposed to the browser: hardcoded API keys/tokens in JS, secrets in HTML meta/attributes/comments, publicly reachable source/config/deploy files, and header/CORS misconfig."
category: security
risk: safe
source: self
source_type: self
date_added: "2026-09-10"
author: siddanta-ar1
tags: [security, secrets, owasp, reconnaissance, web, headers]
tools: [claude, cursor, gemini]
---

# Client-Side Secret & Sensitive-File Exposure Audit

## Overview

Modern web apps ship a lot of code and config to the browser. When credentials
leak into that client-visible surface — hardcoded in JavaScript, tucked into HTML
`meta`/`data-*` attributes or comments, or served as raw source/config/deploy
files that were never meant to be public — anyone can read them with `curl` and a
browser. This skill is a **defensive, read-only** workflow for finding that class
of exposure on a web app **you are authorized to assess**.

It maps to OWASP **A02:2021 Cryptographic Failures** (sensitive data exposure),
**A05:2021 Security Misconfiguration**, and CWE-798 (hardcoded credentials),
CWE-200 (sensitive information exposure), CWE-540 (source code in a production
build). It only fetches resources the server already hands to any anonymous
visitor — it does not exploit, brute-force, or mutate anything.

## When to Use This Skill

- Use when you need to check whether a deployed site leaks API keys, tokens, or
  passwords in its client-side bundle before shipping or during a review.
- Use when working with a static/SPA deployment (Vercel, Netlify, Nginx, S3,
  GitHub Pages) and you want to confirm no source/config/deploy files are
  publicly reachable.
- Use when the user asks to "find secrets," "audit exposed files," "check the
  JS/HTML for credentials," or run a lightweight sensitive-data-exposure pass on
  a URL they own or are authorized to test.
- Do **not** use this to attack third-party sites. See *Security & Safety Notes*.

## How It Works

Set the target once. Every command below reads only what the server serves
publicly.

```bash
BASE="https://TARGET.example"     # authorized target, no trailing path
WORK="$(mktemp -d)"; cd "$WORK"
```

### Step 1: Fetch the page and inspect response headers

```bash
curl -s -D headers.txt -o body.html "$BASE/"
cat headers.txt
```

Flag on the headers:

- `access-control-allow-origin: *` — permissive CORS (worse when paired with
  credentials).
- Missing `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Missing/weak `Strict-Transport-Security`.
- `Server`/framework version banners that fingerprint the stack.

### Step 2: Grep the HTML for secrets and sinks

```bash
grep -inE "secret|passwd|password|api[_-]?key|apikey|token|bearer|authorization|\
akia|sk_live|sk_test|pk_live|whsec_|ghp_|aiza|private[_-]?key|mongodb(\+srv)?://|\
data-[a-z-]*(secret|token|key|access)" body.html
grep -inE "<!--" body.html            # read every HTML comment
grep -ioE '<meta[^>]+>' body.html     # meta tags often carry keys/ids
grep -ioE '<script[^>]+src="[^"]+"'   body.html   # enumerate JS bundles
```

Secrets hide in `data-*` attributes, `<meta>` tags, `hidden` `<div>`s, and
`<!-- comments -->` at least as often as in scripts.

### Step 3: Pull every JavaScript bundle and scan it

```bash
# extract script srcs, resolve relative paths against $BASE, fetch and scan
grep -ioE 'src="[^"]+\.js"' body.html | sed -E 's/^src="//; s/"$//' \
 | while read -r p; do
     u="$p"; case "$p" in http*) ;; /*) u="$BASE$p";; *) u="$BASE/$p";; esac
     f="js_$(echo "$p" | tr '/:' '__')"
     curl -s "$u" -o "$f" && echo "== $u =="
   done
grep -rinE "secret|password|api[_-]?key|token|bearer|sk_(live|test)|pk_(live|test)|\
whsec_|akia|aiza|jwt|signing[_-]?key|admin[_-]?token|mongodb|redis://" js_* 2>/dev/null
```

Also scan any sourcemaps (`*.js.map`) — they can rebuild original source with
comments intact.

### Step 4: Probe for publicly reachable source / config / deploy files

SPAs often have a catch-all rewrite that returns `index.html` for unknown paths,
so **compare response sizes** — a path whose size differs from the SPA fallback
is a real, distinct file.

```bash
FALLBACK=$(curl -s "$BASE/____nope____$RANDOM" | wc -c)   # SPA fallback size
for p in /.env /.env.local /.env.production /.git/config /.git/HEAD \
  /package.json /package-lock.json /vercel.json /.vercel/project.json \
  /Dockerfile /docker-compose.yml /wrangler.toml /.gitignore \
  /server/index.js /src/config/app.config.js /config.js \
  /src/services/payment.service.js /webpack.config.js /next.config.js; do
    read -r code size < <(curl -s -o /dev/null -w "%{http_code} %{size_download}" "$BASE$p")
    [ "$code" = "200" ] && [ "$size" != "$FALLBACK" ] && echo "REAL FILE  $code $size  $p"
done
```

For any real file found, fetch it and re-run the Step 2/3 secret grep. Follow
`require(...)`/`import` paths inside those files to discover more source files
(routes, controllers, services, webhooks) and repeat.

### Step 5: Triage and score

Rate each finding by blast radius, not by where it was found:

| Severity | Examples |
|---|---|
| **Critical** | Live provider secret keys (`sk_live_`, cloud `AKIA…`+secret, DB URI with password, private signing/JWT secret, admin bearer token) reachable anonymously |
| **High** | Server-side source/config/deploy files exposed; test-mode secret keys; internal service tokens; webhook signing secrets |
| **Medium** | CORS `*`, missing CSP/security headers, verbose banners, weak randomness for security values (`Math.random()` for tokens/refs) |
| **Low / Info** | Public keys correctly client-side, analytics IDs, non-secret config, stack fingerprinting |

A key being "test/demo" does not make it safe if the *pattern* would ship a live
key the same way — report the pattern.

### Step 6: Report

Write findings as Markdown using the format in
[example-report.md](example-report.md): one row/section per finding with
`Severity · Category (OWASP/CWE) · Location · Evidence (redacted) · Impact ·
Remediation`. Redact real secret material to a prefix + length. End with
prioritized remediation and a note on which secrets must be **rotated**, not just
removed (anything committed/served is already compromised).

## Examples

### Example 1: Secrets in HTML meta and hidden elements

```bash
BASE="https://demo-for-opensource.vercel.app"; curl -s "$BASE/" -o body.html
grep -inE "recaptcha-secret|data-aws-secret|data-webhook-secret|mongodb\+srv" body.html
# -> meta recaptcha-secret=..., data-aws-access=AKIA…/data-aws-secret=…,
#    data-webhook-secret=whsec_…, and a hidden JSON blob with a mongodb+srv URI
#    (username:password@cluster). All reachable with a single unauthenticated GET.
```

### Example 2: Hardcoded credentials in a JS config bundle

```bash
curl -s "$BASE/public/assets/js/config.js" | \
  grep -inE "API_SECRET|ADMIN_TOKEN|JWT_SECRET|DATABASE_PASSWORD|PAYMENT_SIGNING_KEY"
# -> API_SECRET, ADMIN_TOKEN (JWT), JWT_SECRET, DATABASE_PASSWORD, and a payment
#    signing key, all assigned as plain string constants shipped to every browser.
```

### Example 3: Server source exposed behind a SPA fallback

```bash
FALLBACK=$(curl -s "$BASE/__nope__" | wc -c)
for p in /server/index.js /docker-compose.yml /src/services/payment.service.js; do
  sz=$(curl -s "$BASE$p" | wc -c); [ "$sz" != "$FALLBACK" ] && echo "REAL $sz $p"
done
# -> docker-compose.yml leaks a Redis password; payment.service.js leaks
#    Stripe/Khalti secret keys + webhook secret. Distinct sizes prove they are
#    real files, not the SPA catch-all page.
```

A full worked report for this target is in [example-report.md](example-report.md).

## Best Practices

- ✅ Confirm written authorization and scope (the exact hostnames) before fetching.
- ✅ Compare every probed path against the SPA fallback size to avoid false 200s.
- ✅ Follow `require`/`import` chains in any exposed source file to find more files.
- ✅ Redact real secret values in the report; record enough to identify, not reuse.
- ✅ Flag secrets for **rotation** — served/committed secrets are already burned.
- ❌ Don't use discovered credentials to authenticate, pivot, or access data.
- ❌ Don't run this against sites you don't own or aren't authorized to test.
- ❌ Don't treat "it's a test/demo key" as safe — report the shipping pattern.

## Limitations

- Read-only reconnaissance of client-served assets; it does not test injection,
  auth logic, IDOR, or server-side flaws — pair with `@web-security-testing`.
- Path probing uses a wordlist; it finds common exposures, not every file.
- This skill does not replace environment-specific validation, testing, or expert
  review.
- Stop and ask for clarification if authorization, scope, or safety boundaries
  are missing.

## Security & Safety Notes

- **Authorized targets only.** Run exclusively against systems you own or have
  explicit written permission to assess. Unauthorized scanning may be illegal.
- Every command here performs only unauthenticated `GET` requests for resources
  the server already serves publicly — no exploitation, brute force, or mutation.
- Handle any real secrets you uncover as sensitive: store findings in an access-
  controlled location, redact them in shared reports, and recommend rotation.
- Do not exfiltrate data or reuse discovered credentials — locating an exposure is
  the deliverable; using it is out of scope.

## Common Pitfalls

- **Problem:** Every probed path returns HTTP 200, hiding real files.
  **Solution:** SPA catch-all rewrite. Baseline the fallback body size and only
  treat paths with a *different* size as real files.
- **Problem:** Grep misses secrets stored in `data-*` attributes or comments.
  **Solution:** Also scan `<meta>`, `data-*`, `hidden` elements, and every
  `<!-- comment -->`, not just `<script>` bodies.
- **Problem:** Dismissing a finding because the key is labeled "test/demo."
  **Solution:** Report the pattern — the same code path would ship a live key.

## Related Skills

- `@web-security-testing` — broader OWASP Top 10 workflow; use for injection,
  auth, and access-control testing this skill does not cover.
- `@dependency-management-deps-audit` — pairs well for supply-chain/component risk
  once client exposure is triaged.
