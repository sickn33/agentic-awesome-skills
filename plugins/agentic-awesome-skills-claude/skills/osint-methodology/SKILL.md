---
name: osint-methodology
description: Comprehensive OSINT methodology for external red-team operations and
  authorized attack-surface assessments.
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
sources: community, public_research
version: 2.3
triggers:
- external recon
- external red team
- red team external
- attack surface management
- attack surface mapping
- ASM
- perimeter recon
- target reconnaissance
- bug bounty recon
- asset discovery
- footprint
- attack path
- identity fabric
- SSO discovery
- IdP fingerprinting
- tenant fingerprinting
- M365 enumeration
- Microsoft 365 recon
- API discovery
- GraphQL introspection
- mobile recon
- APK analysis
- cloud bucket enumeration
- bucket enum
- breach correlation
- secret leak hunt
- origin discovery
- CDN bypass
- WAF bypass
- vulnerability prioritization
- CVE prioritization
- EPSS
- CISA KEV
- phishing infrastructure
- pretext development
- bug bounty submission
- responsible disclosure
- client report
- exec summary
- risk translation
- confidence upgrade
- time budget
- engagement profile
- asset triage
- detection-aware probing
- back-off strategy
- persona rotation
- OSINT methodology
- open source intelligence
- target profiling
- data correlation
- OSINT workflow
- intelligence collection
- OSINT campaign
- recon methodology
- threat actor investigation
- attribution
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

# OSINT Methodology — External Red-Team Edition

## 0. When to use this skill / When NOT

**Use this skill when:**
- Planning or executing external reconnaissance against an authorized target (red team, bug bounty in-scope, ASM engagement).
- Mapping an organization's external attack surface end-to-end (subdomains → assets → exposure → attack paths).
- Investigating a person, entity, or threat actor where evidence discipline matters.
- Tracing cryptocurrency flows, geolocating media, performing image/video forensics, or chronolocating events.
- Building a structured OSINT campaign that needs reproducibility, severity grading, and clean handoffs.
- Producing client-facing deliverables (exec summaries, technical reports, reproduction packages) from offensive engagements.

**Do NOT use this skill when:**
- The user is asking for active exploitation, post-exploitation, lateral movement, AD privilege escalation, malware development, or anything beyond reconnaissance — those are out of scope.
- The user is asking for blue-team / defensive content (SIEM rules, detection engineering) — different domain.
- The target's authorization is unclear and the user is asking you to act against a third-party asset they don't own — see §1 below; gently surface the scope question before proceeding.

---

## 1. Authorization & Legal Posture

This skill is intended for assets the operator owns or has written authorization to assess (red-team rules of engagement, bug-bounty in-scope assets, ASM contracts).

**Soft scope check:** when a user asks you to act against a target whose authorization isn't established earlier in the conversation, ask once before proceeding:

> *"Quick scope check: is this a target you own or have written authorization to assess (e.g., a red-team engagement, in-scope bug-bounty asset, or your own infrastructure)? I want to make sure we stay on the right side of the engagement boundary."*

Once authorization is asserted, proceed without re-asking. If the user explicitly states the engagement type (e.g., "this is for our pentest of acme.com under contract"), you don't need to ask again.

