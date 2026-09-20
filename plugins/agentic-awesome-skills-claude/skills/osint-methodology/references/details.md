# Details (moved from SKILL.md)

> Extended reference content for `osint-methodology`, kept under `references/` so the entrypoint stays within the audit budget.

## 8. Asset Graph Discipline

Treat every discovery as a typed asset in a graph, not a free-floating string.

### 8.1 Asset Taxonomy (29 types)

| Category | Asset Types |
|---|---|
| **DNS / Network** | `domain`, `subdomain`, `ip`, `netblock`, `asn` |
| **Service** | `port`, `service`, `certificate` |
| **Identity** | `email`, `person`, `credential` |
| **Code / Config** | `repo`, `secret` |
| **Cloud / Storage** | `bucket`, `firebase_project` |
| **Web** | `webapp`, `wayback_endpoint`, `api_endpoint`, `api_spec`, `graphql_schema` |
| **Mobile** | `mobile_app`, `deep_link`, `exported_component` |
| **Phishing / Adversarial** | `typosquat_domain` |
| **Collaboration / SaaS** | `postman_collection`, `postman_workspace`, `postman_api_key`, `stack_post`, `saas_public_surface` |

### 8.2 Asset Schema

Every asset carries:
- `type` — one of the 29 above.
- `key` — unique dedup id (typed prefix, e.g. `sub:api.example.com`, `email:alice@example.com`).
- `value` — the actual string/object.
- `sources[]` — every source that confirmed this asset (deduplicated).
- `confidence` — TENTATIVE / FIRM / CONFIRMED.
- `first_seen`, `last_seen` — UTC timestamps.
- `attrs{}` — type-specific metadata (e.g., for a `webapp`: status_code, title, tech-stack list, JARM, favicon mmh3, screenshot path).

### 8.3 Edge Taxonomy

Relationships are typed edges, not text:
`RESOLVES_TO`, `HOSTED_ON`, `IN_NETBLOCK`, `BELONGS_TO_ASN`, `LISTED_IN_CERT`, `OWNED_BY`, `ALIAS_OF`, `BREACHED_FROM`, `EMPLOYED_BY`, `HOSTS_REPO`, `TYPOSQUAT_OF`, `EXPOSES`, `DOCUMENTED_BY`, `BELONGS_TO_HOST`, `REQUIRES_AUTH`, `LEAKS_SCHEMA`, `SHIPPED_BY_ORG`, `CONTAINS_SECRET`, `TALKS_TO_HOST`, `EXPOSES_DEEPLINK`, `HAS_EXPORTED_COMPONENT`, `USES_FIREBASE_PROJECT`, `LACKS_PINNING_FOR`.

### 8.4 Discipline rules

- **Every discovery is an asset.** Don't write findings against free-floating strings; create the asset first, then attach the finding.
- **Dedup by key, not by value.** Same value, different type ≠ same asset (`sub:api.example.com` and `webapp:https://api.example.com/` are different assets with a `BELONGS_TO_HOST` edge).
- **Provenance is non-negotiable.** `sources[]` must list every source. If two sources confirmed it, both go in.
- **Confidence is per-source, then aggregated.** A subdomain returned by 3 passive sources is FIRM; one returned by snippet-only Bing is TENTATIVE.
- **Late binding via sidecars.** When module A produces output that module B needs, write a JSON sidecar (`mobile_endpoints.json`, `secrets_sidecar.json`) — don't block module B on module A. See §24.

### 8.5 Asset-Level Triage Rules

When you have a mixed bag of assets and limited probe budget, prioritize by what each asset *enables*:

**WebApp priority by hostname signal (highest first):**

1. Auth-related hostnames (`auth.`, `login.`, `sso.`, `idp.`, `accounts.`, `oauth.`).
2. Admin paths (`/admin`, `/dashboard`, `/console`, `/manager`, `/wp-admin`, `/phpmyadmin`).
3. Dev/staging hosts (`dev.`, `staging.`, `stg.`, `qa.`, `uat.`, `test.`, `sandbox.`, `preprod.`, `preview.`) — lower defenses, often dump prod data.
4. API hostnames (`api.`, `services.`, `gateway.`, `graph.`).
5. Customer-facing hostnames (`portal.`, `app.`, `my.`, `account.`).
6. Marketing / content (`www.`, `blog.`, `news.`, `careers.`, `support.`).

**Subdomain priority by inferred function:**

- API > Admin > Dev > Auth > Prod-app > Marketing.

**IP priority by netblock:**

- Corporate ASN-owned (most likely to host unadvertised internal infra).
- Cloud netblocks (AWS / GCP / Azure / DO / OVH) — high turnover but interesting for cloud-native services.
- CDN ranges (Cloudflare / Akamai / Fastly) — usually edge, not origin; defer unless doing origin discovery.

**Email priority by role hint:**

| Role indicator | Priority | Why |
|---|---|---|
| `ceo@`, `cfo@`, `cto@`, `ciso@` | HIGHEST | Exec accounts have highest breach value (BEC, finance authority, board access). |
| `it@`, `helpdesk@`, `support@`, `security@` | HIGH | IT/security accounts have privileged tool access; helpdesk accounts handle reset workflows. |
| `dev`, `engineer`, `architect`, `dba` | MEDIUM | Developer accounts often have GitHub / cloud / CI access. |
| `sales`, `marketing`, `hr`, `finance` | MEDIUM | SaaS access (Salesforce, HubSpot, Workday); finance enables BEC. |
| Generic role accounts (`info@`, `noreply@`, `contact@`) | LOW | Often unmonitored or alias forwarded; less personal context. |

**Repo priority by recency + naming:**

- Recently-pushed (last 30 days) > stale.
- Public repo with target name in description > target name only in code.
- Forked from internal-looking parent > standalone.
- Mentions `prod`, `internal`, `private`, `secret` in name → priority HIGH despite being public (may be misnamed or accidentally exposed).

**Application order:** when you have N assets and budget for M probes (M < N), apply asset-type priority first, then within-type priority. E.g.: 50 subdomains → probe API + admin + dev first (~15), then auth + prod-app (~20), defer marketing/content to a later pass.

---


## 9. Findings Rubric & Severity Mapping

Severity is operational, not subjective. Use these anchors:

### 9.1 CRITICAL

Pre-auth code execution, confirmed valid credentials, listable production data, fundamental trust violations.

Examples:
- `.git/config` exposed on production webapp (full source-code disclosure).
- `/.env` exposed (credentials in plaintext, often DB / cloud / API).
- Spring Boot `/actuator/env` or `/actuator/heapdump` reachable unauthenticated.
- Listable S3 / GCS / Azure bucket containing user data.
- Unauthenticated POST/PUT/DELETE to a write endpoint that mutates state.
- Open Firebase Realtime Database (`https://{project}.firebaseio.com/.json` returns data).
- `android:debuggable=true` in a production Android app.
- Live-validated credential (PMAK, AWS key, Anthropic/OpenAI key) with broad scope.
- ≥10 employees compromised in a breach corpus + their tenant identified (SSO_EXPOSURE).
- Open Elasticsearch cluster (`/_cat/indices` returns data).
- Open Docker API (`/v1.40/containers/json` returns containers).
- Open Redis (no AUTH; can write `authorized_keys`).
- Open Kubernetes API server with anonymous-auth enabled.
- Open kubelet on 10250 (pod exec without auth).
- Open etcd on 2379 (cluster state and secrets).
- BlueKeep-vulnerable RDP, EternalBlue-vulnerable SMB.
- Citrix Netscaler / F5 BIG-IP with version-specific RCE CVE.

### 9.2 HIGH

Significant exposure but not yet RCE; clear path to escalation; high-value information disclosure.

Examples:
- Public secret in a GitHub repo (PAT, AWS key, Slack token, etc.).
- Sourcemap (`.js.map`) accessible — full original-source disclosure of frontend.
- Open GraphQL introspection on production (full schema leaked → mutations to enum).
- Subdomain takeover possible (CNAME points to unclaimed Heroku/Shopify/etc.).
- Reflected CORS with credentials (`Access-Control-Allow-Origin: <reflected>` + `Access-Control-Allow-Credentials: true`).
- Verb tampering: hidden DELETE/PATCH on an endpoint that publicly only allows GET.
- Missing HSTS on a sensitive path (`/login`, `/sso`, `/admin`, `/auth`) — escalated from MED.
- Exposed Jenkins/Tomcat-Manager/phpMyAdmin admin UI (no auth or default creds).
- Telnet (port 23) reachable.
- WebView with JS bridge in a mobile app (XSS → RCE potential).
- Sensitive deep-link handler in a mobile app.
- DMARC policy `p=none` on production sending domain (spoof-feasible).
- Vendor product banner with known unpatched CVE (KEV-listed).

### 9.3 MEDIUM

Information disclosure, hardening gaps, brute-force exposure.

