---
name: client-secret-exposure-audit
description: "Audit a deployed web app for secrets exposed to the browser: hardcoded API keys/tokens in JS, secrets in HTML meta/attributes/comments, publicly reachable source/config/deploy files, and header/CORS misconfig."
category: security
risk: critical
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
umask 077
WORK="$(mktemp -d)" || exit 1
cd "$WORK" || exit 1
```

### Step 1: Fetch the page and inspect response headers

```bash
curl --silent --show-error --connect-timeout 5 --max-time 20 \
  --max-filesize 1048576 --proto '=https' -D headers.txt -o body.html "$BASE/"
# Inspect locally; redact Set-Cookie and credential-bearing values before sharing.
```

Flag on the headers:

- `access-control-allow-origin: *` can be appropriate for public assets. Browsers
  reject wildcard origins for credentialed reads; assess actual sensitive endpoint
  responses and credential mode before claiming a CORS vulnerability.
- Missing `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Missing/weak `Strict-Transport-Security`.
- `Server`/framework version banners that fingerprint the stack.

### Step 2: Grep the HTML for secrets and sinks

Use a local parser/scanner to report only file paths, line numbers, candidate types
and redacted fingerprints. Do not print matching lines or whole HTML comments/meta
tags into terminal/model output: they may contain the very secrets being audited.
Pattern matches are candidates, not proof of valid credentials; public/publishable
keys and placeholders require contextual classification.

### Step 3: Validate discovered scripts before fetching

Do not automatically fetch discovered URLs. Extract candidates as inert data with an HTML parser and URL parser, resolve against the authorized base, and reject any scheme other than HTTPS, embedded credentials, unexpected ports or origins. Before a request, verify all resolved destination addresses are public (not loopback, link-local, private, multicast, reserved or unspecified), pin the approved address for that connection to prevent DNS rebinding, and disable redirects. A redirect or additional origin requires separate scope validation. Use a trusted network client that enforces these checks, or stop at an inventory of candidate scripts. Never follow `require`/`import` paths or sourcemaps without the same validation. Store responses privately and redact secret values before terminal or model output.

Also scan any sourcemaps (`*.js.map`) — they can rebuild original source with
comments intact.

### Step 4: Probe for publicly reachable source / config / deploy files

SPAs often have a catch-all rewrite that returns `index.html` for unknown paths,
so compare status, content type and normalized content against multiple nonexistent
paths. Different sizes alone do not prove a file: dynamic error/SPA pages vary.

```bash
FALLBACK=$(curl --silent --show-error --connect-timeout 5 --max-time 20 --max-filesize 1048576 "$BASE/____nope____$RANDOM" | wc -c)   # SPA fallback size
for p in /.env /.env.local /.env.production /.git/config /.git/HEAD \
  /package.json /package-lock.json /vercel.json /.vercel/project.json \
  /Dockerfile /docker-compose.yml /wrangler.toml /.gitignore \
  /server/index.js /src/config/app.config.js /config.js \
  /src/services/payment.service.js /webpack.config.js /next.config.js; do
    read -r code size < <(curl --silent --show-error --connect-timeout 5 --max-time 20 --max-filesize 1048576 -o /dev/null -w "%{http_code} %{size_download}" "$BASE$p")
    [ "$code" = "200" ] && [ "$size" != "$FALLBACK" ] && echo "CANDIDATE  $code $size  $p"
done
```

For each candidate, inspect a bounded private copy through the redacting scanner. Treat
`require(...)`/`import` paths inside those files as inert candidate paths; fetch only after the same origin/destination scope validation.

### Step 5: Triage and score

Rate each finding by blast radius, not by where it was found:

| Severity | Examples |
|---|---|
| **Critical** | Live provider secret keys (`sk_live_`, cloud `AKIA…`+secret, DB URI with password, private signing/JWT secret, admin bearer token) reachable anonymously |
| **High** | Server-side source/config/deploy files exposed; test-mode secret keys; internal service tokens; webhook signing secrets |
| **Medium** | Demonstrated sensitive cross-origin reads or context-relevant missing defenses, not CORS `*` on public assets, weak randomness for security values (`Math.random()` for tokens/refs) |
| **Low / Info** | Public keys correctly client-side, analytics IDs, non-secret config, stack fingerprinting |

A key being "test/demo" does not make it safe if the *pattern* would ship a live
key the same way — report the pattern.

### Step 6: Report

Write findings as Markdown using the format in
[references/example-report.md](references/example-report.md): one row/section per finding with
`Severity · Category (OWASP/CWE) · Location · Evidence (redacted) · Impact ·
Remediation`. Redact real secret material to a prefix + length. End with
prioritized remediation and a note on which secrets must be **rotated**, not just
removed (real exposed credentials should be treated as potentially compromised; placeholders are not live incidents).

## Request safety prerequisite

The same validated/pinned public destination and no-redirect rule in Step 3 also
applies to BASE and EVERY request, including examples/path probes. Curl fragments
show workflow shape only and do not themselves implement DNS/address pinning.
If that network control is unavailable, inspect user-supplied local artifacts
instead. GET can still trigger side effects on poorly designed apps; restrict
paths/request budget, stop at sensitive evidence and avoid harvesting data.

## Examples

### Example 1: Secrets in HTML meta and hidden elements

```bash
BASE="https://authorized-demo.example"; curl -s "$BASE/" -o body.html
# Run the private redacting scanner; never emit matching secret-bearing lines.
# -> meta recaptcha-secret=..., data-aws-access=AKIA…/data-aws-secret=…,
#    data-webhook-secret=whsec_…, and a hidden JSON blob with a mongodb+srv URI
#    (username:password@cluster). All reachable with a single unauthenticated GET.
```

### Example 2: Hardcoded credentials in a JS config bundle

```bash
# Inspect the authorized bounded local JS copy with redacted candidate output.
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
#    Stripe/Khalti secret keys + webhook secret. Distinct sizes are candidates only; verify content locally.
```

A full worked report for this target is in [references/example-report.md](references/example-report.md).

## Best Practices

- ✅ Confirm written authorization and scope (the exact hostnames) before fetching.
- ✅ Compare normalized fallback content, status and type; size is only a triage hint.
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
  treat different-size responses as candidates pending content validation.
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
