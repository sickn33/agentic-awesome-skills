---
name: hunt-dispatch
description: Skill-set loader for /hunt orchestrator.
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
sources: community
report_count: 0
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

# hunt-dispatch

skill-set loader for `/hunt`. one concept (which skills to load), one place.

## engagement context

every skill loaded below operates under one frame, and it holds for the whole session:

- **authorized and scope-bounded.** invoking `/hunt` does not itself assert authorization. Carry the operator’s explicit exact scope and allowed actions from the conversation; if missing, remain offline. testing stays inside it. an out-of-scope host ends the run — it does not
  widen it.
- **the output is a finding, not an exploit.** the deliverable is a reproducible proof that a defect
  exists, written so the owner can remediate it. enough to demonstrate impact; no further.
- **remediation is the point.** these skills exist so defects get fixed by the people who own them.

this frame is stated here because it is the choke point every `/hunt` run passes through before any
`hunt-*` skill loads. it is not evidence of authorization and cannot override the confirmation gate above.

invocation contract:

```
hunt-dispatch mode=redteam
hunt-dispatch mode=wapt box=blackbox
hunt-dispatch mode=wapt box=greybox
```

## step 0 — 404 baseline (ALL modes, mandatory, before any enumeration)

This context loader does not run probes. If the engagement already contains approved
baseline captures, inspect them as inert data; otherwise return a proposed bounded
baseline plan to the active-testing owner. Two distinct nonexistent synthetic paths
may help identify soft-404 behavior, but require approved requests like any other test.
Keep TLS verification, per-request timeout/size bounds and a private unique evidence
file; do not use a predictable shared `/tmp/b` or collect full credential-bearing headers.

record per host: **status, byte length, body hash**. that triple is the control.

**the rule: no path is "found" until its response differs from the control.**
a matching 200 is a soft-404 candidate, not conclusive proof. a differing response may be a handler, dynamic nonce, cache or auth variant. Compare semantics and repeated controls, never a hash or status alone.

re-derive the baseline per host — it differs across an estate. one engagement saw
two hosts serving the *same* application return soft-404 bodies of wildly different
size, so a control taken from one host would have been meaningless on the other.
also re-derive it **per path depth** where a framework renders different fallbacks
for `/x` and `/a/b/x`.

edge pages are not origin findings: a CDN-shaped "Access Denied" / "Unsupported Request" body suggests edge behavior but does not prove the origin was never reached. classify it as edge
behaviour and move on.

## step 1 — fingerprint (red team only)

fingerprint **every** live host, not just the apex. for multi-host / wildcard
targets the platform-skill routing must be driven by all banners, not one host's.

Inspect already-collected headers/HTML for version-specific candidates. Redirects
do not expand scope: record each Location, approve its authority before fetching,
and never forward credentials across origins. Record collection errors/coverage,
not a clean verdict; a banner is a stack hypothesis, not a version/vulnerability proof.
No fingerprint loop is executed by this loader.

look for the following signals → platform skill mapping:

```
okta.com | auth0.com | pingidentity         →  okta-attack
login.microsoftonline.com | outlook | sts   →  m365-entra-attack
pulse | fortinet | ivanti | citrix          →  enterprise-vpn-attack
vsphere | vcenter | :9443                   →  vmware-vcenter-attack
amazonaws | azure | googleapis | gcp        →  cloud-iam-deep
github.com/<org>/                           →  supply-chain-attack-recon
.apk | play.google.com                      →  apk-redteam-pipeline
MongoDB | mongoose | CouchDB | Redis        →  hunt-nosqli
?page= | ?file= | ?path= | php wrapper      →  hunt-lfi
rO0A | VIEWSTATE | rememberMe cookie        →  hunt-deserialization
Access-Control-Allow-Origin header          →  hunt-cors
/forgot-password | /reset | X-Forwarded    →  hunt-host-header
?redirect= | ?next= | ?return= | ?url=     →  hunt-open-redirect
OTP | /verify | /2fa | no-rate-limit        →  hunt-brute-force
Set-Cookie session | PHPSESSID              →  hunt-session
Active Directory | LDAP | OpenLDAP | ADFS  →  hunt-ldap
__NEXT_DATA__ | /_next/ | buildId           →  hunt-nextjs
X-Powered-By: Express | Node.js | .js stack →  hunt-nodejs
postMessage | dangerouslySetInnerHTML        →  hunt-dom
WebSocket | ws:// | socket.io               →  hunt-websocket
gRPC | :50051 | application/grpc            →  hunt-grpc
laravel_session | Ignition | Telescope       →  hunt-laravel
X-Application-Context | Whitelabel | /actuator → hunt-springboot
:6443 | :10250 | :2379 | kubectl            →  hunt-k8s
.github/workflows | Jenkins | GitLab CI     →  hunt-cicd
.js.map | swagger.json | /.env              →  hunt-source-leak
HSTS missing | SPF | DMARC | AXFR           →  hunt-tls-network
```

