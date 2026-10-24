# Details (moved from SKILL.md)

> Extended reference content for `hunt-auth-bypass`, kept under `references/` so the entrypoint stays within the audit budget.

## Version and evidence limits

Imported CVE/payout/report assertions are leads, not independently verified evidence for this deployment. Pin the actual library version and inspect its configuration. `UserOrNone` forwards anonymously when no user exists; it does not fall back to a client token. `UserOrClient` fallback is an intended capability; excessive downstream privilege requires demonstrated misconfiguration and impact. API and type names vary by release.

## Duende BFF — Token-Confusion & Session-Fixation (2024-2026 surface)

Duende BFF deployments expose two distinct auth-bypass families beyond the CSRF angle covered in `hunt-csrf`. Both are documented architectural realities, not unicorn CVEs.

### Attack class 1 — YARP `UserOrClient` / `UserOrNone` privilege escalation

`Duende.BFF.Yarp` attaches access tokens to proxied routes via `WithAccessToken(TokenType.X)` metadata. The **misconfig pattern**: developer marks a route `UserOrClient` (use user token if logged in, else fall back to *client-credentials* token) intending it for a "public catalog" endpoint. The client-credentials (M2M) token frequently has broader scope (`api.admin`, `internal.read`) than any user token. An **unauthenticated** attacker hitting that route gets the request proxied with the **service-account token attached** to the downstream API — privilege escalation by design when the downstream trusts the bearer.

