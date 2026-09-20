---
name: hunt-spa-api
description: Discover a single-page-app's hidden backend API from its public JS bundle,
  then test that API for broken access control / missing authentication.
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: authorized-engagement
report_count: 1
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

## When to use this skill

Trigger when:
- A target host returns a tiny HTML shell + big `/static/js/*.js` or `/_next/static/*` bundles (React/Vue/Angular/Next/Svelte SPA)
- You see a subdomain named `console`, `app`, `dashboard`, `portal`, `admin`, `panel`, `manage`, `internal`
- Recon surfaces any `*api*`, `*-api*`, `api.*` host
- A login page is OAuth/SSO-gated (the *frontend* auth tells you nothing about whether the *API* enforces auth)

The core insight: **a SPA is a client to a backend API, and it ships the full map of that API — hosts, routes, sometimes keys — to anyone who views source.** The login page being protected says nothing about whether the API behind it checks tokens. Auth is frequently enforced on the *gateway/login* and missing on a *route group* of the API.

DO NOT skip this because "the app needs login" — that's exactly when this pays off.

---

## The play (5 steps)

### 1. Pull the shell + enumerate the bundles
```bash
curl -s https://console.target.com/ -o index.html
# React/CRA:
grep -oE '/static/js/[^"]+\.js' index.html
# Next.js:
grep -oE '/_next/static/[^"]+\.js' index.html
# generic:
grep -oiE 'src="[^"]+\.js[^"]*"' index.html
```
Download every bundle (they can be multi-MB — that's fine, it's all route data):
```bash
mkdir bundles
for j in $(grep -oE '/static/js/[^"]+\.js' index.html | sort -u); do
  curl -s "https://console.target.com$j" -o "bundles/$(echo "$j"|tr '/' '_')"
done
```

### 2. Harvest API hosts, routes, and secrets from the bundles
```bash
B=bundles/*.js
# Backend API hosts (incl. dev/beta/staging variants — often weaker auth)
grep -ohiE 'https://[a-z0-9.-]*(api|console|backend|service)[a-z0-9.-]*\.target\.com[a-z0-9/_-]*' $B | sort -u
# Versioned API base paths
grep -ohiE '/api/v[0-9]+/?' $B | sort -u
# Route literals — minified bundles store routes as STRING segments, not full URLs.
# Grep for quoted "resource/action" strings:
grep -ohiE '"[a-z0-9_-]+/[a-z0-9_/-]+"' $B | tr -d '"' \
  | grep -iE '(login|user|account|order|billing|invoice|payment|deal|report|token|otp|password|reset|admin|profile|auth|upload|export|role|permission|dashboard|wallet|finance|sales)' | sort -u
# Secrets (validate before trusting — most AIza keys are Maps/analytics, not Auth)
grep -ohiE '(AIza[0-9A-Za-z_-]{35}|AKIA[0-9A-Z]{16}|sk_live_[0-9A-Za-z]+|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|apiKey["'"'"']?\s*[:=]\s*["'"'"'][^"'"'"']+)' $B | sort -u
```
**Note:** minifiers store routes as concatenated string segments (e.g. `"account/payment/list"`), NOT full `/api/v2/...` URLs — so a naive `/api/v*` grep returns nothing. Grep for the **resource-word route strings** and prepend the base yourself.

**Lazy-loaded (async) chunks — don't stop at HTML-referenced bundles.** CRA/webpack SPAs reference only runtime+main+vendor in index.html; numbered async route chunks are named inside main.js's chunk map and loaded at runtime, so grepping only `/static/js/*.js` from the shell truncates route coverage to eager chunks.
```bash
grep -oE '[0-9]+:"[a-f0-9]+"' bundles/*main*.js        # {chunkId:"hash"} pairs
# reconstruct /static/js/<id>.<hash>.chunk.js, download each, re-run route/host/secret harvest
# asset-manifest.json (if present) lists them all -> hunt-source-leak
```

### 3. Establish a CONTROL — find an endpoint that IS gated
Before declaring anything vulnerable, send an unauthenticated request to an endpoint you expect to be protected, and capture what *correct* rejection looks like:
```bash
curl -s -X POST https://api.target.com/api/users -H 'Content-Type: application/json' -d '{}'
# secure → {"error":"Missing or invalid authorization header"} or HTTP 401
```
This is your differential. A sibling API (e.g. a second API host, or a different route group on the same host) is the ideal control — same stack, so a different response = real authz gap, not a quirk.