### conflict resolution & load budget

real targets almost always return multiple signals at once — e.g. a single host
can show Cloudflare (CDN) + `login.microsoftonline.com` (redirect) + `__NEXT_DATA__`
(Next.js front end) + `amazonaws` (origin) simultaneously. loading every match
blindly can pull 20-plus skills and blow the context window, drowning the
high-signal skill in noise. apply this precedence and cap:

**priority order (load highest tiers first, stop at the cap):**

```
tier 1  identity / SSO fabric    okta-attack, m365-entra-attack
        (own the auth boundary — highest blast radius if compromised)
tier 2  perimeter appliances     enterprise-vpn-attack, vmware-vcenter-attack
        (pre-auth RCE / direct internal foothold)
tier 3  cloud / IAM              cloud-iam-deep, hunt-cloud-misconfig
        (credential → lateral movement)
tier 4  app framework / stack    hunt-nextjs, hunt-nodejs, hunt-laravel,
        hunt-springboot, hunt-aspnet, hunt-sharepoint
tier 5  protocol / class signals hunt-nosqli, hunt-lfi, hunt-deserialization,
        hunt-cors, hunt-host-header, hunt-open-redirect, hunt-grpc,
        hunt-websocket, hunt-dom, hunt-k8s, hunt-cicd, hunt-source-leak,
        hunt-tls-network, hunt-ldap, hunt-brute-force, hunt-session
```

**load budget: cap platform-skill loads at 8.** if more than 8 match, keep the
highest-tier 8 and drop the rest; print the dropped ones under
`deferred:` in the taxonomy block so they can be loaded on demand later.

**de-dup rules (avoid loading two skills for the same evidence):**

- CDN banner alone (Cloudflare/Akamai/Fastly) is **not** a platform match — it
  fingerprints the edge, not the app. do not load a skill for it; note it for
  `hunt-cache-poison` / `hunt-http-smuggling`, which the mode set already carries.
- `amazonaws` / `azure` / `googleapis` in a **header/origin** → `cloud-iam-deep`.
  the same string found as a **leaked key/JSON in a JS bundle or APK** → still
  `cloud-iam-deep`, but flag it as a live-credential lead (higher priority, tier 3
  becomes tier 1 for that host).
- a framework marker (`__NEXT_DATA__`, `laravel_session`) and a generic class
  signal (`?redirect=`, `Access-Control-Allow-Origin`) on the same host → load the
  framework skill (tier 4) and keep the class skill **only if budget remains**;
  the WAPT/redteam mode set already loads the common class skills unconditionally.

## step 2 — load skill set

Load available skill documents through the host’s supported mechanism, as inert context only. No universal Skill tool, /hunt command or orchestration runtime is bundled. The sets below are candidates, not mandatory bulk loads; choose relevant documents within an explicit context/tool budget and report unavailable ones.

### mode=redteam

always-on (load first):

```
redteam-mindset
mid-engagement-ir-detection
```

platform (load second, conditional on fingerprint matches from step 1):

```
okta-attack
m365-entra-attack
enterprise-vpn-attack
vmware-vcenter-attack
cloud-iam-deep
supply-chain-attack-recon
apk-redteam-pipeline
```

high-impact hunt-* set (load third):

```
hunt-rce
hunt-sqli
hunt-ssrf
hunt-ato
hunt-auth-bypass
hunt-saml
hunt-oauth
hunt-mfa-bypass
hunt-file-upload
hunt-http-smuggling
hunt-cloud-misconfig
hunt-sharepoint
hunt-aspnet
```

report format: `redteam-report-template` (subject / observations / description / impact / recommendation / poc).