**Payload shape:** identify a BFF route marked `TokenType.UserOrClient` (visible via 401-vs-200 differential when no session, or via leaked OpenAPI/NSwag spec). Hit it with no cookies → BFF forwards with M2M token granting admin-scope downstream. ([docs.duendesoftware.com/bff/fundamentals/apis/yarp](https://docs.duendesoftware.com/bff/fundamentals/apis/yarp/))

**Adjacent confirmed CVE:** **CVE-2024-51987** in `Duende.AccessTokenManagement.OpenIdConnect` — *"HTTP client uses incorrect token after refresh"* — materially the same family of token-confusion at the proxy layer. Moderate severity, fixed 2024. ([GHSA-...51987](https://github.com/advisories?query=duende))

### Attack class 2 — Broad cookie domains and session integrity

A sibling subdomain may plant a Domain cookie, but an ASP.NET protected ticket
cannot simply be forged without its keys. Planting an attacker's valid session
usually signs the victim into the attacker's account (login CSRF/session
swapping), not takeover of the victim's existing identity. Classic fixation
requires evidence that an attacker-known session remains associated after the
victim authenticates. Use owned accounts and verify the actual identity change.

Sliding expiration is not automatically indefinite: server-side revocation,
absolute limits, OIDC policy and application configuration matter. The user
endpoint supports `slide=false` to avoid extending a configured sliding cookie.
Do not automate stolen-session persistence. Use host-only/__Host- cookies and
appropriate SameSite/Secure/HttpOnly plus session rotation/revocation policy.

### Attack class 3 — `/bff/user` claim disclosure

`GET /bff/user` returns the **full claim set** of the active session as a JSON array — `sub`, `sid`, `email`, `bff:session_expires_in`, `bff:session_state`, `bff:logout_url`, plus every custom claim the OP issued (department, role, internal employee ID, tenant ID). The endpoint is gated only by session cookie + `X-CSRF: 1`. If `AnonymousSessionResponse=Response200` is set, the endpoint also acts as a session probe (200 + claims vs 200 + `null`) usable as an auth-state oracle. Returning the current user’s own intended profile claims is normal behavior, not inherently an information disclosure. A finding requires unauthorized cross-user/cross-origin access or unnecessary sensitive claim exposure. ([docs.duendesoftware.com/bff/fundamentals/session/management/user](https://docs.duendesoftware.com/bff/fundamentals/session/management/user/))

### Evidence strength + reporting tip

No claim about the complete current CVE inventory is established here. The three classes are exploitable via real-world misconfigurations; CVE-2024-51987 and CVE-2025-26620 in the adjacent `Duende.AccessTokenManagement` packages make token-confusion a confirmed family. **Report by chain impact** (e.g., "low-priv session reaches admin-scope downstream API via UserOrClient route" → Critical) rather than by CVE citation, since the issue is design-level.

Cross-references for the chain:
- `hunt-csrf` — the role-partitioned antiforgery class (the CSRF angle on the same BFF surface).
- `hunt-subdomain-takeover` / `hunt-subdomain` — required primitive for the cookie-domain attack.

---


## Function-Level Access Control (Broken Authorization)

Authentication bypass gets you *in*; **function-level access control** failures let an already-authenticated low-privilege user reach privileged *functions* the UI never offered them. This is the authorization sibling of `hunt-idor` (object-level access) — test both whenever you hold any authenticated session.

**The sibling-function rule:** if 9 endpoints under a path enforce auth/role middleware, the 10th that doesn't is your bug. Admin route families are the highest-yield place to look:

```
/api/admin/users   → has auth middleware
/api/admin/export  → often MISSING it
/api/admin/delete  → often MISSING it
/api/admin/reset   → often MISSING it
```

**Anti-patterns to grep for:**
```javascript
// Missing middleware on a sibling route
router.get('/admin/users',  authenticate, authorize('admin'), getUsers);
router.get('/admin/export', getExport);            // No middleware!

// Client-side role check only — server never re-checks
if (user.role === 'admin') showAdminButton();      // frontend gate
app.post('/api/admin/delete', deleteUser);         // no server-side check
```

**How to hunt:** enumerate every privileged endpoint (admin/export/delete/reset/impersonate, GraphQL admin queries), then replay each from a *regular* authenticated session — and again with no session. A 200/differential is a lead; demonstrate unauthorized data or an approved canary action rather than relying on status codes. Avoid destructive delete/reset/impersonate calls during enumeration.

**Real paid example — HackerOne TrustHub:** `POST /graphql` with the `TrustHubQuery` operation had no authorization check — a regular user could read all vendors' data (CVSS 8.7, High). The object-level variant (e.g. a WebSocket `get_history` accepting an arbitrary UUID with no ownership check) belongs to `hunt-idor`.

---


## Related Skills & Chains

- **`hunt-idor`** — Auth bypass without object-level access is half a finding; pair them. Chain primitive: legacy `/v1/users/{id}` route missing both auth middleware AND ownership check = unauthenticated cross-tenant data read via direct ID substitution → minimal synthetic cross-tenant canary read from "I am nobody" starting position.
- **`hunt-ato`** — Auth-bypass primitives feed the ATO funnel. Chain primitive: XMLRPC native-cred acceptance + no rate limit on `wp.getUsersBlogs` → use only two owned test identities and a bounded authorized attempt plan; no breach corpus or mass guessing → verified unauthorized test-account access = ATO bypassing the SSO + MFA the UI enforces.
- **`hunt-sharepoint`** — The SP equivalent of the WordPress XMLRPC pattern lives here. Chain primitive: `/_vti_bin/Authentication.asmx` anonymous reachable + native Forms-auth credential accepted + zero rate limit = unlimited credential brute-force endpoint bypassing custom-branded `customlogin.aspx` protections → FedAuth cookie → full SharePoint farm access.
- **`security-arsenal`** — Pull the JWT-attack payloads section (alg=none, kid path-traversal, JWK injection, RS256→HS256 key confusion) when JWT validation is the auth wall; pull the SAML signature-stripping section when the SP accepts unsigned assertions.
- **`triage-validation`** — Run the Pre-Severity Gate before claiming Critical on an "auth bypass" that only enumerates usernames or only reveals a 401-vs-403 differential. Username enumeration alone without lockout-amplification is consistently N/A or Informational on H1.

