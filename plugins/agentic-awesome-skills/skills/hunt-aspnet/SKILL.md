---
name: hunt-aspnet
description: Hunt ASP.NET-specific surface
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

ASP.NET deserialization bugs pay among the highest amounts in bug bounty when they reach RCE. Even when patched, the disclosure-tier findings (signed-only ViewState, dual-parser differential, request-validator quirks) reliably pay Low-Medium.

**Highest-value targets:**

- **SharePoint farms** (any version — 2013/2016/2019/SE) — sign-only ViewState + permissive ToolPane.aspx + anonymous FormDigest creates the CVE-2025-53770 ToolShell precondition chain
- **Telerik UI for ASP.NET AJAX** — `Telerik.Web.UI.WebResource.axd` is a documented RCE sink when keys leak (CVE-2017-11317, CVE-2017-11357, CVE-2019-18935)
- **Classic ASP.NET Webforms enterprise apps** — banking portals, dealer portals, HR systems left on .NET Framework 4.x
- **WCF services** (`*.svc?WSDL`) — often forgotten admin endpoints with looser auth than the main app
- **Sitecore CMS** — ViewState + Sitecore-specific deserialization chains (CVE-2021-42237)
- **DotNetNuke (DNN)** — historic ViewState RCE chains
- **Umbraco CMS** — ViewState + custom deserialization sinks

**Asset types that pay most:** internet-reachable ASP.NET Webforms apps > WCF admin services > Telerik-integrated sites > Classic ASP.NET MVC with VSF (very rare)

---

## Attack Surface Signals

**Response headers indicating ASP.NET:**
```
X-AspNet-Version: 4.0.30319          (classic — disclosure on its own)
X-Powered-By: ASP.NET
X-AspNetMvc-Version: 5.2
Server: Microsoft-IIS/10.0
Set-Cookie: ASP.NET_SessionId=...
Set-Cookie: .ASPXAUTH=...            (Forms auth cookie)
Set-Cookie: .ASPXFORMSAUTH=...
Set-Cookie: ASP.NET_SessionId=...; SameSite=None  (suggests cross-origin embedding)
```

**Body signals (in form HTML):**
```
<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="..." />
<input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="..." />
<input type="hidden" name="__VIEWSTATEENCRYPTED" id="__VIEWSTATEENCRYPTED" value="" />
                                        ↑ EMPTY = signed-only, not encrypted = exploitable if key leaks
<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="..." />
<input type="hidden" name="__REQUESTDIGEST" id="__REQUESTDIGEST" value="0x...,...">
                                        ↑ SharePoint CSRF token; if anon-issued, see hunt-sharepoint
```

**URL patterns to probe:**
```
/trace.axd                            (per-app trace viewer; sometimes anon-accessible)
/elmah.axd                            (ELMAH error log viewer)
/elmah.axd/?id=...                    (ELMAH RCE / stack-trace leak)
/*.svc                                (WCF services)
/*.svc?wsdl                           (WCF WSDL)
/*.svc/mex                            (Metadata Exchange)
/*.asmx                               (legacy SOAP)
/*.asmx?WSDL                          (legacy SOAP description)
/*.asmx?disco                         (legacy discovery)
/Telerik.Web.UI.WebResource.axd       (Telerik AJAX components)
/ChartImg.axd                         (DataVisualization controls; historic deserialization)
/ScriptResource.axd                   (script resource handler; sometimes leaks paths)
/WebResource.axd                      (web resource handler)
/_vti_bin/*                           (SharePoint Web Service Forwarder)
/api/                                 (Web API 2.x is ASP.NET on classic framework)
/signin                               (often FedAuth / WS-Federation)
```

**Tech-stack signals:**
- `Server: Microsoft-IIS/10.0` (or `/8.5`, `/7.5`) — confirmed Windows + IIS
- `X-AspNet-Version` header — classic .NET Framework (4.x); .NET Core/5+ does NOT emit this
- Cookies with `ASP.NET_SessionId`, `.ASPXAUTH`, `FedAuth` — Forms or claims auth
- `__VIEWSTATE` in form bodies — Webforms (NOT MVC, NOT Razor Pages, NOT Blazor)
- `MicrosoftSharePointTeamServices` header (sometimes stripped by ELB but leaks in `start.aspx` body) — SharePoint

