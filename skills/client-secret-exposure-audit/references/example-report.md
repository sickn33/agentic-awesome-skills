# Example Audit Report — Client-Side Secret & Sensitive-File Exposure

**Target:** `https://demo-for-opensource.vercel.app/` (a public, intentionally
vulnerable demonstration app — "Himalayan Vista Hotel")
**Date:** 2026-09-10
**Method:** Unauthenticated `GET` requests only (see `SKILL.md`)
**Scope note:** This is a public demo whose own source states *"All secrets are
fake demonstration values."* It is used here purely to illustrate the report
format the skill produces. Values below are redacted to prefix + length.

## Summary

The site is a static/SPA deployment that ships a large amount of server-side
source, config, and deployment material to the browser, with credentials
scattered across **every layer** — HTML meta tags, hidden DOM elements, HTML
comments, JavaScript bundles, and publicly reachable `server/`, `src/`, and
container files. Additionally, response headers omit the standard security header
set and use permissive CORS.

| # | Severity | Finding | OWASP / CWE |
|---|----------|---------|-------------|
| 1 | Critical | Admin bearer token, JWT secret, DB password & DB URI shipped to the browser | A02 / CWE-798, CWE-522 |
| 2 | Critical | Cloud + payment provider secrets exposed (AWS, Stripe/Khalti secret keys, webhook signing secret) | A02 / CWE-798, CWE-200 |
| 3 | High | Server-side source, config & deploy files publicly reachable | A05 / CWE-540, CWE-527 |
| 4 | High | reCAPTCHA **secret** key placed in an HTML `<meta>` tag | A02 / CWE-798 |
| 5 | Medium | Missing security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | A05 / CWE-693 |
| 6 | Medium | Permissive CORS (`Access-Control-Allow-Origin: *`) | A05 / CWE-942 |
| 7 | Medium | Insecure randomness for booking references (`Math.random()`) | A02 / CWE-338 |
| 8 | Low/Info | Third-party tokens & analytics IDs in client JS; verbose `console.log` of keys | A09 / CWE-532 |

---

## Findings

### 1 — Critical: Admin token, JWT secret, DB password shipped to the browser

- **Location:** `public/assets/js/config.js` (loaded on every page); mirrored in
  `src/config/app.config.js`.
- **Evidence (redacted):** `ADMIN_TOKEN = "eyJhbGciOiJ…" (JWT, role=operations)`,
  `JWT_SECRET = "eyJhbGciOiJ…"`, `API_SECRET = "hvh_live_s3c37_…" (28 chars)`,
  `DATABASE_PASSWORD = "Vista#…!" (16 chars)`, plus a hidden `<div>` JSON blob
  containing `mongodb+srv://hvh-backend:****@cluster0.…/hvh_prod`.
- **Impact:** Anyone can read an admin bearer token, the JWT signing secret
  (allowing forged tokens for any role), the API secret, and DB credentials — full
  data-tier compromise if these were live.
- **Remediation:** Never place secrets in client bundles. Keep secrets server-side
  in a secrets manager / env vars; expose only publishable keys to the browser.
  **Rotate every value** — anything served is already compromised.

### 2 — Critical: Cloud & payment provider secrets exposed

- **Location:** HTML hidden `<div data-aws-access / data-aws-secret>` and
  `data-webhook-secret`; `src/services/payment.service.js`; `docker-compose.yml`.
- **Evidence (redacted):** `AKIA…EXAMPLE` + AWS secret; Stripe `sk_test_51Qf4…`;
  Khalti `live_secret_key_…`; `whsec_a9f4…`; Redis `redis://…:7fK9…@cache:6379`.
- **Impact:** Server-side payment secret keys and a webhook signing secret in the
  client allow forging payment intents and spoofing signed webhook events; the
  Redis password enables cache/session tampering — if live.
- **Remediation:** Move all provider secret keys server-side; only `pk_*`
  publishable keys belong in the browser. Rotate all exposed keys and secrets.

### 3 — High: Server-side source, config & deploy files publicly reachable