**Always-on guardrails (regardless of authorization):**
- Never weaken auth, rate limits, banners, or any safety control that enforces scope on the target side.
- Never run destructive probes (true SYN scans on production, masscan at line rate, fuzzing/brute-force) outside an explicit DEEP / `--aggressive` mode.
- Never paste real PII, valid credentials, session tokens, API keys, or other secrets into cloud-hosted LLMs or third-party services.
- Never take action against assets outside the documented scope, even if "obviously related" (subsidiaries, vendors, employees' personal accounts, etc.).

---

## 2. Confidence Levels

Every assertion you make during an engagement should carry a confidence level. Three levels:

| Level | Meaning | Examples |
|---|---|---|
| **TENTATIVE** | Plausible based on indirect evidence; unverified. | Snippet-only Google dork match; email pattern inferred from name; subdomain returned by one passive source only; favicon-hash overlap (two hosts share a favicon — could be shared infra, could be a coincidence). |
| **FIRM** | Directly observed but uncorroborated. | Subdomain that resolves to an IP; HEAD-confirmed bucket exists (private); CT-log entry shows certificate; Shodan banner returned. |
| **CONFIRMED** | Multiple independent corroborations OR directly verified. | Live-validated PMAK token (read-only `/me` returned 200); breach corpus + crt.sh + DNS all agree; bucket listable AND files retrievable; user enumerated AND password reset flow returns valid hint. |

**Rule of three for attribution:** require three independent weak signals, OR one strong + one weak, before asserting linkage. Don't single-source attribute.

### 2.1 Confidence Upgrade Workflows

Confidence isn't static — every TENTATIVE asset should have a documented path to FIRM and to CONFIRMED. Use these per-asset-type rules.

| Asset type | TENTATIVE → FIRM | FIRM → CONFIRMED |
|---|---|---|
| **Subdomain** | Returned by ≥2 independent passive sources, OR DNS A/AAAA/CNAME resolves successfully. | Serves on a standard port (80/443/22/etc.) AND HTTP banner / TLS cert / SSH banner returned. |
| **IP** | Discovered via ≥2 sources (passive DNS, ASN lookup, Shodan). | Active probe responds (TCP SYN-ACK on at least one port, or ICMP echo reply). |
| **WebApp** | URL extracted from JS / API / archive but not yet hit. | HTTP request returns 2xx/3xx/4xx (any non-network-error response) AND content-length > 0. |
| **Email** | Generated from a name pattern OR returned by snippet-only dork. | Listed in Hunter.io / EmailRep / IntelX / breach corpus, OR `MAIL FROM`/`RCPT TO` SMTP probe returns 250 (without delivery — abort at DATA). |
| **Bucket (S3/GCS/Azure)** | Permutation candidate; no probe yet. | HEAD returns 200, 301, or 403 (existence confirmed). Then CONFIRMED when GET returns object listing or known object retrieval. |
| **Endpoint (API / wayback)** | Extracted from JS regex / Wayback / Postman. | HTTP request returns non-404 (route exists). Then CONFIRMED when the endpoint's behavior is fingerprinted (auth posture, response shape, rate limits). |
| **Credential / secret** | Matches catalog regex in captured text. | Read-only validator (`/me`, `auth.test`, `sts:GetCallerIdentity`, `/user`) returns success. Then CONFIRMED with documented scope + account ID. |
| **Person** | Name extracted from a single source (LinkedIn / breach / GitHub commit). | Confirmed by a second source (Hunter.io role + LinkedIn profile, or two breach sources with same email). |
| **Repo** | Name match on org keyword in GitHub search. | Repo metadata shows confirmed org/email/website match. Then CONFIRMED when commit-history shows employee involvement. |
| **Mobile app** | Name match in app store. | Ownership-confidence score ≥70 (see companion skill §21). Then CONFIRMED when binary metadata (signing cert, package name, dev account) ties back to target. |
| **Certificate** | Returned by crt.sh once. | CT-log entry confirmed in ≥2 logs. Then CONFIRMED when serving on a discovered host. |
| **SSO tenant** | Discovery-endpoint returns OIDC metadata. | Tenant GUID extracted AND domain resolves through the tenant's expected MX / autodiscover / SP record. |

**Default reporting posture:** never claim CONFIRMED without explicit corroboration. When in doubt, downgrade. Operators trust under-claims more than over-claims.

---

## 3. Output Format Conventions

When you produce findings during an active session, structure each finding to match the schema below — it drops cleanly into asset-management tools.

```
Finding:
  id:           <stable hash or UUID>
  module:       <which technique discovered it; "manual" if hand-found>
  asset_key:    <typed key, e.g. sub:api.example.com or webapp:https://example.com/admin>
  category:     <e.g. SECRET_LEAK, MISSING_HSTS, OPEN_GRAPHQL_API, LEAKED_CRED, SSO_EXPOSURE>
  severity:     <info|low|medium|high|critical>
  confidence:   <tentative|firm|confirmed>
  title:        <one-line summary>
  description:  <2-5 sentences>
  evidence:
    url:        <where it was found>
    timestamp:  <UTC ISO8601>
    sha256:     <hash of any downloaded artifact>
    raw:        <truncated to 2 KiB>
  references:
    - <CVE-ID, advisory URL, vendor doc>
  remediation:  <action the asset owner can take>
```

**Always use UTC timestamps**. Local time creates correlation bugs across notes/screenshots/logs.

---

## 4. Source Hygiene & Citations

For every artifact you capture, record: **URL + UTC timestamp + SHA-256 hash + tool version + run_id**.

- Hash all downloaded files with SHA-256.
- Screenshot in PNG (lossless, smaller than full-page WARC for evidence packs).
- Capture raw HTTP requests/responses, capped at 2 KiB body to keep evidence packs small.
- Use JSONL (NDJSON) logs, one line per event, with a `run_id` so the entire engagement is replayable.
- Separate evidence read-only from working copies; never edit captured artifacts.

When citing a source in your output, prefer durable references (CVE, vendor advisory, ATT&CK technique ID, RFC) over ephemeral ones (a Twitter post, a forum thread). If the only source is ephemeral, archive it (archive.today, Wayback SavePageNow) before citing.

---

## 5. Do NOT (hard rules)

- DO NOT paste creds, session tokens, API keys, real PII, infostealer logs, or unique pivots into cloud LLMs (ChatGPT, Claude.ai, Gemini, Perplexity). Use local models (Ollama, LM Studio, GPT4All) for sensitive analysis.
- DO NOT assume vendor labels are ground truth. Cross-label sanity: TRM, Chainalysis, Arkham can disagree. Treat every label as a hypothesis.
- DO NOT assume 1:1 bridge flows. Bridges/mixers/wrappers introduce mint/burn semantics; validate with on-chain proofs.
- DO NOT assert ownership from a single signal. Favicon-hash overlap, shared CT issuer, shared NS — each is a hypothesis. Need rule-of-three.
- DO NOT run fuzzing, SYN scans, masscan, or `nuclei fuzzing/*` templates outside an explicit DEEP / `--aggressive` mode.
- DO NOT use a credential validator to do anything except read-only verification (no create/delete/send).
- DO NOT mirror-image (assume the target thinks like you do). Separate capability from intent and sponsorship.
- DO NOT confuse correlation with control.
- DO NOT escalate when you encounter active defenses; back off and document (see §6.4).

---

## 6. OpSec

### 6.1 Sock Puppets

A sock puppet is a fake account that cannot be linked to you. Build a posting history, age the account, use it from a separate browser profile.

Resources & techniques:
- Persona generation: [Fake Name Generator](https://www.fakenamegenerator.com/), [This Person Does Not Exist](https://thispersondoesnotexist.com/).
- Browser isolation: [Firefox Multi-Account Containers](https://addons.mozilla.org/firefox/addon/multi-account-containers/), or dedicated profiles per persona.
- Disposable phone numbers: Burner, Silent Link (some platforms reject VoIP — keep a backlog of numbers).
- Hardware passkeys for any high-value persona; store recovery codes offline.
- Audit every browser extension before installation. Supply-chain attacks on popular extensions have repeatedly targeted investigators — assume the popular ones are at higher risk, not lower.
- Maintain chain-of-custody: timestamp every action, hash every key artifact, record tool versions per case.
- Personas should look like real low-engagement accounts: profile photo (synthetic), bio, a few low-effort posts spread across weeks before the persona is "used."

References:
- [Effective Sock Puppets](https://medium.com/@unseeable06/creating-an-effective-sock-puppet-for-your-osint-investigation-95fdbb8b075a)
- [Ultimate Guide to Sock Puppets](https://osintteam.blog/the-ultimate-guide-to-sockpuppets-in-osint-how-to-create-and-utilize-them-effectively-d088c2ed6e36)

### 6.2 Detectability & OpSec Tagging

Every probe leaves a footprint. Tag every operation in your notes with a detectability level so you can reason about the SIEM trail you're leaving on the target's side.

| Tag | Examples |
|---|---|
| **Low** | Passive Shodan InternetDB; CT-log queries (crt.sh); Wayback CDX; passive DNS (SecurityTrails); Hunter.io email enrichment; HTTP HEAD on public buckets; `getuserrealm.srf`; Microsoft OIDC metadata fetch. |
| **Medium** | Microsoft `GetCredentialType` user-enum; Okta `/api/v1/authn` user-enum; Postman API key validation; AWS `sts:GetCallerIdentity` (logs to CloudTrail); Slack `auth.test`; full-page screenshots; Swagger/GraphQL probes against a 28/13-path wordlist; targeted favicon-hash + JARM fingerprinting. |
| **High** | Active port scans (naabu / masscan / nmap); Nuclei full template runs against production; subdomain brute-force at scale; APK download from third-party mirrors; deep-mode user enumeration past N attempts per tenant; SMTP `RCPT TO` enumeration; web fuzzing (ffuf/gobuster). |

When working with a client, document the operations actually run and their detectability tag in the engagement report — clients appreciate knowing what their detection stack should have caught.

**Defaults:** passive by default. Active probes only when (a) explicitly authorized, (b) within agreed maintenance windows, and (c) with the operator's awareness of the resulting log volume.

### 6.3 Validator Discipline

When you discover a credential in the wild (a leaked API key, a sourcemap-exposed token, a hard-coded PMAK in a public Postman workspace), you may want to confirm it's live. Do this with **read-only validators only**.

Discipline:
- Read-only endpoint only (e.g., `/me`, `/whoami`, `auth.test`, `sts:GetCallerIdentity`).
- Never use the validated credential to create, modify, delete, or send anything.
- Tag the validation attempt with detectability — every validator generates an audit-log entry on the provider side.
- Record `checked_at` (UTC), the response (truncated), and the scope/account-ID returned.
- If the operator's rules of engagement forbid validation, mark the credential `validation_skipped_by_policy` and stop.

Concrete validator endpoints (Postman, AWS, GitHub, Slack, Anthropic, OpenAI, npm, Atlassian, DataDog) live in the companion `offensive-osint` skill.

### 6.4 Detection-Aware Probing (signs of detection + back-off)

Your probes will eventually hit detection. Recognize the signs and back off **before** you trip an active response.

**Signs you've been detected (in roughly increasing severity):**

1. **Rate-limit responses** — `429 Too Many Requests`, `Retry-After` header set, `X-RateLimit-Remaining: 0`.
2. **Captcha interstitials** — Cloudflare interstitial page, hCaptcha challenge, AWS WAF page.
3. **WAF page** — explicit "Access denied" with provider branding (Cloudflare, Akamai, Imperva, F5 ASM, AWS WAF, Sucuri).
4. **Status code drift** — endpoints that previously returned 200/401 now return 403 only from your IP.
5. **Banner change** — server header shape or response timing changes consistently.
6. **DNS poisoning back to NXDOMAIN** — target's authoritative servers stop resolving subdomains (probably their CDN took over).
7. **Honeypot bait** — endpoints that look too good (`/admin/db_dump.sql`, exposed `.env` with credentials that don't validate). Real exposures rarely look this clean.
8. **Direct contact** — your sock-puppet email gets a "we noticed unusual activity" message; or, in extreme cases, your IP gets a courtesy abuse-contact email.

**Back-off ladder:**

1. **Slow down.** Halve your concurrency. Add 2–10s jitter between requests.
2. **Switch endpoints.** Stop hitting the path that triggered. Move to a different module of the recon pipeline.
3. **Switch persona.** New User-Agent (rotate among realistic browsers), new TLS fingerprint (different httpx/curl version).
4. **Switch IP.** Rotate to a new egress (residential proxy, Tor for sensitive lookups, a different cloud region).
5. **Pause.** Wait 1–24 hours. Many WAFs have rolling-window IP-based reputation; passive time often resets it.
6. **Document and consult.** If you've hit (3) WAF, (4) status drift, or (8) direct contact, **stop active probing and consult the engagement lead**. Continued probing past these signals risks scope violation.

**Persona / IP rotation rules:**
- Never rotate persona to one that's been used in a prior engagement against the same target.
- Use residential proxies (Bright Data, Smartproxy, IPRoyal) for high-detectability work — but be aware they're sometimes IP-blocklisted by Cloudflare.
- Tor exit nodes are useful for **passive lookups** (CT logs, archive sites) but are blocked by most active-probe targets.
- Cloud egress IPs (AWS / GCP / Azure) are often blocklisted aggressively for recon. Use sparingly.
- Document every rotation with timestamp + reason; reviewers will ask.

**Don't:**
- Don't try to "outsmart" a confirmed WAF block by sending more aggressive payloads. That's how clients get extra logs and how you get caught.
- Don't switch source IPs to evade an explicit block-list — that crosses into evasion territory and may breach the rules of engagement.
- Don't ignore signals because the dashboard says "still up." The probe is being silently logged; the response will come later.

---

## 7. External Red-Team Recon Pipeline

A 5-stage pipeline for any authorized external assessment. Stages are sequential; modules within a stage can run concurrently.

### Stage 1 — Seed Discovery
Establish the ground truth of who/what the target is.

- WHOIS on the seed domain (registrant, dates, name servers).
- ASN enumeration: which AS does the org own/use? (Hurricane Electric BGP Toolkit, RIPEstat, BGPView.)
- DNS records (A/AAAA/MX/TXT/NS/SOA/CAA) — records-only, no walking yet.
- Certificate Transparency history for the root domain (crt.sh, Censys).

### Stage 2 — Asset Expansion
Discover everything that might belong to the target.

- Subdomain enumeration (passive sources first: crt.sh, VirusTotal, AlienVault OTX, Shodan, then permutations and bruteforce).
- Cloud bucket enumeration (S3/GCS/Azure permutations from company name + subdomain stems — see §15).
- Typosquat domain generation (dnstwist variants → resolve → WHOIS) — for both phishing risk and adjacent corp assets.
- Wayback CDX archive endpoints for forgotten paths.
- Mobile app discovery (Android via google-play-scraper, iOS via iTunes Search API — see §14).
- DNS deep walking (NSEC walk on misconfigured zones, AXFR opportunism).
- LinkedIn employee enumeration → email-pattern derivation.

### Stage 3 — Enrichment
Add depth to the discovered assets.

- Port + service detection (Shodan InternetDB free → naabu/masscan if authorized).
- Live TLS handshakes (cert chain, JARM, favicon mmh3 hash).
- Web tech detection (Wappalyzer-style ~600 signatures via httpx).
- WAF/CDN inference (header markers).
- Origin discovery if behind CDN (see §27).
- Security header audit.
- Bulk screenshots (triage 1000s of hosts visually).
- Email harvesting (6 parallel sources).
- Email security audit (SPF/DMARC/DKIM/BIMI/MTA-STS).
- GitHub code-search dorking (13 dork templates × 29+ secret regexes).
- JavaScript deep analysis (sourcemaps, secrets, endpoints, internal-host leakage).
- SSO/IdP tenant fingerprinting (Entra, Okta, ADFS, Google, SAML, M365 Teams/SharePoint/OAuth — see §11).
- API & auth-map discovery (Swagger/OpenAPI, GraphQL, Postman).
- Secrets-beyond-GitHub sweep (Postman public workspaces, Stack Exchange, Trello/Notion/Atlassian dorks).
- Vendor product fingerprinting (Citrix/F5/PaloAlto/Pulse/Fortinet/Cisco/VMware/Exchange).
- Container / CI-CD / cloud-native exposure check.
- Job posting harvest for tech-stack inference.

### Stage 4 — Exposure Analysis
Convert assets into findings.

- Nuclei (15 always-on built-in checks + optional binary).
- TLS deep audit (sslyze / testssl.sh).
- Breach × identity correlation (HudsonRock Cavalier, HIBP, DeHashed, IntelX, local corpus → SSO_EXPOSURE findings).
- Targeted misconfiguration probes (`.git/config`, `.env`, `phpinfo.php`, `/actuator/env`, `/actuator/heapdump`, `_cat/indices`, `/console`, `/manager/html`).
- Vulnerability prioritization (CVE × EPSS × CISA KEV × public-POC availability — see §28).

### Stage 5 — Reporting
Make the work usable.

- Risk scoring per finding (CVSS + program-specific weights).
- Asset graph export (D3-friendly nodes/links, GraphML, JSON).
- Client-facing report (executive summary + technical detail + remediation — see §31).
- Reproduction package (run_id, tool versions, raw evidence, JSONL log).
- Bug bounty submission (if applicable — see §30).

### 7.5 Pipeline Priority Order (highest signal density first)

When budget is constrained, work in this order:

1. **Breaches** — infostealer logs (HudsonRock Cavalier free tier) + HIBP + DeHashed. Highest ROI for red teams; often gives valid plaintext creds for corp SSO. Requires emails as input.
2. **GitHub recon** — code-search dorks. Finds AWS keys, Slack tokens, JWT secrets, `.env` files. Fastest path to cloud pivot.
3. **Nuclei misconfig sweep** — exposed admin panels, CVEs with public POCs.
4. **Cloud buckets** — permutate company name + subdomain stems. Listable bucket = CRITICAL.
5. **Ports** — Shodan InternetDB first (free, keyless). VPN concentrators, RDP, Jenkins, GitLab-CE, Elasticsearch are the high-value pivot points.
6. **Email OSINT** — feeds breaches; feeds phishing list.
7. **Web tech / WAF / screenshots** — triage thousands of hosts; know the stack before probing.
8. **Wayback** — archived JS often has hard-coded keys; archived endpoints reveal removed admin/dev paths.
9. **DNS deep + email security** — SPF/DMARC gaps enable email spoofing; TXT verification tokens reveal SaaS tenancies.
10. **Certificates** — CT-log timeline catches forgotten subdomains; weak ciphers = cheap findings.
11. **ASN + reverse DNS** — corporate IP space hosts unadvertised infra.
12. **WHOIS** — registrant PII reveals adjacent corp assets.
13. **Typosquat** — actively-registered squats are findings; unregistered ones go on the phishing-domain shortlist.
14. **Security headers** — low standalone value but required for client reports.

### 7.6 Time Budgeting & Engagement Profiles

Stage and asset count drive how long a recon takes. Rough estimates (single operator on a typical SaaS-style target):

| Stage | Small org (<100 employees) | Medium (100–1K) | Large (1K+) |
|---|---|---|---|
| 1. Seed discovery | 30 min | 30 min | 30 min |
| 2. Asset expansion | 1–2 h | 2–4 h | 4–8 h |
| 3. Enrichment (per 100 alive webapps) | ~1 h | ~1 h | ~1 h |
| 4. Exposure analysis | 1–3 h | 3–6 h | 6–12 h |
| 5. Reporting | 2–4 h | 4–8 h | 1–2 days |

**Engagement profiles:**

- **1-hour rapid recon ("how exposed is X?")** — Stage 1 (15 min) → passive subdomain (crt.sh + Subfinder, 10 min) → Shodan InternetDB on resolved IPs (5 min) → email harvest via Hunter+IntelX (10 min) → breach lookup on emails (10 min) → executive-summary-only output (10 min).
- **4-hour focused recon ("phish-readiness check")** — adds: full email harvest, LinkedIn employee enum, SPF/DMARC analysis, typosquat candidate generation, SSO/IdP fingerprinting. Output: phishing-feasibility report + target email list.
- **1-day standard recon** — full Stages 1–4 with the priority order above. Output: per-asset finding list + asset graph + exec summary.
- **1-week deep recon** — all of standard, plus: deep-mode user enumeration, JS deep analysis at full budget, mobile attack surface, cloud-native fingerprinting, vendor product fingerprinting, package registry leak hunting, vulnerability prioritization. Output: full client deliverable package + reproduction bundle.
- **Ongoing monitoring (weekly diff)** — re-run Stages 1–3 weekly; diff against baseline; alert on new asset / new finding / asset disappeared.

**When to abort early:**
- After Stage 1 if scope is wrong (target turns out to be subsidiary of unrelated corp; rules of engagement need clarification).
- After Stage 2 if attack surface is below threshold (no public webapps + no exposed services + no leaked emails → little to find externally).
- During any stage if you hit the WAF / detection signs in §6.4.

---


## Contents

- [8. Asset Graph Discipline](references/details.md)
- [9. Findings Rubric & Severity Mapping](references/details.md)
- [10. Bug-Bounty / Red-Team Pivot Modes](references/details.md)
- [11. Identity Fabric Mapping](references/details.md)
- [12. API & Auth-Map Methodology](references/details.md)
- [13. JavaScript Deep Analysis](references/details.md)
- [14. Mobile Attack Surface](references/details.md)
- [15. Cloud Attack Surface](references/details.md)
- [16. Cryptocurrency Investigation](references/details.md)
- [17. Image Analysis](references/details.md)
- [18. Video Analysis](references/details.md)
- [19. Chronolocation and Time Analysis](references/details.md)
- [20. Threat Actor Investigation](references/details.md)
- [21. People & Social Media Investigation](references/details.md)
- [22. Breach × Identity Correlation](references/details.md)
- [23. Infrastructure OSINT](references/details.md)
- [24. Automation & Case Management](references/details.md)
- [25. Synthetic Media Verification](references/details.md)
- [26. Anti-Patterns & Common Failure Modes](references/details.md)
- [27. WAF / CDN Bypass & Origin Discovery](references/details.md)
- [28. Vulnerability Prioritization (CVE / EPSS / KEV)](references/details.md)
- [29. Phishing Infrastructure & Pretext Development](references/details.md)
- [30. Bug Bounty Submission & Responsible Disclosure](references/details.md)
- [31. Client Deliverable Templates](references/details.md)
- [32. Skill Self-Test](references/details.md)
- [33. Changelog](references/details.md)
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