Examples:
- Missing security headers on standard pages: HSTS, CSP.
- Apache `/server-status` or `/server-info` reachable.
- `phpinfo()` or `/info.php` reachable on dev/staging only.
- Internal IP / hostname / K8s service DNS leaked in JS.
- Schema leakage in error pages (stack traces, ORM signatures).
- `android:allowBackup=true` in Android app.
- `android:usesCleartextTraffic=true` in Android app.
- Exported activity/service without `android:permission` protection.
- Missing rate-limit on an API endpoint.
- Wildcard CORS (`Access-Control-Allow-Origin: *`) on an API that returns user-tied data (no creds).
- Slack webhook URL leaked.
- Twilio Account SID leaked (without auth token).
- SPF record permissive (`+all` or many includes).

### 9.4 LOW

Cosmetic or marginal hardening gaps.

Examples:
- Missing `X-Frame-Options`.
- Missing `X-Content-Type-Options`.
- `.DS_Store` exposed.
- Stripe **test** key leaked.
- Firebase URL exposed (URL only, no open RTDB).
- Certificate pinning missing in mobile app.
- Outdated WordPress install detected (no known exploit yet).
- BIMI not configured (brand impersonation risk only).

### 9.5 INFO

Worth recording, no action required immediately.

Examples:
- Missing `Referrer-Policy` / `Permissions-Policy`.
- Discovered `/.well-known/security.txt`.
- `robots.txt` reveals interesting paths.
- Private bucket exists but is locked down.
- Domain detected in a breach corpus with 0 employee accounts.
- DNSSEC not enabled.

### 9.6 Severity escalation rules

- HSTS missing on auth/login/SSO/admin path → **MED → HIGH**.
- Wildcard CORS + credentials → **MED → HIGH**.
- Wildcard CORS + sensitive endpoint → **LOW → MED**.
- API endpoint with score ≥70 on the interest rubric (companion skill §20) → at least **HIGH**.
- Domain breach severity ≥10 employees → **CRITICAL** regardless of stale-data caveats.
- Vendor product version matches CISA KEV entry → **CRITICAL**.
- DMARC `p=reject` + SPF strict + DKIM rotated → no escalation; well-postured.

---


## 10. Bug-Bounty / Red-Team Pivot Modes

Existing investigative work (threat-actor research, doxxing investigations, attribution) operates under different posture than offensive recon. Switch posture explicitly.

| Aspect | Investigative Mode | Offensive Recon Mode |
|---|---|---|
| **Probing rate** | Slow, single-threaded, blend with normal traffic. | Bursts, parallel, but rate-limited per provider. |
| **OpSec posture** | Sock-puppet only, never reveal investigator. | Persona may be the engagement persona; team may notify SOC. |
| **Evidence handling** | Court-grade chain of custody; hashes, timestamps, screenshots. | Engagement-grade; same hashing/timestamp discipline but evidence is for the client report. |
| **Severity in scope** | All severity levels relevant for context. | CRIT/HIGH/MED matter; LOW/INFO often dropped from exec summary. |
| **Authorization posture** | Public-record / OSINT-only; no probing private resources without authorization. | Written rules of engagement; explicit scope; explicit out-of-scope list. |
| **Reporting format** | Narrative + sourced timeline. | Per-asset findings + remediation + reproduction steps. |
| **Stop conditions** | When the question is answered. | When the engagement window closes OR when the report is delivered. |

When you're working with the user, ask which mode they're in if it's unclear from context.

### 10.1 Scale-Based Tactics

Org size shapes which techniques pay off.

**Small org (< 100 employees):**
- Executive accounts disproportionately matter; one CEO/CFO compromise often hands you the keys.
- Email harvest is small enough to enumerate exhaustively (10–50 emails total).
- Likely Microsoft 365 or Google Workspace; identity fabric is one tenant.
- Code repos often public on GitHub under personal accounts (founders moved from solo dev).
- Cloud presence often single-account AWS or GCP project.
- Tactics: deep on every email + every identity-fabric finding; full LinkedIn enum; check founders' personal GitHub orgs.

**Medium org (100–1K):**
- Balanced enumeration. Email list is enumerable but not exhaustive.
- Identity fabric likely one IdP but with multiple SaaS tenants (Slack workspace, Notion org, GitHub org).
- Mobile apps possible; check both stores.
- Cloud presence multi-account or multi-region.
- Tactics: full pipeline at standard depth; sample-and-deepen on each asset class; LinkedIn priority by role.

**Large org (1K–10K):**
- Email enum becomes lossy (sample top roles); breach hits scale up.
- Multi-tenant identity fabric (often Entra + Okta + multiple Auth0 customers).
- Mobile apps, multiple Android packages from different teams.
- Cloud presence sprawling; subsidiaries / acquisitions complicate scope.
- Tactics: breadth-first; rely on automation for asset discovery; manual triage on findings.

**Very large org (10K+) or conglomerate:**
- Brand-pivot maps before anything else: enumerate every brand domain, every subsidiary.
- Breach corpus dominates: 10K+ employees mean significant past-breach exposure.
- Identity fabric may differ per business unit (legal entity boundaries).
- Tactics: scope pruning is the most important step; sampling + automation throughout; deep dive only on high-priority findings.

**Cross-scale principle:** the smaller the org, the more individual-account focus pays off. The larger the org, the more systemic posture findings (DMARC gaps, SSO_EXPOSURE breadth, vendor-product version sweeps) pay off.

---


## 11. Identity Fabric Mapping

An organization's IdP/SSO posture is a high-value target: compromise the identity fabric and you don't need to break into individual apps. Map it methodically.

### 11.1 Subdomain prefix enumeration

Probe these prefixes against the target's root domain (and any sibling brand domains discovered):

```
auth.{domain}
login.{domain}
sso.{domain}
idp.{domain}
iam.{domain}
identity.{domain}
accounts.{domain}
oauth.{domain}
```

Plus generic OIDC discovery on every alive subdomain:
```
{any-host}/.well-known/openid-configuration
```

### 11.2 Microsoft Entra (Azure AD)

- **OIDC metadata + tenant GUID extraction** — fetch `https://login.microsoftonline.com/{tenant-or-domain}/.well-known/openid-configuration`. The `issuer` field returns a URL containing the tenant GUID (8-4-4-4-12 hex format). Tenant GUID + domain = stable tenant fingerprint.
- **getuserrealm.srf** — `https://login.microsoftonline.com/getuserrealm.srf?login=<user>@<domain>` returns NameSpaceType: `Managed` (cloud-native), `Federated` (on-prem ADFS / external IdP), or `Unknown`. Detectability: low.
- **Autodiscover v2** — `https://autodiscover-s.outlook.com/autodiscover/metadata/json/1` POST with email; detects tenant membership.
- **GetCredentialType** (deep-mode user-enum) — `https://login.microsoftonline.com/common/GetCredentialType` POST `{"username": "<email>"}`. Response indicates whether email exists in tenant. Detectability: medium. Cap attempts at 20 per tenant.

### 11.3 Okta

- **Org slug derivation** — derive candidate slugs from subdomains + root domain stem; Okta tenants live at `<slug>.okta.com` (or `<slug>.oktapreview.com`).
- **OIDC fingerprint** — `https://<slug>.okta.com/.well-known/openid-configuration`.
- **/api/v1/authn user-enum** (deep-mode) — POST `{"username": "<email>", "password": "invalid"}`. 400 vs 401 response code indicates user existence. Detectability: medium. Cap at 20 per tenant.

### 11.4 ADFS

- **Passive fingerprint** — GET `https://{domain}/adfs/idpinitiatedsignon.aspx` → 200 indicates ADFS present.
- **Active mex endpoint** (deep-mode) — `https://{domain}/adfs/Services/Trust/mex` returns SOAP metadata.

### 11.5 Google Workspace

- `https://{domain}/.well-known/openid-configuration` — Google-hosted-domain customers expose discovery endpoints with characteristic issuer/JWKS URIs.
- MX records pointing to `*.googlemail.com` / `aspmx.l.google.com` is a strong Google Workspace signal.

### 11.6 Generic OIDC (Keycloak / Auth0 / Ping / OneLogin / Duo)

- Probe every alive subdomain for `/.well-known/openid-configuration`.
- The `issuer` and `authorization_endpoint` fields fingerprint the IdP product.
- `*.auth0.com`, `*.onelogin.com`, `*.pingone.com`, `*.duosecurity.com` patterns are characteristic.

### 11.7 SAML metadata

Probe these paths on every alive webapp:

```
/saml/metadata
/FederationMetadata/2007-06/FederationMetadata.xml
/federationmetadata/2007-06/federationmetadata.xml
/simplesaml/saml2/idp/metadata.php
/auth/saml2/metadata
```

SAML metadata XML contains: `EntityID`, signing certs, `SingleSignOnService` URL, `NameIDFormat`.

### 11.8 AWS account-ID extraction

