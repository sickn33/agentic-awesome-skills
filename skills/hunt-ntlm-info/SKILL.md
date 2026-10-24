---
name: hunt-ntlm-info
description: Hunt NTLM/Negotiate information disclosure on internet-reachable IIS/SharePoint/Exchange.
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

NTLM info disclosure is a protocol observation whose severity depends on demonstrated impact and program scope — the leak itself is intentional protocol behavior (MS-NLMP NTLMSSP challenge), but on internet-exposed enterprise infrastructure it provides exact reconnaissance for the next stage of an attack. Highest-value targets:

- **Internet-reachable IIS / SharePoint / Exchange / OWA** with dual-auth (Forms + NTLM, or NTLM + Kerberos)
- **Citrix NetScaler / VMware Horizon View** internet-facing gateways with NTLM-backed AD auth
- **Lync / Skype for Business / Teams On-Prem** edge servers
- **WSUS / Windows Update Services** with NTLM-protected admin paths
- **CIFS-style fileshare proxies** (HCL Sametime, IBM Notes Domino) that proxy NTLM
- **Legacy SharePoint farms** that left NTLM enabled on the public-zone IIS binding

**What makes this pay:**
- Internal AD domain disclosure (parent-forest mapping, e.g. `customer.parent-corp.example` → tenant inside corporate-AD tree)
- Hostname disclosure (`WIN-XXXXXXXXXXX` does not establish provisioning quality or password policy)
- Protocol timestamp (does not disclose a password hash or enable cracking by itself)
- Direct attack-map enrichment for credential spraying combined with `hunt-auth-bypass` Legacy-Protocol Matrix

---

## Attack Surface Signals

**Response headers signaling NTLM availability:**
```
WWW-Authenticate: NTLM
WWW-Authenticate: Negotiate
WWW-Authenticate: NTLM, Negotiate
WWW-Authenticate: Negotiate, NTLM
```

**URL patterns where NTLM is commonly exposed:**
```
/_api/web/CurrentUser                  (SharePoint REST)
/_vti_bin/*.asmx                       (SharePoint legacy SOAP)
/EWS/Exchange.asmx                     (Exchange Web Services)
/Autodiscover/Autodiscover.xml         (Exchange autodiscover)
/owa/                                  (Outlook Web App)
/Microsoft-Server-ActiveSync           (ActiveSync)
/PowerShell                            (Exchange Mgmt Shell over HTTPS)
/api/v3/                               (TeamCity, Atlassian)
/wsus/                                 (Windows Server Update Services)
/manager/html                          (some Tomcat behind IIS)
/iisstart.htm                          (default IIS, sometimes reveals NTLM upstream)
```

**Tech-stack signals:**
- IIS on the public internet (almost always NTLM-capable, even if Forms is the front)
- SharePoint Web Front End (almost always dual-auth Forms + NTLM)
- Exchange edge transport
- Server header `Microsoft-HTTPAPI/2.0`, `Microsoft-IIS/*`, `IIS/*`

---

## Step-by-Step Hunting Methodology

1. **Probe every anonymous endpoint for `WWW-Authenticate: NTLM`.** Send a vanilla GET and inspect response headers. If NTLM is offered, proceed.

2. **Send a valid NTLMSSP Type-1 message anonymously.** The Type-1 base64 below requests NetBIOS-domain and Workstation info from the server:
   ```
   Authorization: NTLM TlRMTVNTUAABAAAAB4IIogAAAAAAAAAAAAAAAAAAAAAGAbEdAAAADw==
   ```
   This is the standard test Type-1 with negotiate flags `NTLMSSP_NEGOTIATE_UNICODE | NTLMSSP_NEGOTIATE_OEM | NTLMSSP_NEGOTIATE_NTLM | NTLMSSP_NEGOTIATE_ALWAYS_SIGN | NTLMSSP_NEGOTIATE_KEY_EXCH | NTLMSSP_NEGOTIATE_56 | NTLMSSP_NEGOTIATE_128 | NTLMSSP_NEGOTIATE_TARGET_INFO`. The `OS Version` field (`06 01 B1 1D 00 00 00 0F`) is Windows 7 build 7601 — accepted by virtually every NTLM responder.

3. **Use a maintained HTTP client with an approved target and bounded TLS request.**
   Type-2 arrives in the response to Type-1; a one-shot request can receive it.
   Connection affinity matters across a complete NTLM authentication exchange,
   not as a reason to disable certificate verification or use an unsafe raw socket.

4. **Parse the Type-2 challenge from the `WWW-Authenticate: NTLM <base64>` response header.** Base64-decode the value. The structure is NTLMSSP per MS-NLMP:
   - Bytes 0-7: literal `NTLMSSP\0`
   - Bytes 8-11: MessageType = `\x02\x00\x00\x00`
   - Bytes 12-19: TargetName SecurityBuffer (len, alloc, offset)
   - Bytes 20-23: NegotiateFlags
   - Bytes 24-31: Server Challenge (8-byte nonce, not a credential)
   - Bytes 40-47: TargetInfo SecurityBuffer (len, alloc, offset)
   - TargetInfo body: `AV_PAIRS` array of (AvId u16, AvLen u16, Value)