- **Location (confirmed real via size ≠ SPA fallback):** `/server/index.js`,
  `/server/routes/{booking,payment,review,webhook}.routes.js`,
  `/src/config/app.config.js`, `/src/services/{payment,booking}.service.js`,
  `/docker-compose.yml`, `/Dockerfile`, `/public/assets/js/config.js`.
- **Evidence:** Each returns a distinct body size from the SPA catch-all page and
  contains real source/config (route definitions, internal service tokens such as
  `hvh_svc_…`, container build details).
- **Impact:** Exposes internal architecture, endpoints, auth/rate-limit middleware
  names, and embedded credentials — a blueprint for further attack.
- **Remediation:** Deploy only build output (`public/` + `index.html`). Exclude
  `server/`, `src/`, and deploy files from the published artifact (`.vercelignore`
  / correct build root). Serve 404 for non-asset paths instead of leaking files.

### 4 — High: reCAPTCHA secret key in an HTML meta tag

- **Location:** `<meta name="recaptcha-secret" content="6LcVo3kq…">` in `index.html`.
- **Evidence:** The **secret** (server-verification) key is in page markup
  alongside the site key.
- **Impact:** The reCAPTCHA secret is server-only; exposing it lets attackers
  script verification and undermines bot protection.
- **Remediation:** Remove the secret from all client output; keep only the site
  key client-side. Regenerate the reCAPTCHA keypair.

### 5 — Medium: Missing security headers

- **Location:** Main response headers for `/`.
- **Evidence:** No `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, or `Permissions-Policy`.
  (`Strict-Transport-Security` **is** present — good.)
- **Impact:** Increased XSS, clickjacking, MIME-sniffing, and referrer-leak risk.
- **Remediation:** Add a strict CSP, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `Referrer-Policy:
  strict-origin-when-cross-origin`, and a least-privilege `Permissions-Policy`
  (e.g. via `vercel.json` headers).

### 6 — Medium: Permissive CORS

- **Location:** Response header `Access-Control-Allow-Origin: *`.
- **Impact:** Any origin can read responses; dangerous if any endpoint returns
  user/authenticated data.
- **Remediation:** Restrict `Access-Control-Allow-Origin` to trusted origins;
  never combine `*` with credentialed requests.

### 7 — Medium: Insecure randomness for booking references

- **Location:** `src/services/booking.service.js` — `randomRef()` uses
  `Math.random()`; `fetchAvailabilityHold` builds predictable `HOLD-<room>-<date>`
  ids.
- **Impact:** Predictable/guessable references enable enumeration of bookings/holds.
- **Remediation:** Use a CSPRNG (`crypto.randomUUID()` / `crypto.randomBytes`) for
  any security-relevant identifier.

### 8 — Low/Info: Third-party tokens & noisy logging

- **Location:** `main.js` (Mixpanel/Hotjar/OpenWeather/Freshdesk/Zendesk tokens,
  `console.log` of keys); `api/client.js` (`console.log` note, static
  `X-Rate-Limit-Bypass` header value).
- **Impact:** Some of these (weather/analytics) are lower-risk, but support-desk
  tokens and a rate-limit-bypass header value are sensitive; logging keys to the
  console aids attackers.
- **Remediation:** Remove secret logging; move non-public tokens server-side;
  never ship a "rate-limit-bypass" value to the client.

---

## Prioritized Remediation

1. **Rotate immediately** (were they live): admin/JWT/API secrets, DB password &
   URI, AWS keys, Stripe/Khalti secret keys, webhook & payment signing secrets,
   Redis password, reCAPTCHA secret, internal service tokens.
2. **Stop shipping server code:** publish only `public/` + `index.html`; exclude
   `server/`, `src/`, and deploy files from the deployment artifact.
3. **Remove all secrets from client output** (JS, HTML meta/`data-*`/comments);
   keep only publishable keys in the browser.
4. **Add the security-header set** and tighten CORS via `vercel.json`.
5. **Replace `Math.random()`** with a CSPRNG for any security-relevant value.
6. **Remove secret `console.log`** statements and client-side bypass headers.

> Reminder: this target is a public teaching demo with intentionally fake
> secrets. The same findings on a real deployment would be treated as an incident,
> starting with credential rotation.