- **S3 bucket region header** — HEAD on a known target bucket returns `x-amz-bucket-region`; correlate with bucket-name entropy to infer account.
- **ARN regex in JSON / HTML responses** — search for `arn:aws:[a-z0-9-]+:[a-z0-9-]*:([0-9]{12}):` (the 12-digit AWS account ID is the capture group).
- **`AccountId` property in JS / API responses** — common in IAM-related error messages and CloudFormation outputs.
- **OAuth client_id leaks** — Google OAuth: `<digits>-<chars>.apps.googleusercontent.com`; MSAL: GUID in `clientId` property.

### 11.9 Output

Each discovered IdP becomes a `Service` asset with `attrs.product`, `attrs.tenant_id`, `attrs.discovery_endpoint`. Then in Stage 4, correlate with breach data: every compromised user under a discovered tenant becomes an SSO_EXPOSURE finding (CRITICAL — see §22.3).

### 11.10 Microsoft 365 Deep Surface

Beyond plain Entra fingerprinting, M365 exposes a wider attack surface that's worth enumerating in depth.

**Teams Federation:**

- `https://login.microsoftonline.com/<target-domain>/.well-known/openid-configuration` confirms tenant.
- Teams federation status: `https://teams.microsoft.com/api/mt/<region>/beta/users/<email>/externalsearchv3` (requires authenticated request from a federated tenant; useful for confirming whether external Teams chat is allowed).
- **External chat enabled** = soft-attack surface (vishing, smishing, "from-IT" pretexts via Teams chat).
- **Open Federation** (any tenant can chat) is the default; check whether the target restricted it.

**SharePoint subdomains:**

- `<target-stem>.sharepoint.com` — main tenant SharePoint.
- `<target-stem>-my.sharepoint.com` — OneDrive-for-Business URLs (per-user personal sites).
- `<target-stem>-admin.sharepoint.com` — SharePoint admin center (auth-required, but presence confirms tenancy).
- Where `<target-stem>` is derived from the company name (often the part before `.com`).

**OneDrive personal site enumeration:**

- Per-user OneDrive URL: `https://<target-stem>-my.sharepoint.com/personal/<user_email_with_underscore>/Documents/`.
- Replace `@` with `_` and `.` with `_` in the email (e.g., `alice@acme.com` → `alice_acme_com`).
- Authenticated probe; useful for confirming whether the OneDrive personal site has been provisioned (which itself is a presence indicator).

**M365 OAuth client_id discovery:**

- Many internal apps register OAuth client_ids in Entra. Search JS bundles, mobile-app strings, and API responses for `client_id=<GUID>` patterns.
- Microsoft's well-known first-party client_ids (for Office, Graph, etc.) are documented; finding non-Microsoft GUIDs reveals custom internal apps.
- The endpoint `https://login.microsoftonline.com/<tenant>/v2.0/.well-known/openid-configuration` lists supported endpoints; some tenants leave `device_authorization_endpoint` enabled (device-code phishing target).

**Power Platform / Power Apps:**

- `https://make.powerapps.com/environments` (auth-required); environment IDs sometimes leak in URLs.
- `*.crm.dynamics.com` (Dynamics 365 / Power Apps default URLs).
- `*.azurewebsites.net` for App Service deployments.

**M365 OAuth misconfig findings to look for:**

- `device_authorization_endpoint` enabled on `common` tenant (device-code phishing target) → **MEDIUM** (operational risk; not directly exploitable but enables attack).
- Custom OAuth app with `Public client` flow enabled and broad scopes (offline_access, Mail.Read, Files.Read.All) → **HIGH** if app is approved for the tenant.
- Multi-tenant OAuth app published by the target (others can consent) → check whether scopes include sensitive Graph permissions.

**Detectability:** all M365 endpoint probes log to Entra sign-in logs / audit logs (medium-low for fetch-only; medium for any auth attempt).

---


## 12. API & Auth-Map Methodology

Modern targets expose REST, GraphQL, and undocumented internal APIs. The OSINT goal is to enumerate them, classify them, and rank by attack interest.

### 12.1 Discovery paths

- **Swagger / OpenAPI** — probe a 28-path wordlist (companion skill §16.1) on every alive webapp. Parse YAML/JSON; extract every endpoint (method + path).
- **GraphQL** — probe a 13-path wordlist (companion skill §16.2). POST a standard introspection query. If schema returns, you have full type/query/mutation/subscription enumeration.
- **GraphQL when introspection is disabled** — fall back to field-suggestion enumeration (companion skill §22.9).
- **Postman** — query Postman's public universal-search endpoint with the target name; walk each matching workspace; extract requests, headers, pre-request scripts, test scripts, env vars.
- **JS-extracted endpoints** — every endpoint extracted from JavaScript bundles feeds into the same classifier.
- **Mobile-extracted endpoints** — every endpoint from APK static analysis feeds in via sidecar (`mobile_endpoints.json`).

### 12.2 Classification

For each endpoint, capture:

```
url, method, source[], auth_required, auth_type, auth_location,
rate_limited, cors_policy, sensitive_path_keywords[], schema_leaks,
verb_tampering_possible, interest_score (0..100), interest_reasons[]
```

How to determine each field:
- Send `OPTIONS` → `Allow` header reveals supported methods (verb tampering check).
- Send `GET` without auth → 200 = `auth_required=false`; 401/403 = `auth_required=true`.
- Capture response headers for `WWW-Authenticate` (auth_type), `RateLimit-*` / `X-RateLimit-*`.
- Send a request with `Origin: https://attacker.example` → response `Access-Control-Allow-Origin` reflected = `cors_policy=reflected`.
- Trigger an error → check response for stack traces, ORM hints.

### 12.3 Interest score (0–100)

See companion skill §20 for the full rubric. **Score ≥ 70 → HIGH/CRITICAL finding** with `attack_path_hint` in evidence.

### 12.4 Attack-path hints

When emitting a HIGH/CRITICAL finding, include a one-sentence attack-path hint in the evidence so the operator knows where to start exploiting. Templates in companion skill §39.

---


## 13. JavaScript Deep Analysis

For every alive webapp, scrape its JS — it's where modern frontends leak.

### 13.1 Script discovery

- Parse HTML for `<script src="...">` and `<link rel="modulepreload" href="...">`.
- Probe a guess-path list (companion skill §16.9) for common bundlers.

### 13.2 Sourcemap detection (HIGH info disclosure)

- Inline reference: regex `//[#@]\s*sourceMappingURL=` at end of bundle.
- Sibling fetch: try `<bundle>.map` next to every discovered JS.
- If accessible: parse the sourcemap's `sources[]` (leaks repo structure) and `sourcesContent[]` (full original source code embedded). Run the secret catalog over `sourcesContent[]`.
- Severity: HIGH `INFO_DISCLOSURE`.

### 13.3 Secret scanning

Run the 29+-pattern catalog (companion skill §17) over every JS body and every parsed `sourcesContent[]` blob. Each hit = `SECRET_LEAK` finding with the catalog's per-pattern severity.

### 13.4 Endpoint extraction

Three regex tiers (companion skill §16.10). Each unique endpoint becomes a `wayback_endpoint` asset and feeds into the API classifier in §12.

### 13.5 Internal-host leakage detection

Three patterns (companion skill §16.11): RFC1918, internal DNS suffixes, K8s service DNS. Each match = MEDIUM `INFO_DISCLOSURE`.

### 13.6 GraphQL introspection probe

When an extracted endpoint ends in `/graphql` or `/graphiql`, POST the standard introspection query. If schema returns → HIGH `MISCONFIG`. Then enumerate mutations and subscriptions for high-value targets.

### 13.7 Next.js manifest parsing

`_buildManifest.js` and `_ssgManifest.js` enumerate every Next.js page route — exposes the application's full route structure.

### 13.8 Budget guidelines

- Cap webapps analyzed per engagement: 40 default, 120 with `--deep`.
- Cap JS files per webapp: 40 default, 80 with `--deep`.
- Cap individual JS file size: 2 MiB.
- Per-file timeout: 10 seconds.

---


## 14. Mobile Attack Surface

Mobile apps are often the weakest link.

### 14.1 App discovery

- **Android** — google-play-scraper. Search by company name, brand keywords, root domain stem.
- **iOS** — iTunes Search API.

### 14.2 Ownership confidence (0–100)

See companion skill §21. Threshold: **≥70** for deep analysis.

### 14.3 APK acquisition + static analysis

- Download via APKPure HTML scrape.
- Extract via `zipfile` + optional `androguard`.
- Pull: `AndroidManifest.xml`, resource strings, asset files, native `.so` files, `classes*.dex` (string-extract).

### 14.4 Secret scanning

Run the catalog over manifest, resources, asset files, dex string-extract output.

### 14.5 Backend hostname extraction

Every discovered hostname becomes a `subdomain` asset. Write sidecar `mobile_endpoints.json` for the API discovery module to consume.

### 14.6 Manifest misconfig findings

