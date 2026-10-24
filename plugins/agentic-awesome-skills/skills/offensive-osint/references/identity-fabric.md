# Identity Fabric — Concrete Endpoints

> **AAS adaptation:** Read the authorization gate in [the skill](../SKILL.md) before any target request, credential use, or data collection. These are reference examples, not an instruction to run a sweep. Select only explicitly approved targets and techniques; set request, time, byte and concurrency limits and stop on errors or scope changes. Preserve TLS verification. Treat discoveries, pattern matches and historical provider claims as leads, not verified ownership, permission or severity. Minimize personal data and redact credentials before reports; do not send private evidence to public services. Prices, quotas, API shapes and tool availability require current official documentation. Changes and original source hashes are recorded in [the notice](../UPSTREAM-NOTICE.md).


> Reference content for the `offensive-osint` skill. Originally §22 of the monolithic SKILL.md (refactored 2026-05-02 for size/load efficiency).

## 22. Identity Fabric — Concrete Endpoints

Methodology lives in the companion `osint-methodology` skill §11. This is the URL/payload reference.

### 22.1 Microsoft Entra (Azure AD)

**OIDC metadata + tenant GUID extraction:**
```
GET https://login.microsoftonline.com/{tenant-or-domain}/.well-known/openid-configuration
```
Response field `issuer` contains the tenant GUID. GUID regex:
```regex
\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b
```
Detectability: low.

**getuserrealm.srf — managed vs federated probe:**
```
GET https://login.microsoftonline.com/getuserrealm.srf?login=<probe-user>@<domain>
```
Response: JSON with `NameSpaceType` field (`Managed` / `Federated` / `Unknown`). Federated also includes `FederationBrandName` and `AuthURL` (the upstream IdP URL). Detectability: low.

**Autodiscover v2:**
```
POST https://autodiscover-s.outlook.com/autodiscover/metadata/json/1
Body: {"Email": "<probe-user>@<domain>"}
```
A response may reflect domain routing or generic service behavior; it does not establish user existence or tenant membership. Detectability: low.

**Autodiscover IP correlation (passive M365 confirmation):**

Resolve `autodiscover.<domain>` and check if it lands in Microsoft Exchange Online IP space. This works even when MX is wrapped by Mimecast/Proofpoint/Barracuda inbound filtering, where MX alone doesn't reveal the underlying mail platform.

```bash
dig +short A autodiscover.target.example
```
```powershell
Resolve-DnsName "autodiscover.$D" -Type A | Select Name,IPAddress
```