5. **Decode the AV_PAIRS.** The AvIds you care about:
   - `1` = NetBIOS Computer Name
   - `2` = NetBIOS Domain Name
   - `3` = DNS Computer Name (FQDN of the responding server)
   - `4` = DNS Domain Name (the AD domain)
   - `5` = DNS Tree Name (the AD forest root)
   - `7` = Timestamp (FILETIME protocol metadata)
   - `9` = Target Name (in newer NTLMSSP)

6. **Assess only demonstrated impact.** Domain/host strings do not prove user
   naming conventions, trust relationships, default passwords, an auth bypass or
   tenant identity. Confirm topology with owner evidence; never escalate to spray,
   cracking, relay or credential access without separate explicit scope.
7. **Record time as metadata**, not evidence of golden-ticket capability.
8. **Check the current program policy.** Intentional protocol data can be low or
   informational; do not promise acceptance or infer severity from hostname style.

---

## Payload & Detection Patterns

**Generic NTLM Type-1 anonymous probe (curl + raw socket fallback):**
```bash
# Type-2 may be returned to this single approved request.
# Use this as a quick probe to confirm NTLM is offered:
curl --silent --show-error --connect-timeout 5 --max-time 15 --head -H "Authorization: NTLM TlRMTVNTUAABAAAAB4IIogAAAAAAAAAAAAAAAAAAAAAGAbEdAAAADw==" \
  "https://target.example/_api/web/CurrentUser" 2>&1 | grep -i "WWW-Authenticate"
```

**Burp `send_http1_request` (recommended for full Type-2 capture):**
```
GET /_api/web/CurrentUser HTTP/1.1
Host: target.example
Authorization: NTLM TlRMTVNTUAABAAAAB4IIogAAAAAAAAAAAAAAAAAAAAAGAbEdAAAADw==
Connection: keep-alive
User-Agent: Mozilla/5.0

```

**Offline Type-2 target-info decoder (no network or authentication):**
```python
import base64
import struct

def decode_target_info(encoded):
    if len(encoded) > 131072:
        raise ValueError("Oversized challenge")
    data = base64.b64decode(encoded, validate=True)
    if len(data) < 48 or data[:8] != b"NTLMSSP\x00" or struct.unpack_from("<I", data, 8)[0] != 2:
        raise ValueError("Expected bounded Type-2 challenge")
    flags = struct.unpack_from("<I", data, 20)[0]
    if not flags & 0x00800000:  # NEGOTIATE_TARGET_INFO
        return {}
    size, _, offset = struct.unpack_from("<HHI", data, 40)
    if offset < 48 or offset + size > len(data):
        raise ValueError("Invalid TargetInfo security buffer")
    info = data[offset:offset + size]
    fields, position = {}, 0
    while position + 4 <= len(info):
        kind, length = struct.unpack_from("<HH", info, position)
        position += 4
        if kind == 0:
            if length != 0 or position != len(info):
                raise ValueError("Invalid AV terminator")
            return fields
        if position + length > len(info):
            raise ValueError("Truncated AV value")
        value = info[position:position + length]
        position += length
        if kind in {1, 2, 3, 4, 5, 9}:
            if length % 2:
                raise ValueError("Invalid Unicode AV value")
            fields[kind] = value.decode("utf-16-le")
        elif kind == 7:
            if length != 8:
                raise ValueError("Invalid timestamp length")
            fields[kind] = struct.unpack("<Q", value)[0]
        # Other AV types are binary; do not decode them as Unicode.
    raise ValueError("Missing AV terminator")
```

Read a bounded locally captured test challenge, pass its base64 string to the
function, and redact returned names before sharing. It is not an NTLM stack or
proof of server identity. [MS-NLMP structure](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-nlmp/801a4681-8809-4be9-ab0d-61dcfe762786).

**Burp Collaborator NOT needed** for this finding class — the data leak is in the synchronous response, not via OOB.

---

## Root cause, mitigation and reporting

NTLM challenge metadata can be intentional. Exposure review should identify the
actual public authentication binding and business need. `ApplicationPoolIdentity`
is a normal IIS identity, not evidence of default credentials. Extended Protection
uses channel/service binding to mitigate relay; it does not generally suppress
anonymous Type-2 metadata by requiring an already authenticated client.
[Microsoft Extended Protection](https://learn.microsoft.com/en-us/iis/configuration/system.webserver/security/authentication/windowsauthentication/extendedprotection/spn).

Disabling NTLM or stripping negotiation headers can break legitimate clients:
propose an owner-reviewed migration/access boundary with staged compatibility
tests. Renaming a server changes a disclosed label, not the authentication risk.
Do not redesign AD trusts merely to hide a name. Document target, timestamp,
protocol fields and concrete authorized impact; distinguish owner-confirmed facts
from inferred topology and never assert a universal bounty severity.

Related skills (`hunt-sharepoint`, `hunt-aspnet`, `triage-validation`) can organize
approved evidence. This observation authorizes no additional tenant enumeration,
password spraying, relay or service-account credential tests.

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
