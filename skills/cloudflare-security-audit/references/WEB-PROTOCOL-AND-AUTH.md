# HTTP-Protocol and Authentication Hunting

#### When to use this file

Reach for this file when the target speaks HTTP at a layer where parsing, caching, or identity decisions happen: reverse proxies, CDNs, API gateways, load balancers, custom HTTP servers and parsers, and any app that builds responses or URLs from request metadata — and whenever it implements or consumes an auth protocol (sessions, JWTs, OAuth/OIDC, SAML, or password-reset flows). These are the classes `ATTACK-CLASSES.md` treats only in passing: the injection class covers *content*, but not the request/response framing or the identity-token machinery, which have their own specific, high-hit-rate bug patterns.

Use alongside `ATTACK-CLASSES.md`. Access control there answers "is the check present and correct"; this file answers "can the attacker forge, replay, or confuse the identity the check runs on, or desync the request the check applies to."

Pick the relevant classes based on Phase 1; split per subsystem (framing/proxy layer, token verification, session store) for large targets. A pure single-server app behind a managed CDN has little smuggling surface; a custom proxy or a service that trusts `X-Forwarded-*` has a lot.

## Core discipline (include in every agent prompt for this domain)

```
- Framing bugs live in DISAGREEMENT, not in one parser. Request smuggling and cache poisoning exist because two components interpret the same bytes differently. Find the two components and the byte they disagree on; a single correct parser in isolation is not the finding.
- A signature you don't verify is decoration. For every token (JWT, SAML, cookie), find the exact line that verifies the signature AND the claims that apply to that token type (for JWT/OIDC: exp, aud, iss, nonce) — and that the algorithm is pinned server-side, not read from the token header. "It's signed" means nothing if nothing checks the signature with the right key and algorithm.
- Every use of Host, X-Forwarded-*, Forwarded, or a request-derived URL is a trust decision. Trace it to what it controls: a reset link, a cache key, a redirect, an access check.
- Reflected input in a security-relevant response field (Set-Cookie, Location, cache key, an absolute URL sent to a victim) — trace it to a cross-user impact (poisoned cache entry, redirect or token sent to a victim, cookie set in another context) even when it isn't classic XSS.
```

## HTTP request-framing attack classes (subagent_type: `general`)

**Request smuggling / desync**
A discrepancy in how two components (front proxy vs back-end, or HTTP/2 front vs HTTP/1.1 back) resolve message length. Classic forms: CL.TE, TE.CL, TE.TE (obfuscated `Transfer-Encoding`), and H2 downgrade (H2.CL / H2.TE) where an HTTP/2 front-end forwards to an HTTP/1.1 back-end and the injected `Content-Length`/`Transfer-Encoding` or CRLF in a header value survives. Audit angle: any component that parses HTTP messages itself, forwards requests, or normalizes headers. Look for lenient length handling (accepting both CL and TE, tolerating whitespace/casing/duplicates in `Transfer-Encoding`), and CRLF-in-header-value passthrough on the HTTP/2→1.1 hop. The prize is a request prefix that gets glued onto the *next* user's request.

**Web cache poisoning (unkeyed input)**
An input influences the response but is not part of the cache key, so the attacker's response is stored and served to others. Find the cache key construction, then find every input that changes the response body/headers but is absent from that key — `X-Forwarded-Host`, `X-Forwarded-Scheme`, custom headers, cookies stripped from the key, or a query param the key normalizes away. Reflected unkeyed input that lands in the cached body (a poisoned script src, an `<base href>` from `X-Forwarded-Host`) is stored XSS against every cache consumer.

**Cache deception**
Path/extension confusion that makes a dynamic, per-user page get cached as if it were a static asset (`/account/profile.css`, `/api/me;.js`, path-parameter tricks). The back-end serves the user's private page; the cache stores it under a path the attacker can then request. Trace how the cache decides "is this cacheable" versus how the app routes the path — the gap is the bug.