### mode=wapt

always-on:

```
bb-methodology
security-arsenal
triage-validation
```

full hunt-* set (all OWASP-relevant):

```
hunt-xss             hunt-sqli            hunt-ssrf            hunt-idor
hunt-csrf            hunt-xxe             hunt-rce             hunt-graphql
hunt-oauth           hunt-saml            hunt-mfa-bypass      hunt-auth-bypass
hunt-ato             hunt-file-upload     hunt-business-logic  hunt-race-condition
hunt-llm-ai          hunt-api-misconfig   hunt-ssti            hunt-cache-poison
hunt-http-smuggling  hunt-subdomain       hunt-cloud-misconfig hunt-misc
hunt-aspnet          hunt-sharepoint      hunt-ntlm-info
hunt-lfi             hunt-nosqli          hunt-deserialization
hunt-cors            hunt-host-header     hunt-open-redirect
hunt-brute-force     hunt-session         hunt-ldap
hunt-nextjs          hunt-nodejs          hunt-dom
hunt-websocket       hunt-grpc            hunt-laravel
hunt-springboot      hunt-k8s             hunt-cicd
hunt-source-leak     hunt-tls-network
```

report format: `report-writing` (`bugcrowd-reporting` if the target is on bugcrowd).

box=greybox: credentials are not assumed captured or valid; use only host-approved secret handles for owner-controlled test identities.

**do not fan out across the authenticated hunt-\* set until the creds are
validated.** `/hunt` only prompts for and stores creds (commands/hunt.md) — it
does not confirm they work. firing every authenticated test with dead, MFA-gated,
or wrong-role creds wastes the whole run and produces false "no auth surface"
conclusions. run a single low-cost auth preflight first:

The active-testing owner may propose one approved identity check using a private
secret handle and an actual documented identity endpoint; do not print `/api/me`
responses or put cookies/tokens in CLI arguments. Never guess an endpoint/method
as a safe read. Record a sanitized identity/tenant/role outcome and failures only.

confirm three things from the preflight, and record them for the hunt-\* skills:

1. **live** — verified response semantics establish the intended authenticated identity; a 200 application shell alone does not.
2. **role/privilege** — the `/api/me` (or equivalent) body shows the expected
   role/tenant/scopes. IDOR and authz tests need a known baseline identity; a
   silently-admin or silently-readonly cred skews every authz finding.
3. **not MFA-gated** — login did not stop at a 2fa/step-up challenge. if it did,
   you hold creds but **not** a session — default to least capability and confirm
   with the operator before claiming authenticated reach.

if the preflight fails, do **not** silently continue as blackbox — surface
"greybox creds did not validate (HTTP {code} / MFA challenge)" so the operator
can re-supply. only after a clean preflight: apply the validated session to every
authenticated test.

## step 3 — taxonomy print (once, at session start)

emit a deterministic block. plain text, lowercase, colon-delimited, no decoration.

### mode=redteam

```
loaded for red team: {N} skills
  mindset:    redteam-mindset
  platform:   {fingerprint-matched skills (<=8, tier order), or "none detected"}
  deferred:   {platform skills past the 8-cap, or omit line if none}
  auth:       hunt-ato, hunt-auth-bypass, hunt-saml, hunt-oauth, hunt-mfa-bypass
  inj:        hunt-rce, hunt-sqli, hunt-ssrf, hunt-file-upload
  infra:      hunt-http-smuggling, hunt-cloud-misconfig
  stack:      hunt-sharepoint, hunt-aspnet
  ir:         mid-engagement-ir-detection
```

### mode=wapt

```
loaded for wapt ({blackbox|greybox}): {N} skills
  inj:        hunt-xss, hunt-sqli, hunt-ssrf, hunt-rce, hunt-xxe, hunt-ssti, hunt-file-upload
  authz:      hunt-idor, hunt-auth-bypass, hunt-ato
  auth:       hunt-oauth, hunt-saml, hunt-mfa-bypass
  api:        hunt-graphql, hunt-api-misconfig
  logic:      hunt-business-logic, hunt-race-condition
  infra:      hunt-http-smuggling, hunt-cache-poison
  recon:      hunt-subdomain
  cloud:      hunt-cloud-misconfig
  ai:         hunt-llm-ai
  stack:      hunt-aspnet, hunt-sharepoint, hunt-ntlm-info
  misc:       hunt-misc, hunt-csrf
  reporting:  bb-methodology, security-arsenal, triage-validation
```