---

## Step-by-Step Hunting Methodology

1. **Fingerprint the framework version.** Trigger any 500 error (stale ViewState POST is a reliable way) and look for `Version Information: Microsoft .NET Framework Version:X.X.XXXXX; ASP.NET Version:X.X.XXXX.X` in the error body. This banner discloses both the runtime and ASP.NET-version-specific patch level. .NET 4.0.30319 + ASP.NET 4.8.x is the most common modern combination.

2. **Locate every form with `__VIEWSTATE`.** Spider the target and grep for `name="__VIEWSTATE"`. Each is a candidate sink for deserialization attacks if MAC / encryption is bypassable.

3. **Check `__VIEWSTATEENCRYPTED` value.** Empty (`value=""`) means ViewState is signed-only via `<machineKey>` but NOT encrypted. Recovery of the validation key → arbitrary deserialization. Non-empty (`value="something"`) means ViewState is BOTH signed and encrypted; both keys needed to forge.

4. **Test the ViewState parser-error differential** (the dual-parser anti-pattern). Send 7+ ViewState shapes and classify responses:
   - Trivial garbage (`AAAA`) → `"Validation of viewstate MAC failed"`
   - Real prefix from current page → `"Validation of viewstate MAC failed"`
   - Flipped-bit real ViewState → `"Validation of viewstate MAC failed"`
   - Oversize (`A * 100000`) → `"Validation of viewstate MAC failed"`
   - XML-shaped (`<xss/>`) → **"The state information is invalid for this page and might be corrupted"** ← different parser path
   - LosFormatter-style prefix (`/wEPDwUKMTcxNzgyOTQwMmRkkz9p4lzA...`) → **"The state information is invalid for this page and might be corrupted"**

   The differential proves there are **two distinct deserialization entry points**, one of which dispatches BEFORE the MAC check on some payload shapes. Historically this enables MAC-before-parse-bypass exploits.

5. **Look for load-balanced cross-node ViewState MAC failures.** If POST gets a 500 with `"Validation of viewstate MAC failed. If this application is hosted by a Web Farm or cluster, ensure that <machineKey> configuration specifies the same validationKey..."`, the farm has multiple WFEs WITHOUT machineKey sync, or without sticky-session affinity. Operationally this breaks legit users; security-wise it confirms farm topology.

6. **Probe `trace.axd` and `elmah.axd`.** If either returns 200 anonymously, it's a Critical finding (trace leaks every request + headers + form data; ELMAH leaks every server error including stack traces).

7. **Enumerate WCF services (`.svc`).** For each, fetch `?wsdl` and `?mex` (metadata exchange). MEX endpoints sometimes return full service contracts including admin operations.