**Host-header and forwarded-header trust**
`Host` / `X-Forwarded-Host` used to build absolute URLs, routing, or cache keys. The highest-impact sink is password-reset / verification link construction: attacker sets the header, the victim receives a link to the attacker's domain, clicks, and leaks the token. Also: authentication or routing decisions keyed on a spoofable forwarded header.

**CRLF / response header injection**
User input reflected into a response header (`Location`, `Set-Cookie`, custom headers) with unescaped CR/LF, letting the attacker inject headers or split the response. Trace user input into any header-setting call; confirm the framework doesn't already strip CR/LF (many do — verify first, see #5).

## Authentication-protocol attack classes (subagent_type: `general`)

First establish which role the target plays — it determines whose duty each control is. `redirect_uri` allowlisting, PKCE enforcement, authorization-code issuance, and assertion signing belong to the **authorization server / IdP**; a **relying-party client** legitimately sends its own `redirect_uri` and consumes tokens, so do not report "no `redirect_uri` allowlist" or "issues codes without PKCE" against a client. Token *verification* defects (below) apply to whichever side validates the token.

**JWT verification defects**
The densest source of auth bypasses. Check, in the verification code:
- **`alg` confusion** — `alg: none` accepted, or RS256→HS256 where the server verifies an attacker-forged HS256 token using the *public* key as the HMAC secret. Find where the algorithm is chosen: is it taken from the token header (attacker-controlled) or pinned server-side?
- **Decode without verify** — code that reads claims from a decoded token but never calls the verify function, or ignores its return/exception.
- **Missing claim checks** — `exp` (expiry), `nbf`, `aud` (audience — token for service A replayed at service B), `iss` (issuer). A signature check without claim checks is half a check.
- **Key-selection injection** — `kid`, `jku`, or `x5u` header taken from the token: `kid` used in a file path (traversal) or SQL (injection) to fetch the key, or `jku` pointing at an attacker-hosted JWK Set / `x5u` at an attacker-hosted X.509 cert chain. Attacker names the key that verifies their own forgery.
- **Weak/shared secret** — HMAC secret that's a guessable string or shared across trust domains.