Microsoft Exchange Online IPs (truncated common ranges): `40.96.0.0/13`, `52.96.0.0/14`, `13.107.6.152/31`, `13.107.18.10/31`, `40.99.0.0/16`, `40.104.0.0/15`, `52.98.0.0/15`. Full list: [Office 365 URLs and IP address ranges](https://learn.microsoft.com/en-us/microsoft-365/enterprise/urls-and-ip-address-ranges).

Microsoft IP space is only a hosting lead: shared infrastructure and stale records prevent tenant confirmation from an IP match alone. Corroborate current tenant metadata and official domain bindings. Live DNS lookup is an active request to resolvers, not cached passive evidence.

**GetCredentialType — user-enum (deep mode only):**
```
POST https://login.microsoftonline.com/common/GetCredentialType
Content-Type: application/json
Body:
{
  "username": "<email>",
  "isOtherIdpSupported": true,
  "checkPhones": false,
  "isRemoteNGCSupported": true,
  "isCookieBannerShown": false,
  "isFidoSupported": true,
  "originalRequest": "",
  "country": "US",
  "forceotclogin": false,
  "isExternalFederationDisallowed": false,
  "isRemoteConnectSupported": false,
  "federationFlags": 0
}
```
Response field `IfExistsResult` indicates user existence: `0` = exists, `1` = doesn't exist, `5` = exists in federated tenant. Detectability: medium (logged in tenant audit). Cap at 20 attempts per tenant.

### 22.2 Okta

**Org slug derivation:** start with stems from discovered subdomains and root-domain stem. Probe `<slug>.okta.com` and `<slug>.oktapreview.com`. Slug regex:
```regex
[a-z0-9][a-z0-9-]{1,40}\.okta(?:preview)?\.com
```

**OIDC fingerprint:**
```
GET https://<slug>.okta.com/.well-known/openid-configuration
```

**/api/v1/authn user-enum (deep mode):**
```
POST https://<slug>.okta.com/api/v1/authn
Content-Type: application/json
Body: {"username": "<email>", "password": "invalid_password_for_enum"}
```
Authentication failures and HTTP status codes do not provide a universal account-existence oracle. The historical examples below depend on engine, tenant policy and actual response schema; invalid-password attempts can lock accounts. Only use an approved test account and explicit attempt budget:
- `400/401` with an authentication failure → ambiguous; do not infer existence.
- Authentication transaction states can be JSON `status` values with different HTTP responses; evaluate the current documented engine and an owner-provided test fixture.
Detectability: medium (audit-log per attempt). Cap at 20 attempts per tenant.

### 22.3 ADFS

**Active fingerprint (requires the target-request gate):**
```
GET https://{domain}/adfs/idpinitiatedsignon.aspx
```
A `200 OK` with a `urn:com:microsoft:ADFS:` reference in HTML indicates ADFS. Version-string greppable in HTML resource references.

**Mex endpoint (deep mode):**
```
GET https://{domain}/adfs/Services/Trust/mex
```
Returns SOAP federation metadata including endpoint URLs, signing certs, and supported claim types.

### 22.4 Google Workspace

**OIDC discovery:**
```
GET https://{domain}/.well-known/openid-configuration
```
Google Workspace does not automatically publish OIDC metadata at each customer domain. Google’s own discovery service uses the characteristic `issuer` URI (`https://accounts.google.com`) and JWKS URI. MX records pointing to `aspmx.l.google.com` are a corroborating signal.

### 22.5 Generic OIDC (Keycloak / Auth0 / Ping / OneLogin / Duo)

**Discovery:** probe `/.well-known/openid-configuration` on every alive subdomain. The `issuer` and `authorization_endpoint` field URLs fingerprint the product:

| Product | URL pattern in `issuer` |
|---|---|
| Auth0 | `https://*.auth0.com` |
| OneLogin | `https://*.onelogin.com` |
| Ping | `https://*.pingone.com`, `https://*.pingidentity.com` |
| Duo | `https://*.duosecurity.com` |
| Keycloak | URL contains `/realms/<realm>` |
| OneLogin | `https://*.onelogin.com` |

### 22.6 SAML metadata

See §16.6.

### 22.7 AWS account-ID extraction

**S3 bucket region header (active request, not account ownership proof):**
```
HEAD https://<known-bucket>.s3.amazonaws.com/
```
Response includes `x-amz-bucket-region`. A region header does not disclose the owner’s AWS account ID. Names are only leads; independently confirm approved ownership.

**ARN regex (in any JSON / HTML / JS response):**
```regex
arn:aws:[a-z0-9\-]+:[a-z0-9\-]*:([0-9]{12}):
```
Capture group: 12-digit AWS account ID.

**`AccountId` property pattern:**
```regex
(?i)["']?account[_\-]?id["']?\s*[:=]\s*["']([0-9]{12})["']
```

OAuth client IDs and requested scopes are public application metadata, not secrets or proof of consented permissions.

**Google OAuth client_id:**
```regex
\b\d{8,}-[a-z0-9]{10,40}\.apps\.googleusercontent\.com\b
```

**MSAL / Microsoft client_id (GUID property):**
```regex
(?i)["']?client[_\-]?id["']?\s*[:=]\s*["']([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})["']
```

**OAuth scope extraction:**
```regex
(?i)["']?scope["']?\s*[:=]\s*["']([^"']+)["']
```

### 22.8 Microsoft 365 Deep Enumeration (Teams / SharePoint / OneDrive / OAuth)

**Teams federation status:**
```bash
# Resolve tenant first
curl -sS -m 10 "https://login.microsoftonline.com/${TARGET_DOMAIN}/.well-known/openid-configuration" | jq -r '.issuer'
# Federation API requires authenticated request from a federated tenant; an unauthenticated error does not establish effective federation policy
curl -sS -m 10 "https://teams.microsoft.com/api/mt/emea/beta/users/<email>/externalsearchv3"
```

**SharePoint subdomain probe:**
```bash
STEM=$(printf %s "$TARGET_DOMAIN" | cut -d. -f1)
for sub in "" "-my" "-admin"; do
  echo "=== ${STEM}${sub}.sharepoint.com ==="
  curl -sS -m 10 -I "https://${STEM}${sub}.sharepoint.com/" -w '%{http_code}\n'
done
```

**Reading the result correctly:** `HTTP 200` from these probes is **not sufficient to prove the tenant exists** (Microsoft serves a generic redirect-to-auth page) — it does **NOT** mean anonymous access is granted to the tenant's content. Distinguish:
- 200 → service response only; corroborate tenant identity and intended content access (INFO).
- An anonymous-share URL is a candidate; prove unintended sensitive content access using minimum approved evidence, without exposing the share token.
- 401/403 → rejected request only; tenant identity and resource existence remain unconfirmed.
- 404 / NXDOMAIN → tenant not provisioned at this stem (or vanity-named — check known stems from cert transparency).

PowerShell:
```powershell
$STEM = ($D -split '\.')[0]
foreach ($s in @("","-my","-admin")) {
  try {
    $r = Invoke-WebRequest -Uri "https://${STEM}${s}.sharepoint.com/" -Method Head -UseBasicParsing -TimeoutSec 10
    "${STEM}${s}.sharepoint.com -> HTTP $($r.StatusCode) (service response; tenant unconfirmed)"
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code) { "${STEM}${s}.sharepoint.com -> HTTP $code" } else { "${STEM}${s}.sharepoint.com -> no host" }
  }
}
```

**OneDrive personal site probe** (for a known email `alice@acme.com`):
```bash
USER_TOKEN=$(echo "alice@acme.com" | tr '@.' '__')
STEM="acme"
curl -sS -m 10 -I "https://${STEM}-my.sharepoint.com/personal/${USER_TOKEN}/Documents/" -w '%{http_code}\n'
# Status alone does not prove a personal site exists or is absent.
```

**M365 OAuth client_id discovery in JS:**
```bash
curl -sS -m 10 "https://app.target.example/main.js" | \
  grep -oE 'clientId["'\''[:=]+ ?["'\'']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
```

**Device-code phishing target check** (look for `device_authorization_endpoint` in OIDC metadata):
```bash
curl -sS -m 10 "https://login.microsoftonline.com/${TARGET_DOMAIN}/v2.0/.well-known/openid-configuration" | \
  jq '.device_authorization_endpoint'
```
The discovery field advertises protocol capability; it does not establish tenant Conditional Access policy, user consent, MFA bypass or phishing success. No vulnerability verdict from the field alone.

**Power Platform / Dynamics URLs to check:**
- `*.crm.dynamics.com` (per-region: `crm`, `crm2`-`crm15`, `crm.dynamics.com`).
- `*.api.crm.dynamics.com` (Web API).
- `make.powerapps.com` / `flow.microsoft.com` (auth-required dashboards).

**Severity:**
- Discovered SharePoint/OneDrive tenants → INFO (asset only).
- Anonymous SharePoint share link → review intended sharing and minimum approved data access; a public link alone does not establish unintended exposure.
- `device_authorization_endpoint` advertised → INFO protocol metadata; investigate effective policy only with approval.
- Multi-tenant OAuth app requesting broad Graph scopes → review lead; requested scopes are not granted permissions or compromise.

### 22.9 GraphQL Field-Suggestion Enumeration (when introspection disabled)

When the standard introspection query (§16.2) returns `"errors":[{"message":"GraphQL introspection is disabled"}]`, fall back to field-suggestion enumeration. Apollo and most GraphQL libraries enable "did you mean" suggestions by default.

**Detection probe:**
```bash
curl -sS -m 10 -X POST "$T/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __schema { types { name } } }"}' | jq -r '.errors[0].message'
# If "introspection disabled" → proceed.
```

**Field-suggestion probe** (intentionally typo a field name to trigger suggestions):
```bash
curl -sS -m 10 -X POST "$T/graphql" \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ usre { id } }"}' | jq -r '.errors[].message'
# Expected: "Cannot query field \"usre\" on type \"Query\". Did you mean \"user\", \"users\", \"userById\"?"
```

Iterate over a candidate-field wordlist (use SecLists `Discovery/Web-Content/graphql.txt` or `clairvoyance` library's seed list). Each suggestion reveals real field names. Stop at the approved finite request/depth/byte budget; suggestions alone do not prove restricted data access.

**Tooling:**
- **Clairvoyance** (`pip install clairvoyance`) — automated field-suggestion enumerator. `clairvoyance -w wordlist.txt -o schema.json https://target.example/graphql`.
- **GraphQL-Cop** — auditor that probes for introspection, batching, depth-limit, suggestion config. `pip install graphql-cop`.
- **InQL** (Burp extension) — Burp Suite extension for GraphQL endpoint analysis.
- **GraphQL Voyager** — visualize once schema is reconstructed.

**Other GraphQL-when-introspection-disabled techniques:**

- **Alias-based query batching** (rate-limit / auth-bypass surface):
  ```json
  {
    "query": "{ a:user(id:1){name} b:user(id:2){name} }"
  }
  ```
  Many APIs rate-limit per-request, not per-alias. Do not send 100+ aliases or stress queries by default. Use owned fixtures and a separately approved bounded test; batching support alone is not a limit bypass.

- **Query-depth-limit bypass** (DoS / introspection bypass):
  ```json
  {
    "query": "{ user { friends { friends { friends { friends { id } } } } } }"
  }
  ```
  Use a controlled lab for depth/DoS testing. A single accepted nested query does not demonstrate arbitrary depth, DoS or introspection bypass.

- **Query operation over the legacy graphql-ws WebSocket transport:**
  ```bash
  wscat -c "wss://target.example/graphql" -s graphql-ws
  > {"type":"connection_init"}
  > {"id":"1","type":"start","payload":{"query":"query { __schema { types { name } } }"}}
  ```

Use this only if the server supports the legacy transport and acknowledges initialization. Introspection is a query operation, not a subscription; actual subscription discovery requires an approved subscription field and bounded event collection.

- **Batched query bypass** (some servers process all queries in batch even if first fails):
  ```json
  [
    {"query":"{ __schema { types { name } } }"},
    {"query":"{ user(id:1) { name } }"}
  ]
  ```

**Severity:**
- Field suggestions → schema-discovery lead; severity requires unintended sensitive disclosure.
- Alias batching → capability observation; require the actual intended limit and demonstrated unauthorized effect.
- Subscription transport reachability → asset observation; authorized access to unintended sensitive events determines impact.

---