8. **Test request-validator bypass.** ASP.NET's request validator blocks `<` in query strings by default. Bypass categories that may still get through:
   - HTML-entity-encoded payloads (`&lt;script&gt;` — but these don't execute)
   - Encoded inside JSON / XML POST bodies (different content-type ≠ same validator)
   - In path segments (not query) — validator scope depends on framework version
   - In Cookie / Referer headers (varies)
   - Inside `<%@ ... %>` ASP directives if reached via WebDAV PUT (rare)

9. **Check `customErrors` mode.** If 500s expose full stack traces, framework versions, file paths, internal method names → `customErrors mode="Off"` is set. Should be `RemoteOnly` for production.

10. **Look for Telerik components.** `Telerik.Web.UI.WebResource.axd?type=rau` is the historic upload-to-RCE chain (CVE-2017-11317). The `dialogParametersHolder` parameter chain (CVE-2019-18935) requires the encryption key but is otherwise RCE.

11. **SharePoint-specific deserialization paths** — see `hunt-sharepoint` skill for the ToolPane.aspx + anonymous FormDigest + unencrypted ViewState chain.

12. **SafeControl enumeration via reflection.** SharePoint's `Picker.aspx?PickerDialogType=<TypeName>` (and DNN-equivalent endpoints) accept class names and return DIFFERENT error messages for "type exists but not whitelisted" vs "type does not exist." Feed a wordlist of `Microsoft.SharePoint.*.WebControls.*` types to enumerate the SafeControl list — useful for CVE-2019-0604-family hunting.

---

## Payload & Detection Patterns

**Stack-trace fingerprint (trigger via stale ViewState POST):**
```bash
curl -sk -X POST "https://target.example/page.aspx" \
  --data "__VIEWSTATE=AAAA&__VIEWSTATEGENERATOR=AAAA"
# Inspect body for:
#  - "Validation of viewstate MAC failed" → confirms signed ViewState
#  - "The state information is invalid for this page" → confirms ALTERNATE parser path
#  - "Version Information: Microsoft .NET Framework Version:X.X.XXXXX" → exact patch level
#  - "Microsoft.SharePoint.Client.ServerStub..." → SharePoint farm
```

**ViewState parser-error differential probe (Python):**
```python
import requests, re, json
S = requests.Session(); S.verify = False
# Get fresh form
r = S.get("https://target.example/path/page.aspx")
real_vs = re.search(r'__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)', r.text).group(1)
real_vsg = re.search(r'__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)', r.text).group(1)

# Test 7 payload shapes
for label, vs in [
    ("trivial",      "AAAA"),
    ("real",         real_vs),
    ("flipped-bit",  real_vs[:50] + "X" + real_vs[51:]),
    ("oversize",     "A" * 100000),
    ("base64",       "VGVzdE1hcmtlcjY3OFhZWg=="),
    ("xml-shaped",   "<xss/>"),
    ("losformatter", "/wEPDwUKMTcxNzgyOTQwMmRkkz9p4lzA" + "A"*50),
]:
    r = S.post("https://target.example/path/page.aspx",
               data={"__VIEWSTATE": vs, "__VIEWSTATEGENERATOR": real_vsg})
    title = re.search(r'<title>([^<]+)</title>', r.text)
    title = title.group(1)[:100] if title else "—"
    print(f"  [{label:14s}] {r.status_code}  {title}")
```

**`trace.axd` anonymous check:**
```bash
curl -sk -o /dev/null -w "%{http_code}\n" "https://target.example/trace.axd"
# 200 = full trace dump exposed → Critical
# 403 = mod set to localhost-only → check via X-Forwarded-For: 127.0.0.1
```

**WCF service enumeration:**
```bash
# Find all .svc files
curl -sk "https://target.example/" -o body.html
grep -oE '/[a-zA-Z0-9/_-]+\.svc' body.html | sort -u
# For each found:
curl -sk "https://target.example/Service.svc?wsdl" | xmllint --format - | head -60
```

**Request-validator bypass categories:**
```
# Default: <script>alert(1)</script> in ?q= → "Potentially dangerous Request.QueryString value detected"
# Bypasses that sometimes work:
?q=%3cscript%3e            (URL-encoded — depends on validator config)
?q=<svg/onload=alert(1)>  (depends on validator version)
?q=<%00script>             (NUL-byte; older validators)
?q=javascript:alert(1)     (no < at all — passes validator)
Cookie: foo=<script>       (cookie body not validated by default)
Referer: http://x.com/<script>  (referer not validated in classic ASP.NET)
```

**Telerik exploit gate (CVE-2019-18935 — requires encryption keys):**
```bash
# Fingerprint Telerik
curl -sk "https://target.example/Telerik.Web.UI.WebResource.axd?type=rau" -X POST
# If response is RadAsyncUploadHandler-style → Telerik present; try keys
# Public exploits require leaked machineKey AND telerikEncryptionKey
```

---

## Common Root Causes

1. **`viewStateEncryption="Auto"` defaults to signed-only on pages without sensitive ViewState data.** Many SharePoint pages are configured this way. When `__VIEWSTATEENCRYPTED` is empty, ViewState is signed-only — recovery of `validationKey` alone enables forgery.

2. **`<machineKey>` AutoGenerate in a Web Farm.** Each WFE generates a different key on first boot; ViewState issued by one WFE fails MAC validation on another. Operationally produces 500s; security-wise broadcasts the topology (the error message names the cluster).

3. **`<customErrors mode="Off">` left from development.** Stack traces with full method names, file paths, version banners exposed to anonymous internet users.

4. **`trace.axd` / `elmah.axd` left enabled in production.** Often forgotten in `<system.web><trace enabled="true">` blocks.

5. **Forgotten WCF `.svc` admin endpoints.** Built for internal admin tooling, never disabled when the main app went to internet exposure.

6. **Dual-parser anti-pattern: `ObjectStateFormatter` (legacy) vs `LosFormatter` (modern) deserialize in different orders relative to MAC validation.** Some payload shapes hit the legacy parser BEFORE MAC check.

7. **Request validator only applies to URL-encoded body and querystring.** Headers, cookies, XML/JSON bodies, and multipart fields are NOT validated by default. Developers assume validator is universal; it is not.

8. **`<machineKey>` checked into source repos.** Configuration check-ins to GitHub frequently leak validation/decryption keys. Combine with `hunt-misc` source-recon for Telerik / SharePoint / DNN keys.

9. **`SafeControls` web.config entries trusted to gate deserialization.** SharePoint's `<SafeControl>` list determines which classes Picker.aspx can instantiate. Bypasses exist when the inheritance check is the only gate (CVE-2019-0604 family).

---

## Bypass Techniques

| Defense | Bypass |
|---|---|
| `__VIEWSTATEENCRYPTED` non-empty (encrypted) | Recover both decryption + validation keys from any source-code leak / config-disclosure / VS forge primitive; without keys, deserialization cannot be triggered |
| Request validator blocks `<` in querystring | Move payload to Cookie / Referer / JSON body / multipart filename — validator doesn't reach those contexts in classic ASP.NET |
| `EnableViewStateMac="true"` enforced | Recover `validationKey` from web.config disclosure or `<machineKey>` AutoGenerate fingerprinting (ysoserial.net `--minify --islegacy` mode generates ViewState that passes some MAC-validation gaps) |
| `trace.axd` localhost-only | Set `X-Forwarded-For: 127.0.0.1` if the trace mode is `localOnly` and the validation uses Request.UserHostAddress (some apps use Forwarded-For instead) |
| WCF `.svc` 401 on anonymous | Try `?wsdl` and `?mex` first; metadata is sometimes anonymously enumerable even when service ops require auth |
| Telerik upload patched | Check the Telerik version: anything pre-2017Q1 (build 2017.1.118 or earlier) is the original RAU RCE. Check 2017Q3 - 2019Q3 for CVE-2019-18935 |
| `SafeControl` whitelist enforced | Inheritance gate (`instanceof PickerDialog`) IS the gate on patched SP — bypass requires finding a SafeControl subclass with a deserialization sink; enumerate via Picker.aspx |
| `customErrors mode="On"` (no stack traces) | Force a different error path: invalid Content-Length, malformed ViewState that triggers a parser-level exception below the customErrors handler |

---

## Gate 0 Validation

Before writing the report, confirm:

1. **What can the attacker DO right now with the disclosed information?**
   - `trace.axd` 200 with full request dump → **Critical** (PII / session cookies / Authorization headers exposed)
   - `elmah.axd` 200 with error log → **High** (stack traces + internal paths + sometimes credentials)
   - `__VIEWSTATEENCRYPTED` empty + recoverable machineKey via separate finding → **Critical chain to RCE**
   - `__VIEWSTATEENCRYPTED` empty without key recovery → **Low-Medium** (primitive present, not exploitable on its own)
   - Stack traces in 500s → **Low** unless they include credentials / connection strings

2. **Have you reproduced the full chain to attacker-attainable impact, or only the primitive?**
   - Cross-reference `triage-validation` Pre-Severity Gate. "Primitive confirmed" is not Critical until the chain ends in impact.

3. **Can a triager reproduce in <10 min from your report?**
   - Each step copy-pasteable curl / Python.
   - For RCE chains: link the public exploit tool (ysoserial.net, viewgen, telerik-revda) and the specific gadget chain.

---

## Real Impact Examples

### Scenario A — Signed-only ViewState + permissive ToolPane on EoL SharePoint 2013

`https://target-portal.example/_layouts/15/ToolPane.aspx?DisplayMode=Edit` returns 200 anonymously. The form contains `__VIEWSTATE` (signed only — `__VIEWSTATEENCRYPTED=""`), and `__REQUESTDIGEST` is anonymously issued via `_api/contextinfo`. Combined with SP2013 being end-of-life (no patch will ever ship), this is the canonical CVE-2025-53770 "ToolShell" precondition chain on a permanently-unpatched code path. Reported severity: **Critical**. The dual-parser test (Section 4 of Methodology) confirmed that XML-shaped payloads reach the legacy `ObjectStateFormatter` BEFORE MAC validation — additional evidence that the chain is reachable even without full machineKey recovery (though full RCE requires both).

### Scenario B — Telerik RadAsyncUploadHandler exposed on legacy bank portal

`/Telerik.Web.UI.WebResource.axd?type=rau` returns the Telerik upload handler. Telerik version (visible in JS bundle metadata) is 2016.3.1027. CVE-2017-11317 applies — keys are baked into the public Telerik DLL of that version. Upload → write `aspx` to `/app_data/` → request → RCE. Reported severity: **Critical**.

### Scenario C — trace.axd + elmah.axd both exposed on enterprise HR portal

`trace.axd` 200 returns 50 most recent requests, including `Authorization: Bearer eyJ...` headers on API requests. `elmah.axd` 200 returns full error log with database connection-string in one of the exceptions. Reported severity: **Critical** (credentials in plaintext to anonymous internet).

---

## Related Skills & Chains

- **`hunt-rce`** — ViewState deserialization is the headline ASP.NET RCE path; signed-only ViewState + leaked machineKey = RCE every time. Chain primitive: ASP.NET ViewState dual-parser MAC-bypass anti-pattern detected (signed but not encrypted, `<%@ Page enableViewStateMac="true" viewStateEncryptionMode="Never" %>`) + machineKey recovered (from web.config disclosure, `elmah.axd`, source leak, or GitHub) → `hunt-rce` ysoserial.net `TypeConfuseDelegate` gadget → arbitrary command in `w3wp.exe` worker-process identity.
- **`hunt-sharepoint`** — SharePoint farms inherit every ASP.NET anti-pattern plus their own surface. Chain primitive: ASP.NET fingerprint reveals SharePoint (X-SharePoint headers + `/_layouts/` reachable) → pivot to `hunt-sharepoint` for SP-specific RCE paths (ToolShell, SafeControl reflection) before generic ViewState attack.
- **`hunt-ntlm-info`** — IIS sites that advertise NTLM/Negotiate anonymously leak AD topology. Chain primitive: ASP.NET app behind IIS with `WWW-Authenticate: NTLM` → `hunt-ntlm-info` Type-2 challenge capture → internal forest name → cross-reference Entra tenant via `m365-entra-attack` discovery.
- **`hunt-file-upload`** — Telerik RadAsyncUpload, Kentico, Umbraco, and DotNetNuke all have historical upload-handler RCE. Chain primitive: ASP.NET CMS fingerprinted → `hunt-file-upload` bypass matrix against the CMS upload handler → `.aspx` written into web-accessible path → request → RCE under app-pool identity.
- **`triage-validation`** — `trace.axd`/`elmah.axd` disclosure is only Critical when it actually leaks live credentials/tokens; pure stack traces are usually Low. Chain primitive: pull every reported finding through `triage-validation` 7-Question Gate before submission — distinguish "verbose error" (informational) from "live bearer token in error log" (Critical) before writing the report (`redteam-report-template`).

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