**OAuth / OIDC flow defects**
- **`redirect_uri` validation** — substring/prefix matching, open-redirect on an allowlisted host, or `redirect_uri` not bound to the client. Leaks the authorization code to the attacker.
- **Missing/weak `state`** — no CSRF token on the callback → login CSRF / forced-login / session fixation of the OAuth flow. (`state` is a session-binding/CSRF control; authorization-code injection is prevented by PKCE and the OIDC `nonce`, not by `state` — don't conflate them.) Confirm `state` is generated, bound to the session, and verified on return.
- **PKCE** — missing on public clients, or `code_verifier` not actually checked against `code_challenge`.
- **`id_token` validation** — audience, issuer, signature, and `nonce` all verified? A token minted for another client accepted here is account takeover.
- **Mix-up / IdP confusion** — multi-IdP flows where the response isn't bound to the IdP the request went to.

**SAML assertion defects**
- **Signature wrapping (XSW)** — a signed assertion plus an injected unsigned one; the verifier checks the signature on one element but reads identity from another. Find the gap between "what is signature-verified" and "what is read as the authenticated identity."
- **Signature exclusion** — unsigned assertions accepted, or signature verification skippable via a flag/empty-signature path.
- **XXE / DTD** in the XML parser processing assertions.
- **Comment truncation** — a comment inserted into the signed NameID (`admin@company.com<!---->.attacker.com`) that canonicalization strips before the signature check (so it still validates) but that truncates identity extraction to the pre-comment text (`admin@company.com`, the victim). Same root as XSW: the bytes the signature covers ≠ the bytes read as identity.
- **Missing replay / binding checks** — even with a valid signature, is the assertion bound and fresh? Check `NotBefore`/`NotOnOrAfter` (validity window), `Recipient`/`Audience` (assertion minted for *this* SP, not replayed from another), `InResponseTo` (bound to a real outstanding request — blocks unsolicited-response injection), and one-time-use (a replayed assertion rejected). The signature checks above prove the assertion wasn't forged; these prove it wasn't stolen and replayed.

**Session-management defects**
- **Fixation** — session identifier not rotated on privilege change (login, step-up auth). Attacker fixes a known ID, victim authenticates into it.
- **Weak invalidation** — session/token still valid after logout, password change, or revocation; server-side state not cleared (especially stateless JWT sessions with no revocation list).
- **Predictable identifiers** (non-CSPRNG session IDs an attacker can guess/derive), or an overly broad cookie `Domain` that leaks the session cookie to an attacker-controlled sibling subdomain. (Bare "cookie could be shorter-lived" with no leakage path is a hardening note, not a finding.)

**Password-reset / account-recovery defects**
- Token not cryptographically bound to the user (reset A's token, use it on B), predictable/short token, no single-use or expiry, token leaked via `Host` header (see above) or `Referer`, or a race that mints multiple valid tokens. Recovery flows are frequently the weakest path to the strongest impact (account takeover).

## Universal moves (apply across the above)

- **Diff duplicated request paths side by side.** Where the code has more than one thing that parses or forwards HTTP (a middleware plus the framework, a normalizer plus the router, a legacy API version plus the current one), read them together and feed each the same ambiguous bytes on paper. Divergence is the smuggling/desync bug.
- **Walk the whole token lifecycle.** Issue → store → transmit → verify → refresh → revoke. The bugs live in the transitions the happy path skips: a session still valid after logout, a refresh that never re-checks revocation, a reset token that survives a password change.
- **Enumerate every door to the same identity.** SSO, password login, API key, password reset, impersonation — each is a parallel path that mints a session. The weakest one sets the account's real security; a hardened login means nothing if reset is trivial.
- **Audit the compat/fallback path.** A legacy endpoint version, a deprecated header, or a "for old clients" branch that skips a guard the main path added. Old auth code is where the reverted or forgotten check hides.

## Validation rules (apply before reporting ANY finding here)

1. **Source-visibility gate — this domain lives partly outside the repo.** Framing bugs (proxy chain), cache poisoning/deception (cache-key config), secret strength, and token entropy frequently depend on components, config, or values NOT in the audited tree. If confirming the bug requires a component/config/secret you cannot read, it is **unverifiable from source: flag it "requires deployment testing" and do NOT report it as a confirmed finding.** "Downgrade" is not enough — an unconfirmable HIGH reported as a MEDIUM is still a false positive.
2. **For framing/cache findings, name both components and the divergent parse.** "The Go net/http back-end accepts a bare-LF `Transfer-Encoding` that the front proxy treats as CL" — not "smuggling may be possible." A single server with no proxy in front has no smuggling surface. If you've confirmed only the in-repo half (the back-end genuinely mishandles a specific ambiguous input — bare-LF `Transfer-Encoding`, duplicate CL), record it as a lead with the exact bytes — "requires paired front-end testing" — a real observation, not a severity-rated finding.
3. **For token findings, cite the verification line and what it fails to check.** Point at the `verify`/`decode` call and the missing `alg` pin / `aud` check / signature step. A forged-token claim requires showing the server would accept the forgery, not just that JWTs are in use. Establish the client-vs-server role first — don't fault a client for controls the server owns.
4. **Prove the cross-user impact.** Show the payload reaching a victim's response (cache), request (smuggling), session (fixation), or inbox (reset link). Attacker-only effects are not findings: a `Host` header reflected into a self-referential link the victim never receives out-of-band is a hardening note; a `Host` header controlling a reset link emailed to the victim is a finding.
5. **Verify the framework AND the library default don't already handle it.** Many stacks strip CR/LF from headers, rotate sessions on login, and key caches on `Host` by default; JWT libraries increasingly reject `alg:none` and require an explicit algorithm list — check the library and version, and if you cannot determine the default, treat it as unverifiable rather than assuming it's vulnerable. Only report secret/RNG weakness when the code itself sets a hardcoded/short/derivable value or uses a non-CSPRNG. Confirm the specific defense is absent — do not report a gap the framework or library already closes.
6. **Return ONLY confirmed findings** with the divergent parse or the skipped verification step and the cross-user impact — or "No exploitable protocol/auth issues found" if that's honest.