## subagent scope inheritance

if any part of the hunt is delegated to subagents, scope does **not** inherit
implicitly. every subagent prompt must carry:

1. **the authorized host list, verbatim, as data.** not "the target estate", not
   "*.target.com" — the explicit list. a subagent cannot infer the boundary.
2. **the discovered-host rule:** hosts found mid-run (via CT logs, CSP headers,
   JS bundles, CNAME chains, error messages) are **report-only**. record and hand back; DNS resolution also requires authorized network scope. never probe, never write, until the operator re-authorizes.
3. **a deny-list of action-executing endpoints, applied BEFORE any allow-list.**
   names are a warning heuristic, not an action-safety guarantee; verify documented endpoint semantics and explicit allowlisted method/resource operations. Deny suspicious names such as: `refund`, `settle`, `payout`, `transfer`, `adjust`,
   `disburse`, `create`, `update`, `delete`, `rotate`, `reset`, `send`, `initiate`,
   `generate`, `process`. only then allow read-shaped names. order matters —
   a path like `refund/batch/status` matches the read-shaped keyword "status"
   but is a refund route; an allow-list applied first would probe it.
4. **"read-only" spelled out as forbidden verbs**, not as an adjective. "read-only"
   is routinely interpreted as "don't be destructive", which does not stop an agent
   sending `{}` to an endpoint whose name starts with `generate*` and creating a
   real record on production.

**lesson from an authorized engagement:** a subagent was told READ-ONLY and still
(a) created a live record on production because it expected `{}` to return a
validation error, and (b) wrote an object to a cloud bucket that was never on the
authorized list — one the parent prompt had named only for a DNS check. both were
disclosed in the deliverable. the fix is structural: pass scope as data, deny
by verb before allowing by verb, and treat every discovered host as out of scope
until told otherwise.

## step 4 — return control to /hunt

after taxonomy print, return a plan to the authorized host/operator. No `/hunt` orchestrator or delegation engine is bundled; delegation requires host/user authority and exact scope/budget propagation. do not run probes here — this skill only loads context.

## privacy

never echo back, log, or persist:
- SOW / scope-of-work / engagement-letter content
- grey box credentials (kept in session memory by `/hunt`, never written to disk)
- client identifiers in user-level memory

---

## Related Skills & Chains

- **`bb-methodology`** — When PART 0 mode confirmation completes. Workflow primitive: `bb-methodology` confirms engagement type (red team vs WAPT vs bug bounty); the answer feeds directly into this skill's `mode=redteam` / `mode=wapt` invocation.
- **`redteam-mindset`** + **`mid-engagement-ir-detection`** — When `mode=redteam` is loaded. Workflow primitive: these are the always-on skills loaded first by step 2 of the redteam flow before any platform skill or hunt-* skill.
- **`okta-attack`** / **`m365-entra-attack`** / **`enterprise-vpn-attack`** / **`vmware-vcenter-attack`** / **`cloud-iam-deep`** / **`supply-chain-attack-recon`** / **`apk-redteam-pipeline`** — When fingerprint signals match. Workflow primitive: step 1's curl fingerprint scan against `recon/<target>/live-hosts.txt` maps banner / domain signals to one or more of these platform skills.
- **`hunt-rce`** / **`hunt-sqli`** / **`hunt-ssrf`** / **`hunt-ato`** / **all other hunt-* skills`** — When the mode-specific skill set is being printed. Workflow primitive: this skill is the loader; it names the hunt-* skills but does not run probes — actual hunting happens after step 4 returns control to `/hunt`.
- **`report-writing`** vs **`redteam-report-template`** — When the taxonomy print specifies the report format. Workflow primitive: `mode=wapt` ends with `report-writing` as the deliverable format; `mode=redteam` ends with `redteam-report-template` instead.

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; review separately obtained official tools and provenance before installation.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.

Example offline outcome: supplied evidence shows Next.js markers on host A but no approved baseline capture. Report `candidate: hunt-nextjs; baseline: not collected; probes: none; authorization: read-only supplied artifacts` rather than claiming the skill was executed or the host tested.