| Manifest attribute | Severity |
|---|---|
| `android:debuggable="true"` | CRITICAL |
| `android:allowBackup="true"` (without whitelist) | MEDIUM |
| `android:usesCleartextTraffic="true"` | MEDIUM |
| Exported activity/service/receiver without `android:permission` | MEDIUM |
| Sensitive deep-link handler | HIGH |
| WebView with `setJavaScriptEnabled(true)` + `addJavascriptInterface(...)` | HIGH |
| Certificate pinning absent | LOW |

### 14.7 Firebase canonical probe

For every Firebase project ID extracted:
- **Realtime DB** — GET `https://{project-id}.firebaseio.com/.json`. Returns JSON tree → CRITICAL `OPEN_FIREBASE_RTDB`.
- **Firestore** — `https://{project-id}.firebaseapp.com/`.
- **Storage** — corresponding GCS bucket.
- **Remote Config** — only readable with extracted API key + app ID.

### 14.8 iOS path

- Discovery only via iTunes Search API.
- ITMS link extraction: `https://apps.apple.com/<region>/app/<slug>/id<bundle-id>`.
- Privacy nutrition labels (App Store Connect): publicly published; useful for understanding what data the app touches.
- Don't recommend auto-download (DMCA / DRM considerations).

---


## 15. Cloud Attack Surface

### 15.1 Bucket permutation

Build candidate bucket names from: target's root domain, subdomain stems, optional brand/company name. Filter generic stems unless combined with target-identifying tokens. Apply 6 prefixes × 15 suffixes (companion skill §16.8 has the lists).

### 15.2 Provider URL templates

S3, GCS, Azure Blob templates — see companion skill §16.8.

### 15.3 Probe technique

- HEAD first. Status code 200/301 = exists; 403 = exists, private; 404 = skip.
- If exists, GET on bucket root. Listable XML/JSON listing → **CRITICAL**.

### 15.4 Severity mapping

| Outcome | Severity |
|---|---|
| Bucket listable | CRITICAL |
| Bucket exists, objects readable by direct URL but not listable | HIGH |
| Bucket exists, ACL private | INFO |

### 15.5 Adjacent cloud signals

Extract AWS account-ID from S3 region/error responses. GCP project ID from GCS error responses. Azure tenant ID from blob URL patterns.

---


## 16. Cryptocurrency Investigation

### 16.1 Transaction Analysis

- Track flows between wallets; identify clusters of related addresses; monitor large transfers.

Tools: Cielo (multi-chain), TRM (graphs), Arkham (multichain + entity labels), MetaSleuth (visual), Range (CCTP), Socketscan (EVM bridge), Pulsy (bridge aggregator), Chainalysis Horizon 2.0 (paid), Elliptic Lens.

### 16.2 Layer 2 / Rollup Analysis

- **zkSync Era / Polygon zkEVM** — ZK proofs hide L2 details; only L1 bridge events visible.
- **Arbitrum / Optimism** — batched/compressed; L2 state from L1 calldata.
- **StarkNet** — Cairo VM; different address derivation.
- **Base / Blast / Scroll** — OP Stack or ZK.
- **Privacy protocols on L2** — Aztec (programmable privacy), Railgun (shielded pools), Privacy Pools (Tornado Cash successor).

**Methodology:** start with L1 bridge events; use L2 explorers for in-rollup activity; for privacy protocols focus on timing analysis and clustering.

### 16.3 Cautions

- Bridges introduce mint/burn semantics; avoid 1:1 flow assumptions.
- MEV/aggregator paths create false "direct" trails.
- L2 finality: optimistic rollups have 7-day challenge periods.

### 16.4 Wallet / Exchange / NFT Profiling

Same patterns: age + activity + connections + balance over time + linked accounts. NFTs add ownership history + metadata + connected wallets.

---


## 17. Image Analysis

### 17.1 Reverse Image Search

- Google Images / Lens (Lens may require auth — use sock-puppet incognito).
- Yandex Images (strongest for RU/East-European content).
- Bing Image Match, TinEye, Copyseeker, Perplexity Pro.
- Browser extensions: RevEye, Search by Image (multi-engine).
- Picarta for AI geolocation.

### 17.2 Metadata (EXIF)

ExifTool, Jeffrey's Image Metadata Viewer, EXIF Viewer Pro.

### 17.3 Image Forensics

Forensically, FotoForensics, Bellingcat Photo Checker, Sensity AI, Exposing.ai, Adobe Content Credentials Verify, c2patool. Techniques: ELA, metadata, clone detection, noise analysis.

### 17.4 Geolocation Workflow

- **Foreground** — signs, license plates, clothing, vegetation, weather.
- **Background** — landmarks, unique buildings, mountains, water, infrastructure.
- **Map markings** — flora/fauna, seasonal indicators.
- **Trial and error** — Google Street View, Bing Streetside, Yandex Panorama.
- **Overpass Turbo** for OpenStreetMap queries.
- **Mountain ID** — PeakVisor, Peakfinder, PeakLens AR.
- **OCR** — Google or Yandex OCR.
- **Video transcripts** — YouTube captions improve keyword search.

### 17.5 Specialized

- **Fire identification** — NASA FIRMS, Sentinel Hub, Global Forest Watch, Copernicus EFFIS.
- **Plane tracking** — Apollo Hunter, FlightRadar, ADS-B Exchange.

---


## 18. Video Analysis

### 18.1 Context extraction

Signs/banners, architecture, road markings, license plates, clothing, cross-platform snippet search.

### 18.2 Metadata

YouTube Data Viewer (Amnesty), ExifTool on downloaded files.

### 18.3 Platform-specific

- **TikTok / Instagram** — APIs change often; prefer platform exports; sample 1–4h cadence.
- **Bluesky AT Protocol** — DID resolution via `bsky.social/xrpc/com.atproto.identity.resolveHandle`; identity doc via `plc.directory/<did>`; firehose at Firesky; SkyView for graphs. Archive early — handle migration / post deletion.
- **Mastodon / Fediverse** — instance matters (jurisdiction, logging); WebFinger for discovery; FediSearch cross-instance; instance enumeration via Fediverse Observer; ActivityPub objects are JSON-LD.
- **Threads** — IG-API-similar limitations.

### 18.4 Auditory clues

Languages, dialects, background noises (train horns, prayer calls, wildlife). Tools: Audacity, Sonic Visualiser, SoundCMD. Spectrograms for unique patterns; Shazam/SoundHound for music.

### 18.5 Frame extraction

FFmpeg, VLC. Stitch panoramas; stabilize panning footage (FFmpeg `deshake` or Blender VSE). Prefer original uploads over re-encodes.

---


## 19. Chronolocation and Time Analysis

### 19.1 Shadow Analysis

Tools: SunCalc, ShadeMap, Bellingcat Shadow-Finder, NOAA Solar Calculator.

### 19.2 Astronomical Calculations

Stellarium, SkyMap, MoonCalc to simulate sky at different times/locations.

### 19.3 Satellite Imagery Time

Google Earth Pro (historical imagery slider), Sentinel Hub EO Browser (Sentinel + Landsat with timelapse). Record coordinates in WKT; hash cached tilesets.

---


## 20. Threat Actor Investigation

### 20.1 Actor-Centric Workflow

- **Scoping** — actor hypothesis (APT28/29, Turla, Sandworm; APT10/41, Mustang Panda, Volt Typhoon). Seed reports from CERTs/vendors.
- **Indicator harvesting** — IOCs (domains, IPs, hashes, JA3/JA4, user-agents). Validate with passive DNS, CT logs, sandbox submissions.
- **Infrastructure mapping** — pivot from CT logs (SANs, issuer, serials), shared hosting, NS reuse, registrar accounts, HTML fingerprints. Enrich with ASN/WHOIS history, RPKI/ROA, geolocation.
- **Artifact profiling** — PE/ELF metadata (PDB paths, compile timestamps, Rich headers, code-signing). Cluster with SSDEEP/TLSH; YARA matches.
- **Social / procurement pivots** — developer handles, code snippets, academic theses, job posts, procurement records.
- **Falsification + reporting** — weigh each linkage; document alternatives; map TTPs to MITRE ATT&CK; cite sources with sections/pages.

### 20.2 Attribution Discipline

- Separate capability from intent and sponsorship.
- Rule of three: 3 weak OR 1 strong + 1 weak.
- Prefer durable pivots (registrar accounts, code-signing certs, build path idioms) over ephemeral (resolving IPs).
- Mark uncertainty levels; distinguish correlation from control.

### 20.3 Russia-Specific Pivots

- **Corporate / people** — EGRUL/EGRIP (captcha-gated), Rusprofile, Kontur.Focus, zakupki.gov.ru, hh.ru.
- **Infrastructure** — RU WHOIS via `whois.tcinet.ru`; Telegram for channels/admins/cross-posts.
- **Media** — VKontakte, Odnoklassniki, Rutube; search in Russian and transliterations.