### 4. Test each route family UNAUTHENTICATED, both methods
For every discovered route, send it with **no `Authorization` header** and compare to the control:
```bash
for r in <routes>; do
  curl -s -o /tmp/r -w "[%{http_code}] $r\n" -X POST -H 'Content-Type: application/json' -d '{}' "https://api.target.com/api/v2/$r"
done
```
Interpret:
- **`401`/`"Missing authorization"`** → gated (correct). Move on.
- **`200` with data** → unauthenticated data exposure. **Finding.**
- **`400 "field X is mandatory"`** → the route processed your request and reached *business-logic validation* without an auth check → **auth bypass; supply the field minimally to confirm.**
- **`200` + verbose DB/stack error** (e.g. `PROCEDURE db_x.sp_y does not exist`) → reached the data layer unauthenticated; also a SQLi-surface signal.
- **Mandatory fields named like `is_admin` / `is_internal` / `requested_by` / `role_id` / `account_type`** → **authorization derived from client-supplied parameters** — set the privilege flag and you self-elevate. Critical-class.

### 5. Pivot & prove (minimally)
- IDs returned by one endpoint (`account_id`, `order_id`, `deal_id`) are the keys the *other* endpoints consume — they prove the whole router is reachable, not just one route.
- Test `dev-`/`beta-`/`staging-` API variants — they frequently have weaker/disabled auth.
- Check the response headers: `Access-Control-Allow-Origin: *` compounds the issue (any web origin reads it from a victim's browser).
- **STOP at minimum-necessary proof.** A handful of records (or a `totalCount`) confirms the missing check. Do NOT enumerate the table — see `redteam-mindset` data-minimization boundary. The finding is the absent auth, not the data volume.

---

## What "the API behind the SSO login" really means

A common, dangerous architecture:
- `console.target.com` (the SPA) → login is **Entra/Okta/Google OAuth** (looks airtight).
- `api.target.com` (the backend) → some route groups enforce the bearer token, **some route groups forgot the middleware.**

The frontend login is theatre if the API doesn't independently validate the token on every route. Always test the API directly, bare, regardless of how locked-down the login UI is.

---

## Anti-patterns

- **"The app requires login, so the API must be protected."** No — test the API directly, unauthenticated. The whole point.
- **"Minified bundle, can't read it."** You don't need to read it — grep it for hosts/routes/secrets. 5 minutes.
- **"`/api/v1/foo` returned 404, so no API here."** Wrong base or wrong method. Try `/api/`, `/api/v2/`, POST not GET, and the exact route strings from the bundle (Express's 404 echoes the path — use it to calibrate).
- **"AIza key found → critical secret."** Validate first — most are Maps/analytics keys (`CONFIGURATION_NOT_FOUND` on identitytoolkit = not Auth-enabled). Don't over-claim.
- **Dumping the whole dataset once you get a 200.** Stop at PoC. (`redteam-mindset`.)
- **Account-creation / write endpoints as "proof".** Read endpoints prove the auth gap without creating state. Never POST a `create`/`signup`/`upload` to "demonstrate" — that's a destructive write needing explicit per-action authorization.

---

## Related Skills & Chains

- **`hunt-api-misconfig`** — once the API is mapped, run the broader misconfig matrix (method tampering, mass assignment, JWT alg confusion) per route.
- **`hunt-idor`** — the `account_id`/`order_id` pivots feed straight into IDOR testing across discovered routes.
- **`hunt-source-leak`** — sourcemaps (`*.js.map`) reconstruct original source for deeper route/secret extraction; same harvesting muscle.
- **`hunt-nextjs`** — for Next.js targets, layer the middleware-bypass (`x-middleware-subrequest`) and `/_next/data` route tests on top of this.
- **`redteam-mindset`** — the data-minimization boundary governs step 5: prove the missing check, don't exfiltrate the table.
- **`recon-scope-triage`** — verify the API host actually belongs to the target before testing (don't pop a same-named third party's API).

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