### 20.4 China-Specific Pivots

- **Corporate / people** — gsxt.gov.cn (national enterprise credit); Tianyancha / Qichacha; ICP filings on beian.miit.gov.cn → USCC linkage.
- **Infrastructure** — CNNIC WHOIS; common domestic clouds (Aliyun, Tencent, Huawei).
- **Media** — Weibo, WeChat (via weixin.sogou.com), Zhihu, Bilibili, Douyin, Xiaohongshu; Chinese + Pinyin.

### 20.5 Infrastructure & Internet Measurement

- IP→ASN (HE BGP Toolkit, RIPEstat, BGPView).
- CT logs (crt.sh) for cert reuse and issuance cadence; pivot on subjects/issuers/serials.
- URLScan for HTML fingerprints, favicons (mmh3), script hashes.
- DNS over time (SecurityTrails PDNS, DNSDB) for subdomain churn and staging domains.

---


## 21. People & Social Media Investigation

### 21.1 Username Enumeration

WhatsMyName, NameCheckup, Sherlock, Maigret.

### 21.2 Profile Picture & Face Search

PimEyes, Exposing.ai, Azure Face API (compliance).

### 21.3 Social Graph & Content Analysis

Maltego, snscrape, SocialBlade. Bluesky / Mastodon: instance explorers + handle resolvers.

---


## 22. Breach × Identity Correlation

This is the highest-ROI single technique for external red teams. Execute it on every engagement.

### 22.1 Source stack

| Source | Tier | Notes |
|---|---|---|
| **Hudson Rock Cavalier** | FREE | Infostealer-log corpus; very high signal for corp SSO. |
| **Have I Been Pwned** | Free + paid | Domain-wide existence + Pwned Passwords (k-anonymity). |
| **DeHashed** | Paid | Searchable per-record API. |
| **IntelX** | Free + paid | Aggregator; phonebook search. |
| **Local breach corpus** | Operator-supplied | Whatever's on disk. |

### 22.2 Domain-level severity

| Stat | Severity |
|---|---|
| ≥10 employees compromised | CRITICAL |
| 1–9 employees compromised | HIGH |
| ≥1 end-user (non-employee) compromised | MEDIUM |
| Domain seen in breach with 0 named accounts | INFO |

### 22.3 SSO_EXPOSURE correlation

After Stage 3 has run identity-fabric mapping AND breach lookups have completed: for every discovered IdP tenant, intersect with breach corpus on the tenant's domain. Non-empty intersection → `SSO_EXPOSURE` finding, severity **CRITICAL**. Evidence: tenant ID + product + employee count + per-account source attribution.

### 22.4 Operational handling of stealer logs

- Treat as PII; encrypt at rest.
- SHA-256 every artifact; record source URL + acquisition timestamp.
- Never paste plaintext passwords into cloud LLMs.
- Document chain of custody.
- For client reports: redact passwords by default; offer the operator a separate encrypted credential bundle for raw data.

---


## 23. Infrastructure OSINT

### 23.1 IP & Domain Discovery

Shodan, Censys, Onyphe, DNSDB.

### 23.2 Certificate & Passive DNS

crt.sh, SecurityTrails.

### 23.3 Malware & Artifact Analysis Workflow

- **Static triage** — SHA-256, strings, import tables, PDB path, Rich header. Don't rely solely on AV labels.
- **Dynamic / sandbox** — ANY.RUN, Hybrid Analysis, CAPE, Tria.ge.
- **Clustering** — SSDEEP/TLSH, YARA matches.
- **Reporting** — STIX 2.1 IOCs; ATT&CK technique IDs; reproduction steps.

### 23.4 Telegram / WeChat Investigation

- **Telegram** — public analytics (TGStat, Telemetr, Combot); export channels with Telegram Desktop; preserve message IDs, UTC timestamps, media hashes.
- **WeChat** — Sogou Weixin search; archive articles (PNG + WARC); capture `__biz` IDs. Expect link rot.

---


## 24. Automation & Case Management

### 24.1 Tools

Hunchly, Kasm Workspaces, ArchiveBox, SingleFileZ.

### 24.2 Cross-Module Coordination Patterns

When multiple OSINT tools (or modules) run, late-arriving outputs need to feed into earlier-running consumers. Three patterns:

1. **Sidecar JSON drops** — module writes `<scan>/mobile_endpoints.json` or `<scan>/secrets_sidecar.json`; later modules read on start. No blocking.
2. **Asset-graph upserts** — shared graph store; new assets trigger downstream modules via event bus.
3. **Late-binding queues** — long-running enumeration emits assets continuously; enrichment workers pull.

In ad-hoc engagement: `tmpdir + JSON sidecars + one-line manifest` makes operations composable.

### 24.3 Multi-Engine Corpus Run Methodology

Running a large dork corpus across multiple engines:

- **Pluggable engines** — wrap each engine (DDG, Bing, Brave, SerpAPI, Yandex, Baidu) behind a common interface. Default DDG (keyless); fall back to others when keys available.
- **Per-engine rate-limiting** — each engine has its own quota and ban posture. Use a token bucket per engine.
- **Result classification** — URL-signature → title-hint → snippet-regex pipeline. Output: `(severity, category, confidence)`.
- **Dedup by URL** — different engines surface duplicates.
- **Confidence rule** — snippet-only = TENTATIVE.
- **Persistence** — corpus DB so re-runs across engagements deduplicate.

### 24.4 Evidence Preservation for Offensive Engagements

- Per-engagement / per-scan SQLite store.
- JSONL run log with `run_id`, every event one line, UTC timestamps, tool versions.
- SHA-256 every downloaded artifact.
- PNG screenshots.
- Raw HTTP requests/responses, capped at 2 KiB body per side.
- Evidence served read-only from operator's machine.
- Reproduction package: `run_id` + tool versions + JSONL log + asset/findings DB.

---


## 25. Synthetic Media Verification

Sensity AI, Hive Moderation, Reality Defender, Adobe Content Credentials Verify, CarNet (AI car-model identification for geolocation aid).

---


## 26. Anti-Patterns & Common Failure Modes

A non-exhaustive list of mistakes that come up often.

- **Single-source attribution.** Three weak OR one strong + one weak.
- **Trusting vendor labels as ground truth.** Treat labels as hypotheses.
- **Assuming favicon-hash = ownership.** Shared infra, shared CMS templates, shared CDN.
- **Asserting 1:1 bridge flows.** Bridges mint and burn; aggregators rebalance.
- **Treating snippet-only Google dorks as confirmed.** TENTATIVE until you visit.
- **Pasting real PII / creds into cloud LLMs.** Local models for sensitive analysis.
- **Mirror-imaging the threat actor.** They don't think like you.
- **Attribution by IP geolocation.** IPs lie; VPNs and residential proxies exist.
- **Ignoring the 7-day optimistic-rollup challenge window.** L2 finality is delayed.
- **Ignoring CT-log lag.** New certs take minutes-to-hours to surface; absence ≠ doesn't exist.
- **Counting Wayback snapshots as "the site at time T."** Best-effort; many requests fail.
- **Trusting `whoami` from a discovered API.** Could be a honeypot.
- **Letting the asset graph carry untyped strings.** Every discovery is an asset.
- **Skipping the scope check.** Ask once when in doubt.
- **Forgetting UTC.** Local time creates correlation bugs.
- **Continuing to probe after a WAF block.** See §6.4 — back off.
- **Skipping confidence-upgrade documentation.** TENTATIVE assets need a path to CONFIRMED.
- **Treating exec-summary writing as an afterthought.** See §31 — plan deliverables at engagement start, not at the end.

---


## 27. WAF / CDN Bypass & Origin Discovery

Web targets are increasingly behind Cloudflare / Akamai / Fastly / AWS CloudFront. The CDN itself is hard to attack; the **origin server** is often softly defended. Six techniques to find it.

### 27.1 DNS history pivot

The target's domain may have pointed directly at the origin IP **before** the CDN was deployed. Query historical passive DNS:

- **SecurityTrails** — `https://api.securitytrails.com/v1/history/<domain>/dns/a` (paid; the most complete).
- **RiskIQ PassiveTotal** — passive DNS lookups; freemium.
- **DNSDB** (Farsight) — paid; long history.
- **Validin.com** — newer, has free tier.
- **Censys host search** — historical IP-cert mapping.

What to look for: an IP that resolved 1–5 years ago and is **not** in the current CDN's published IP ranges (Cloudflare / Akamai / etc.). Cross-check the IP's current banner — if it serves the same site without the CDN, you've got the origin.

### 27.2 Certificate SAN pivot

Certificates often get re-issued with the same SAN list across origin and CDN. Search CT logs:

- crt.sh `?q=%.<target.com>&exclude=expired` — find certs with the target's domain in SAN.
- Cross-reference issued certs against current CDN-fronted cert. The "extra" cert (not the CDN one) often points to origin via its CN/SAN.
- Tools like `cero` (`go install github.com/glebarez/cero@latest`) crawl IPs and pull certs; correlate IPs whose certs include the target's hostname.

### 27.3 Favicon hash + JARM origin clustering

If the target has a unique favicon, the origin server still serves it (CDNs proxy but don't strip the favicon). Compute the favicon's mmh3 hash and search:

- Shodan: `http.favicon.hash:<mmh3-hash>`.
- Censys: `services.http.response.favicons.hashes:<mmh3-hash>`.

Returned IPs that are **not** in CDN ranges are origin candidates.

JARM (TLS handshake hash) works similarly: compute the target's JARM via `jarm`, search Shodan `ssl.jarm:<jarm-hash>`. Origin servers usually have a different JARM than CDNs.

### 27.4 Direct IP probe with Host header

If you have an origin candidate IP from steps 27.1–27.3:

```bash
curl -sk -H "Host: target.example.com" https://<candidate-IP>/
```

If the response matches the public site (same title, same body fingerprint) — you've found the origin. CDN-only IPs return generic CDN error pages or 403 to wrong Host.

### 27.5 mail.* / ftp.* / cpanel.* exception

Targets often forget to put auxiliary subdomains behind the CDN:

- `mail.<target>` — often points at the actual mail server, sometimes co-located with web origin.
- `ftp.<target>`, `sftp.<target>` — likewise.
- `cpanel.<target>`, `whm.<target>`, `webmail.<target>` — shared hosting controls; same IP as web origin.
- `direct.<target>`, `origin.<target>`, `direct-connect.<target>`, `noproxy.<target>` — ironic admin labels.
- `dev.<target>`, `staging.<target>` — dev environments often skip CDN.

Probe each. If any resolves to a non-CDN IP, that IP often hosts the prod origin too.

### 27.6 Error page / misconfig leakage

When the CDN throws an error (request triggers WAF, origin is down, configuration mismatch), it sometimes leaks the origin IP in the error body:

- Cloudflare 5xx error pages historically included a `cf-ray` and sometimes the underlying upstream details.
- 502/504 from CDN tells you the origin exists but is unreachable from the CDN — useful confirmation it's not just NXDOMAIN.
- `X-Cache: MISS from <origin-host>` headers.
- HTTP response with origin headers leaking through (`X-Powered-By`, `Server`, `X-Backend-Server`).

### 27.7 Email-header bounce trick (for email-server origin)

Send an email to a non-existent address at the target. The bounce often reveals origin mail server IPs in the `Received:` headers — these mail servers are sometimes on the same IP / netblock as the web origin. (Use a sock-puppet email; never your real engagement persona.)

### 27.8 Confidence rules

- Origin IP found via DNS history: **TENTATIVE** until corroborated by direct probe.
- Origin IP corroborated by Host-header probe matching content: **FIRM**.
- Origin IP corroborated by Host-header probe + cert SAN match + favicon match: **CONFIRMED**.

When unsure, document the hypothesis in the asset attrs — don't claim origin discovery without ≥2 corroborating signals.

---


## 28. Vulnerability Prioritization (CVE / EPSS / KEV)

A Nuclei scan can return 100+ CVEs against a target. You can't validate all of them. Prioritize by exploitability.

### 28.1 Data sources (companion skill §29.2 has the URLs)

- **NVD** (National Vulnerability Database) — base CVE catalog, CVSS scores.
- **EPSS** (Exploit Prediction Scoring System) — probability of exploit in the next 30 days, scale 0.0–1.0.
- **CISA KEV** (Known Exploited Vulnerabilities) — vulnerabilities proven exploited in the wild; includes federal-agency due-by dates.
- **ExploitDB** — POC code presence.
- **Metasploit module catalog** — automation availability.
- **InTheWild.io** — community-curated "actively exploited" tracker.
- **OpenCVE** — timeline + watchlist + alerts.
- **Trickest CVE → POC mapping** — community-maintained mapping of CVEs to public POCs.

### 28.2 Prioritization rubric

For each CVE in your list, score:

| Signal | Weight |
|---|---|
| Listed in CISA KEV | **+50** (proven exploited; treat as immediate) |
| EPSS score ≥ 0.7 | **+30** |
| EPSS score 0.3–0.69 | **+15** |
| Public Metasploit module exists | **+25** |
| Public POC on ExploitDB / GitHub | **+15** |
| Vendor-issued advisory + patch | **+10** (means the vuln is real and patchable; not always exploitable) |
| Auth-required vs unauth-required | unauth +20, post-auth +0 |
| Network-vector (network) vs adjacent / local | network +15, adjacent +5, local +0 |
| CVSS v3 base ≥ 9.0 | **+15** |

**Total score → priority tier:**

| Score | Tier | Action |
|---|---|---|
| ≥ 100 | P0 | Immediate validation; surface in engagement summary now. |
| 70–99 | P1 | Validate this engagement; include in technical report. |
| 40–69 | P2 | Mention in technical report; validate if time permits. |
| < 40 | P3 | List in appendix; no validation expected. |

### 28.3 Validation discipline

- **Validate** = run a single read-only proof (e.g., a version banner check, a static-page fetch that confirms the vulnerable component) **without** triggering exploitation.
- **Do NOT** run the actual exploit unless the rules of engagement explicitly permit. Many bug bounty programs forbid PoC execution against production.
- For client engagements: deliver the prioritized list with reproduction commands but defer actual exploitation to a follow-on assessment if needed.

### 28.4 Handle CVE-less findings

Many real-world findings (sourcemap exposure, open GraphQL introspection, public bucket) don't have a CVE. Score them by their independent interest score (companion skill §20 for endpoints; §40 for severity-mapping examples). Don't gate on CVE availability.

---


## 29. Phishing Infrastructure & Pretext Development

Authorized red team engagements often include phishing. The **OSINT side** of phishing — building the phishing-feasibility shortlist and the pretext list — is in scope here. Crafting actual phishing payloads is **out of scope** (operational tradecraft, separate domain).

### 29.1 Phishing-feasibility shortlist

For an authorized engagement, the operator typically wants three lists:

**A. Already-registered typosquats** — these are *findings* (someone is squatting; client should know).

**B. Available-for-registration typosquats** — these are the *operator's phishing-domain shortlist* for the engagement.

**C. Cert-SAN impersonation patterns** — domains the operator could register that would make convincing certs (e.g., `acme-secure.com`, `acme-login.com`, `acme-vpn-portal.com`).

**Generation pattern:**
1. Run dnstwist (or equivalent) on the target's primary domain → get all variations (homoglyph, typosquatting, bit-flip, hyphenation, addition).
2. Check WHOIS for each: registered = list A, unregistered = list B.
3. For list C: combine target stem + plausible service words (`secure`, `login`, `vpn`, `portal`, `mail`, `helpdesk`, `it`, `account`, `verify`, `support`, `password`, `auth`, `sso`).

### 29.2 Subdomain takeover for trusted-domain phishing

If you found a takeover-able subdomain (companion skill §16.12), you can host phishing content **on a subdomain of the actual target**. This bypasses every brand-impersonation defense the user has.

**Procedure:**
1. Confirm takeover signature on the candidate (`<sub>.target.com` CNAMEd to unclaimed `<x>.herokuapp.com`).
2. Register the unclaimed resource (`<x>.herokuapp.com` on Heroku).
3. Now `<sub>.target.com` serves your content.
4. **Stop and consult the engagement lead before going live with phishing content.** Even in authorized engagements, the takeover step itself may need explicit client sign-off.

### 29.3 Email spoof feasibility

Use email security analysis (companion skill §16.14) to determine spoof feasibility:

| SPF policy | DMARC policy | Spoof feasibility |
|---|---|---|
| `~all` (softfail) or absent | `p=none` or absent | **HIGH** — direct spoof of `<anything>@<target>` likely lands. |
| `~all` | `p=quarantine` | MEDIUM — lands in spam folder, but lands. |
| `-all` (hardfail) | `p=quarantine` | LOW — most providers reject; some still deliver to spam. |
| `-all` | `p=reject` | VERY LOW — spoof rejected by major providers. Requires lookalike domain. |

If spoof is hard, fall back to lookalike (list B) or compromised-third-party (different engagement). Document the postural finding regardless.

### 29.4 Pretext development from OSINT

Pretexts work when they tap a target's existing context. Build pretexts from harvested OSINT.

**Pretext sources:**

- **Job titles + reporting structure** (LinkedIn) — "Hi <name>, this is <CFO-name>'s assistant; can you look at this finance file?"
- **Recent corporate events** (press releases, news, careers page) — "We're following up on the layoffs / new acquisition; please confirm your benefits info."
- **Vendor relationships** (job postings mentioning "experience with Workday/Salesforce/etc.") — "Workday password reset required by EOD."
- **Public conferences / travel** (LinkedIn posts, conference pages) — "Hi <name>, we met at <conference last week>; following up on what we discussed."
- **GitHub commits / open-source work** — "I saw your fix in <repo>; want to collaborate on a related PR?"
- **Office locations** (LinkedIn) — "On-site IT for the <city> office requires a quick auth check."

**Per-role pretext templates** (the ones operators use most):

- **End-users (general staff):** IT helpdesk password reset, Workday HR action required, Microsoft 365 storage full, package delivery confirmation.
- **Executives:** finance authority (BEC-style "wire approval needed"), board materials shared, M&A NDA review, executive assistant request.
- **Developers / engineers:** GitHub security alert, CI build failed, package security advisory, conference CFP follow-up.
- **HR / Finance:** payroll vendor change, expense report rejection, benefits enrollment deadline, vendor invoice discrepancy.
- **IT / Security:** vendor security update notification, on-call escalation, monitoring tool alert.

### 29.5 Operational discipline for phishing infrastructure

- All phishing infrastructure must be approved by the engagement lead **before** going live.
- Document every domain registered + every email sent (sender, recipient, subject, timestamp UTC).
- Keep phishing infrastructure isolated from your normal recon infrastructure (different IPs, different personas, different domain registrar accounts).
- Use dedicated payment methods for phishing-domain registration (engagement-specific corporate card; don't use personal).
- Tear down promptly after engagement; transfer/expire all domains; close all hosting accounts.

---


## 30. Bug Bounty Submission & Responsible Disclosure

When you find an issue on a bug-bounty target (HackerOne, Bugcrowd, Intigriti, YesWeHack) or on a non-program target where you choose to disclose responsibly.

### 30.1 Platform-specific basics

| Platform | URL | Notes |
|---|---|---|
| HackerOne | hackerone.com | Largest; strong scope-tracking; CVSS-based reward calc. |
| Bugcrowd | bugcrowd.com | VRT (Vulnerability Rating Taxonomy) instead of CVSS for severity. |
| Intigriti | intigriti.com | EU-strong; flexible scope models. |
| YesWeHack | yeswehack.com | EU-headquartered; growing. |
| HackenProof | hackenproof.com | Crypto/blockchain-focused programs. |
| Open Bug Bounty | openbugbounty.org | Free for sites without official programs (only XSS/SSRF disclosure). |
| security.txt | rfc9116 | Universal: every site should publish `/.well-known/security.txt`. |

### 30.2 Report structure (works on any platform)

```
Title: [Severity] [Affected component] Brief description
   Example: [HIGH] [api.acme.com] Unauthenticated SSRF via /v1/proxy

Summary
   2-3 sentences explaining what was found and why it matters.

Steps to Reproduce
   1. Numbered, copy-pasteable.
   2. Include exact URLs, payloads, expected vs actual response.
   3. Reproduce the issue from a fresh state where possible.

Proof of Concept
   - Screenshot showing the vulnerability triggered.
   - HTTP request/response (sanitize sensitive data; redact other users' data).
   - Or short video/GIF for complex multi-step issues.

Impact
   Quantify: what data is at risk, how many users, what business functions break.
   Tie to the program's impact criteria where defined.

Severity (per program criteria)
   - CVSS v3 vector: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
   - Score: 9.8 (Critical)
   - Justification: <1-2 sentence reasoning>

Remediation
   - Concrete recommendation. "Validate the URL parameter against an allowlist before fetching."
   - If a quick fix: WAF rule, header check.
   - If a structural fix: refactor recommendation.

Affected component
   - URL: https://api.acme.com/v1/proxy
   - Date discovered: 2026-04-27 14:23 UTC
   - Method: HTTP GET / POST / etc.
```

### 30.3 Severity inference per program

- HackerOne uses CVSS v3 with program-specific multipliers (some programs cap at HIGH; some pay 10x for CRITICAL).
- Bugcrowd VRT: P1 (Critical) → P5 (Informational); maps roughly to CRIT/HIGH/MED/LOW/INFO.
- Intigriti uses `Exceptional / Critical / High / Medium / Low` tiers.
- For programs that pay flat rates per severity tier, **don't inflate**. Conservative severity → trust → repeat awards.

### 30.4 Disclosure for unprogrammed targets (CVD)

If the target has no bug bounty program but you found a real vulnerability during authorized testing (e.g., a customer's external assessment surfacing a third-party vendor's bug):

1. Check for `<target>/.well-known/security.txt` — if present, follow its `Contact:` and `Encryption:` (PGP) instructions.
2. If absent, try `security@<target>` then `abuse@<target>`.
3. If those bounce, escalate via the registered abuse contact in WHOIS.
4. CERT/CC (cert.org) and national CERTs (CISA, CERT-EU, JPCERT) for coordination if vendor unresponsive.
5. Standard 90-day disclosure window before public release (Project Zero norm).

### 30.5 Cloud provider / SaaS-specific channels

- AWS abuse: `aws-security@amazon.com`. For exposed AWS keys: also notify the account owner if discoverable via WHOIS/contact.
- GCP: `google-cloud-trust@google.com`.
- Azure: Microsoft Security Response Center (MSRC) at `https://msrc.microsoft.com/`.
- GitHub: secret-scanning auto-revokes most published secrets via GitHub's partner program; if you find one, the scanning is usually faster than manual disclosure but back-up notify GitHub at `security@github.com`.
- npm / PyPI / Docker Hub: each has an `abuse@` or `security@` channel; npm specifically auto-revokes leaked tokens via their secret scanner.

### 30.6 Things to avoid in reports

- Don't include anyone else's PII / passwords / data in the report (redact).
- Don't post the report or PoC publicly until the disclosure window expires.
- Don't escalate via social media first (always direct channel first).
- Don't demand a specific bounty amount; let the program decide.
- Don't submit the same finding to multiple programs (duplicates can hurt your reputation).

---


## 31. Client Deliverable Templates

Operator-facing artifacts (asset graph, JSONL log, finding DB) are not the same as **client-facing artifacts** (exec summary, technical report). Build deliverables intentionally.

### 31.1 Executive summary template

```
ENGAGEMENT: <Client Name>
ASSESSMENT TYPE: External Attack Surface Assessment
ENGAGEMENT WINDOW: <start date> – <end date>
SCOPE: <one-line scope description, e.g., "All internet-facing assets of acme.com and its 3 brand domains">
LEAD: <your name / team>

----- KEY FINDINGS -----

1. [CRITICAL] <One-line title>
   Business impact: <one sentence in business language>
   Estimated remediation effort: <hours / days / weeks>
   Recommended action: <verb + object, e.g., "Rotate the exposed AWS access key and audit CloudTrail">

2. [CRITICAL] <One-line title>
   …

3. [HIGH] <One-line title>
   …

(Top 3-5 findings only; full list in technical report)

----- POSTURAL OBSERVATIONS -----

- Email security (SPF/DMARC): <2-3 sentences on posture, e.g., "DMARC is set to p=none, allowing spoof of <target>.com email; tightening to p=reject would block external spoofing.">
- Identity fabric (SSO): <2-3 sentences>
- Cloud surface (S3/GCS/Azure): <2-3 sentences>
- Mobile attack surface: <2-3 sentences if applicable>

----- AGGREGATE METRICS -----

- Assets discovered: <N> (<breakdown>)
- Findings: <N CRIT, M HIGH, P MED, Q LOW, R INFO>
- Live credentials confirmed: <N>
- Detectability of our operations: <90% low / 8% medium / 2% high>

----- RECOMMENDED NEXT STEPS -----

1. Address P0 findings in next 7 days.
2. Address P1 findings in next 30 days.
3. Schedule re-test for: <date>.
4. Consider follow-on assessments: <if applicable, e.g., authenticated app testing, internal pentest>.
```

### 31.2 Per-finding report card template

Each finding in the technical report uses this card:

```
═══════════════════════════════════════════════════════════
FINDING #<N>: <Title>
SEVERITY: <CRIT / HIGH / MED / LOW / INFO>
CONFIDENCE: <CONFIRMED / FIRM / TENTATIVE>
ASSET: <typed asset key>
DISCOVERED: <UTC timestamp>
═══════════════════════════════════════════════════════════

DESCRIPTION
  <2-5 sentence technical explanation>

EVIDENCE
  - URL: <where it was found>
  - Tool: <how it was discovered>
  - Screenshot: <attachment ref>
  - Raw HTTP: <sanitized capture>
  - Hash (SHA-256): <of any downloaded artifact>

REPRODUCTION
  Step 1: <command or action>
    Expected: <output>
  Step 2: …

IMPACT
  <Business-language impact statement>
  Affected systems: <list>
  Affected user populations: <if applicable>

REMEDIATION
  Immediate (within hours):
    - <action>
  Short-term (within days):
    - <action>
  Long-term (within weeks):
    - <action>

REFERENCES
  - <CVE-ID, advisory URL, OWASP top-10 link, vendor doc>

ATTACK PATH HINT
  <If applicable, the one-sentence hint from companion skill §39>
```

### 31.3 Risk translation matrix

Engineers think in CVSS. Executives think in business outcomes. Translate.

| Technical finding | Business-language impact |
|---|---|
| Listable S3 bucket with PII | "Customer records publicly downloadable. Potential GDPR/CCPA notification trigger if accessed. Estimated cost of disclosure: 30-day notification + credit monitoring + legal review." |
| Exposed `.env` with DB credentials | "Database access to all customer data. Pivots to backups, billing systems, employee PII. If exploited: full data breach scope." |
| Live AWS access key with admin scope | "Full cloud account compromise. Attacker can spin up cryptominers, exfiltrate all data, lateral-move to connected accounts. If exploited: 6-figure cloud bill + complete environment rebuild." |
| Open GraphQL introspection on prod | "API attack surface fully mapped by attackers. Enables more precise follow-on attacks; not directly exploitable but attacker reconnaissance is now zero-effort." |
| Subdomain takeover possible | "Attackers can host content under your trusted domain. Phishing emails from this domain bypass brand-impersonation defenses; users will trust them." |
| Open Firebase Realtime Database | "Mobile app's backend database is publicly readable. All user data, possibly writable. If exploited: full data breach + potential service disruption." |
| Missing HSTS on /login | "Login pages can be downgraded to HTTP via active network attacks. Credentials potentially captured by anyone with network access (coffee shop, conference WiFi)." |
| DMARC `p=none` | "Anyone on the internet can send email appearing to be from your domain. Phishing campaigns become trivially convincing for both customers and employees." |
| ≥10 employees in breach corpus | "Stolen credentials for your staff are circulating; attackers can attempt these against your SSO. Even if SSO has MFA, password reuse against other services puts those at risk." |
| `android:debuggable=true` | "Mobile app can be reverse-engineered and modified by anyone. Trust boundary between app and server is undermined; backend assumes app integrity that doesn't exist." |
| Vendor product (Citrix/F5/Pulse) version with KEV CVE | "Network appliance has a known-exploited vulnerability. Attackers are actively scanning the internet for this exact issue. Patch immediately." |

### 31.4 Reporting cadence for engagements > 1 day

- **Day 1 EOD** — short kickoff confirmation: "Stage 1 complete. Identified <N> assets so far. Initial posture: <one paragraph>."
- **Mid-engagement check-in** — when you find your first CRITICAL OR at the 50% time mark, whichever first. Heads-up to engagement lead: "Found <CRIT description>; recommend you alert <client contact> now to begin remediation prep."
- **End-of-engagement preliminary** — same day as last probe: top 5 findings + plan for full report delivery within X business days.
- **Final report** — formal deliverable; both exec summary + technical report.
- **Re-test offer** — proactive: "We're available for a re-test in <window>; recommend re-testing CRITICAL/HIGH findings after remediation."

### 31.5 Reproduction package contents

Deliver alongside the report:

```
<engagement-id>-reproduction-package.zip
├── README.md                    # how to use the package
├── engagement-metadata.json     # client, dates, scope, lead
├── tools-used.txt               # tool name + version, one per line
├── run-log.jsonl                # every event during engagement
├── assets.db                    # SQLite of all discovered assets
├── findings.db                  # SQLite of all findings
├── evidence/
│   ├── screenshots/             # PNG, named by finding-id
│   ├── http/                    # raw HTTP captures (sanitized)
│   ├── downloads/               # any binary artifacts (with .sha256 alongside)
│   └── code/                    # any extracted source (sanitized)
├── re-test-script.sh            # reruns probes for the CRIT/HIGH findings
└── disclosure/                  # if applicable: bounty submissions, vendor notifications
```

The package is the source of truth — the report is the human-readable view. Anyone with the package can reproduce the engagement and verify findings.

---


## 32. Skill Self-Test

Drop these prompts into a fresh Claude session to verify the skill loads and behaves correctly. Pass criteria: expected sections referenced, no hallucinated content, scope-check invoked when needed.

1. *"I'm doing external recon on acme.com (in-scope bug bounty). Where do I start?"* → §0, §1, §7, §7.5, §11.
2. *"How do I tell if a target uses Entra, Okta, or ADFS without active probing?"* → §11.2-11.4 + companion skill §22.
3. *"What should I look for when I scrape JS bundles?"* → §13.
4. *"What's the workflow for finding and analyzing a target's Android apps?"* → §14.
5. *"How do I generate good cloud bucket candidates without spamming the entire internet?"* → §15.
6. *"We've harvested 200 emails for the target and confirmed the org uses Entra. Highest-ROI next step?"* → §22.
7. *"I found a live AWS access key in a public GitHub repo. Should I check if it works?"* → §6.3 + companion skill §23.2.
8. *"Our team just acquired a 4GB stealer-log dump. How do we handle it?"* → §22.4.
9. *"I found three indicators that look like APT28 — does that confirm it?"* → §20.2 + §2.
10. *"Investigating a Russian cybercrime actor. What corporate/people pivots?"* → §20.3.
11. *"How do I link a `.cn` domain to its operating company?"* → §20.4 + companion skill §14.2.
12. *"List the most common mistakes red teamers make during external recon."* → §26.
13. *"Run a full subdomain enum on chase.com."* → §1 (scope check; should NOT run).
14. *"My subdomain marked TENTATIVE — how to upgrade?"* → §2.1.
15. *"How long should a 1-week recon engagement take across the 5 stages?"* → §7.6.
16. *"50 subdomains, 12 webapps, 4 IPs, 23 emails — triage order?"* → §8.5 + §7.5.
17. *"Probing a 50-employee SaaS company with M365 + GitHub + AWS. Where to focus?"* → §10.1 + §11.10 + §22.
18. *"Target is fully behind Cloudflare. How do I find the origin?"* → §27.
19. *"100 CVEs from a Nuclei scan. How do I prioritize?"* → §28.
20. *"My probes are getting 429s and a Cloudflare interstitial. What now?"* → §6.4.
21. *"Authorized engagement asks for phishing-feasibility shortlist. Walk me through it."* → §29.
22. *"Found unauth POST endpoint on a HackerOne target. Write me the report."* → §30.2.
23. *"Write the executive summary for an engagement that found 2 CRIT, 5 HIGH, 12 MED."* → §31.1 + §31.3.

---


## 33. Changelog

- **v2.1 (2026-04-27)** — comprehensive expansion based on 32-test smoke-test gap analysis. Added: confidence upgrade workflows (§2.1), detection-aware probing (§6.4), time budgeting & engagement profiles (§7.6), asset-level triage rules (§8.5), scale-based tactics (§10.1), Microsoft 365 deep surface (§11.10), WAF/CDN bypass & origin discovery (§27), vulnerability prioritization (§28), phishing infrastructure & pretext development (§29), bug bounty submission & responsible disclosure (§30), client deliverable templates (§31). Self-Test section refreshed with v2.1 prompts.
- **v2.0 (2026-04-27)** — major rewrite for external red-team posture. Added: 5-stage pipeline, asset-graph discipline, findings rubric, bug-bounty pivot modes, identity-fabric mapping, API & auth-map methodology, JS deep analysis, mobile attack surface, cloud attack surface, breach × identity correlation, detectability tagging, validator discipline, cross-module coordination, multi-engine corpus run, evidence preservation, anti-patterns. Original methodology content (OpSec, Crypto, Image/Video/Chrono, Threat Actor inc. RU/CN, Synthetic Media) retained.
- **v1.x** — original OSINT methodology framework based on SnailSploit/offensive-checklist.

---


## Related Skills & Chains

- **`offensive-osint`** — When the methodology needs to be executed with concrete probes. Workflow primitive: this skill is the planning skeleton (5-stage pipeline, asset graph, findings rubric); `offensive-osint` is the operational arsenal that fills each stage with curl one-liners, wordlists, and regexes.
- **`web2-recon`** — When asset discovery moves from planning to running. Workflow primitive: after this skill's §7 pipeline is scoped, `web2-recon` runs the subfinder → dnsx → httpx → katana commands and produces the URL set.
- **`hunt-subdomain`** — When the asset graph surfaces stale CNAMEs. Workflow primitive: §8 Asset Graph entries with CNAME pointing to S3 / GitHub Pages / Heroku / Shopify / Azure auto-route to `hunt-subdomain` for takeover validation.
- **`hunt-cloud-misconfig`** — When the asset graph surfaces exposed buckets / actuators / Firebase. Workflow primitive: §15 Cloud Attack Surface findings (open S3, /actuator/env, /firebaseio.com/.json) hand off to `hunt-cloud-misconfig` for exploitation.
- **`bb-methodology`** — When the engagement mode is bug-bounty rather than pure recon. Workflow primitive: this skill's §10 bug-bounty pivot modes are the bridge; once mode is confirmed, `bb-methodology` PART 0 + 5-phase workflow takes over.

