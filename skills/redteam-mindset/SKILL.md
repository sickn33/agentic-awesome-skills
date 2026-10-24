---
name: redteam-mindset
description: Red-team operator discipline
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
sources: authorized-engagement
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

## When to use this skill

Trigger when:
- Engagement scope says "red team", "adversary emulation", "assume breach", "TIBER-style"
- You're tempted to retract a finding because reproducibility failed once
- You're tempted to call a defense "working as intended" instead of probing further
- You hit a blocker (captcha, rate limit, WAF, CA-block, lockout) and consider stopping
- You're about to spend time on IDOR/CSRF/XSS instead of access-yielding bugs
- You found a vuln on app A and there are sister apps B, C, D you haven't touched

DO NOT use for:
- Bug bounty programs (use bug-bounty skill — different scope rules)
- WAPT/PCI-style assessments (use OWASP-aligned skills)
- Pure compliance audits

---

## The one-line summary

**Red team scope = "gain access, prove impact". Bug bounty / WAPT scope = "find a bug, write a report".**

These produce DIFFERENT decisions at every blocker. Internalize the difference before starting.

---

## Persistent work within the rules of engagement

Continue useful testing within the exact approved assets, techniques, time window, rate and credential-attempt limits. Existing explicit authorization need not be re-requested for routine in-scope work, but “full engagement” never authorizes unspecified third-party assets, purchases, tool installation, persistence, data extraction or bypassing an agreed stop condition. The confirmation gate above and the engagement rules remain controlling.

Use a finite prioritized test plan. Report what was tested, omitted, blocked and inconclusive; no fixed number of classes or requests certifies complete coverage. Respect lockouts, rate limits and availability signals. Stop at the minimum harmless evidence; prefer synthetic test data and test accounts. Three real records are not an automatic allowance, and neither a missing check nor a count alone proves impact.

Shared infrastructure, robots.txt, sitemaps and app catalogs produce leads, not authorization. Verify each asset against scope before probing. Reuse a confirmed technique only after checking its effects on the next approved asset. Do not turn background work into unattended credential attempts or extraction.

---

## Mindset correction #1 — The blocker is data, not the stop sign

**Anti-pattern (what I did wrong):**
> "Recheck under load showed no timing differential — recanting the SQLi as indeterminate."

**The correct frame:**
> "Preserve the original timing samples, then investigate the failed recheck with interleaved controls and enough comparable observations. Three samples alone do not establish statistical certainty; downgrade to historical or inconclusive when current reproducibility is missing."

When a defense suddenly appears mid-engagement:
1. **Original PoC artifacts are forever** — capture them BEFORE recheck. Screenshots, request/response pairs, timing samples.
2. **Diff the response** — body size, headers, cookies, response time. The change tells you what the client deployed (WAF rule? Hotfix? Geo block?).
3. **The deployed mitigation is itself a finding** — positive operational observation about IR responsiveness.
4. **Try alternative vectors** — slower-paced timing, encoded keywords, different injection contexts, cookie injection, header injection.
5. **Document both states** — "vulnerable at T0, mitigated at T0+30min, response behavior changed; mitigation layer not established".

**Rule:** preserve earlier evidence and investigate differences; correct or retract findings when the evidence no longer supports them.

---

## Mindset correction #2 — Sister-app pattern recognition

**Anti-pattern:**
> "I confirmed SQLi on /app-a/. Moving on to other tasks."

**The correct frame:**
> "Same backend, same code template likely → /app-b/, /app-c/, /app-d/, /app-e/ (sibling apps on the same employee-portal host) are all probable. Test them with the SAME payload."

When you confirm a vuln on app A:
1. **Identify shared infrastructure** — same IP, same load balancer, same TLS cert, same response headers, same session cookie name, same login form HTML.
2. **Identify shared code template** — same form fields, same error messages, same view structure, same framework version.
3. Verify each sibling is in scope; use a harmless adapted control and record results separately.
4. **Document the class of vulnerability** — "vulnerability is in shared form-handler template across N apps", not just one finding.
5. **Recommend class-fix** — fix the shared template, not just one app.

The authorized-engagement case: SQLi confirmed on one sub-app (`<app-A>`); four sibling sub-apps (`<app-B>`, `<app-C>`, `<app-D>`, `<app-E>`) sit on the same employee-app host with similar form patterns — likely all share the same vulnerable template. Should have been a multi-app finding.

---

## Mindset correction #3 — WAPT vs Red Team scope discipline

**Skip these in red team scope (they don't yield access):**
- IDOR (cross-user read/write *without* an ATO / privilege-escalation / sensitive-data-exfil chain — WAPT class). NOTE: IDOR is NOT a blanket-skip. IDOR on admin/role-assignment endpoints yields privilege escalation; on password-reset or session objects yields ATO; on file-download or PII handlers yields exfil; on token/key endpoints yields credential capture. Pursue those per the decision rule below.
- CSRF (state-change-via-tricked-user — WAPT class)
- Reflected XSS (without account-takeover chain — WAPT class)
- Missing security headers (WAPT class)
- Cookie hardening flags (WAPT class)
- Verbose error messages without sensitive data (WAPT class)
- DoS (out of scope per engagement rules typically)
- Username enumeration (intel-gathering, not access)

**Pursue these (they DO yield access):**
- SQL injection (data exfil → DB creds → lateral)
- Command injection / RCE (foothold)
- File upload → webshell (foothold)
- LFI/RFI (config reads → DB creds → access)
- SSRF (cloud metadata → IAM → cloud access)
- Authentication bypass (parameter manipulation, JWT alg=none, header injection)
- Hardcoded credentials in mobile/JS bundles
- Default credentials on admin panels
- SAML XSW / signature stripping (session hijack)
- Cisco ASA / Citrix / Pulse / Fortinet SSL VPN CVEs (network foothold)
- ManageEngine / Confluence / Atlassian RCE CVEs (foothold)
- Kerberoasting / AS-REP roasting (post-foothold, but enumerate from outside if possible)

**Decision rule:** if the bug, exploited fully, doesn't lead to a session/token/foothold or sensitive data exfil, it's WAPT-class — note it briefly but don't burn time on it.

---

## Mindset correction #4 — Aggressive default, not conservative default

**Anti-pattern:**
> "Tested 30% of the websites and called it comprehensive."

**The correct frame:**
> "Until I've actively probed every login form, every API endpoint, every parameter, every CVE-matched version, the engagement is not done."

Aggressive defaults:
1. **Probe every live host** for top 20 paths (admin, api, login, /.git, /.env, server-status, swagger, openapi.json, robots.txt, /actuator, /healthz, etc.)
2. **For every login form discovered**, choose relevant harmless checks within the approved credential-attempt cap; never reuse leaked third-party credentials
3. **For every JS bundle**, grep for hardcoded API keys, JWT, base URLs, hidden endpoints, admin paths
4. **For every API endpoint**, check OPTIONS preflight, missing-auth response, alg=none JWT, X-Forwarded-User header injection
5. **For every mobile app**, decompile + grep for secrets + check pinned certs + identify exported components
6. **For every "out of scope" SaaS** that's on a corp subdomain, confirm with client — vendor-managed doesn't mean immune (CVE-2022-47966 went unpatched on many on-prem ME-SDP installs)

**Rule:** report achieved coverage and gaps against the agreed plan; exhaustive probing is not always feasible or necessary.

---

## Mindset correction #5 — Persistence beats elegance

**Anti-pattern:**
> "Tesseract failed on 3 captchas, gave up, declared captcha bypass not feasible."

**The correct frame:**
> "Tesseract failed. Decision tree: try preprocessing (binarize, denoise, upscale, multi-PSM), then trained-model OCR, then paid solving service ($5/mo for engagement-grade volume), then session-bound captcha replay attack. A real attacker WILL invest the $5."

Decision-tree for blockers:

**Captcha:**
1. Omit field → check if required
2. Empty value → check validation
3. Reuse value across multiple submits → check session-bind
4. Tesseract with preprocessing
5. Trained-model OCR (deep-text-recognition-benchmark, calamari-OCR)
6. A third-party solving service would require separate spending/privacy authorization; otherwise report the boundary.
7. Audio captcha if available (much weaker)

**WAF:**
1. Slower pace
2. Encode the payload (URL, hex, base64, mixed case)
3. Different injection context (cookie, header, JSON)
4. Different HTTP verb
5. Different content-type (multipart, application/json)
6. Bypass at the host level (X-Forwarded-Host, X-Original-URL)
7. Probe origin server directly (find via certificate transparency)

**Rate limit or availability warning:** slow or stop as agreed, honor retry guidance, and coordinate with the owner. Do not rotate sources to evade a safety limit. A failed test is inconclusive unless supported controls establish resistance; it does not require endless alternate vectors.

---

## Mindset correction #6 — Real-time IR observation is a finding

When the client SOC patches mid-engagement (you observe a vulnerability disappear during your test):
- **Treat it as evidence**, not as a failure
- **Capture timestamps** before and after the change
- **Document as positive operational finding** — "client SOC detected and mitigated within X minutes; mitigation deployed at WAF/code level"
- **Verify the mitigation depth** — identify the actual layer using evidence, not an assumed WAF/code distinction
- **The original PoC remains the vulnerability finding** — patching doesn't erase it

This is its own skill: see `mid-engagement-ir-detection`.

---

## Mindset correction #7 — Multi-technique cross-validation

For every "vulnerable" finding, prove via 2+ techniques:

| Vuln class | Primary | Cross-check |
|---|---|---|
| Time-based blind SQLi | SLEEP() differential | Different SLEEP variants (3 distinct payloads min) |
| Boolean blind SQLi | Body-size differential | Different boolean comparisons |
| Error-based SQLi | Error message reflection | UPDATEXML + EXTRACTVALUE both |
| RCE | Command output reflection | OOB callback (interactsh DNS) |
| LFI | File content reflection | Different file paths, different encodings |
| SSRF | Internal-only response | OOB callback (interactsh DNS) |
| Valid credential (M365) | ROPC + AADSTS53003 | Authorized test-account flow and verified authentication state; a CA error alone is inconclusive |
| Auth bypass | Logged-in landing page | Session cookie persistence on subsequent request |

A single signal can be coincidence (network jitter, server hiccup, cache). Independent, controlled signals improve confidence but are not automatically definitive. DNS proves a lookup, not necessarily an HTTP request or internal access; authentication error codes alone do not prove a reusable credential.

---

## Mindset correction #8 — Engagement journal discipline

Real-time, append-only, structured:

```jsonl
{"ts":"2026-05-08T14:40:53","ip":"<src-ip>","tool":"m365_validator","target":"login.microsoftonline.com","payload_ref":"synthetic-test-credential-01","resp_code":400,"resp_body_size":154,"resp_ms":1280,"aadsts":"AADSTS53003","verdict":"VALID_CA_BLOCK","notes":""}
```

Why:
- Forensic record of what was tested and when
- Surfaces patterns (clustering, timing changes, error code distribution)
- Becomes evidence for the report
- Survives into next engagement as priors
- Differential analysis: "What changed between window A and window B?"

**Anti-pattern:** ad-hoc shell commands with no logging. You will lose the original PoC timestamp when you need it most (recheck failed, can't prove the original signal was real).

---

## Mindset correction #9 — Time is the constraint, not skill

A real adversary has months. You have an engagement window (weeks). Decisions:
- **Don't pre-judge feasibility** — if a dumper would take 6 hours, schedule only explicitly authorized bounded work with a kill switch; do not run unattended extraction.
- **Parallelize.** Run multi-target tests concurrently. Burn CPU, not wall-clock.
- **State persistence.** Engagements span multiple sessions. State files (`engagement_log/`) make Wednesday's work usable on Friday.
- **Background long-running jobs** — kick them off, set monitors for events, do other work in parallel.
- **Don't repeat yourself** — if you tested target X with payload Y on Tuesday, Wednesday you should know that without re-testing.

---

## Pre-engagement checklist

Before starting a red team engagement, confirm:

- [ ] Scope clear (subdomains in/out, SaaS in/out, phishing in/out, implant in/out)
- [ ] SOW + EL/RoE referenced
- [ ] Test IPs allocated and logged (IP_LOGS table or equivalent)
- [ ] State file initialized (`engagement_log/` with attempt counter, results JSONL, IP log)
- [ ] Hard-cap for cred attacks decided (1 or 2 per user lifetime)
- [ ] Kill-switch thresholds set (max LOCKED in run, max errors in window)
- [ ] Crown-jewel target identified (what does winning look like?)
- [ ] Critical-finding-discuss protocol agreed (when to pause and notify)
- [ ] Burp proxy as default for evidence capture
- [ ] Engagement journal initialized

---

## During-engagement checklist

Every 30 minutes ask:

- [ ] Am I making progress, or stuck?
- [ ] Have I logged the last test result to the engagement journal?
- [ ] Is the IP I'm testing from logged?
- [ ] If I confirmed a vuln: have I tested sister apps with same backend?
- [ ] If I hit a blocker: did I try the next vector in the decision tree?
- [ ] If I'm tempted to "stop" — am I sure scope is exhausted, or am I just tired?

---

## Post-engagement checklist

Before declaring done:

- [ ] All findings have at least 2 cross-technique confirmations
- [ ] Each finding's PoC is reproducible in <5 minutes by another tester
- [ ] Original PoC artifacts (screenshots, request/response, timing samples) preserved
- [ ] Mid-engagement IR observations documented as findings (positive ops)
- [ ] Active-attacker observations documented (lockout differentials, etc.)
- [ ] Sister-app sweep complete for every shared-infra finding
- [ ] State files preserved for future engagement
- [ ] Tooling gaps logged (what would have changed outcomes)

---

## Anti-patterns to flag immediately

If you catch yourself thinking any of these, STOP and reconsider:

- "It's not vulnerable" (have I tested 3 vectors? have I tested sister apps?)
- "The defense is working" (have I tried alternative payloads? slower pace? different protocol?)
- "Recheck failed so it must have been a false positive" (NO — investigate the delta)
- "OCR did not work" (record it honestly; paid services need their own authorization)
- "Mobile app is years old, probably nothing useful" (hardcoded URLs and tokens often outlive the engineering team's memory)
- "SaaS, so nothing to test" (vendor patches centrally — usually true, but tenant config gaps are NOT central)
- "We've tested enough" (use the during-engagement checklist; if any answer is "no", keep going)
- "The exfil would take too long" (prefer synthetic minimal proof and document the limitation)

---

## When to stop

Stop on user direction, scope uncertainty, expired window, spent budget/attempt cap, lockout, service instability, unexpected sensitive data, missing authorization or no measurable progress. Stop escalation once the agreed proof is obtained. Preserve a receipt and clear remaining work; do not present a blocked or partial assessment as comprehensive.

---

## Bridge to neighboring skills

After internalizing this mindset, layer the technique-specific skills:
- `m365-entra-attack` — M365 credential attack chain
- `mid-engagement-ir-detection` — turning client SOC patches into findings
- `hunt-sqli` — SQL injection across techniques
- `hunt-rce` — RCE across vectors
- `bug-bounty` — for distinguishing red-team vs bb scope when working dual-track

This skill is the operational discipline; those are the techniques.

---

## Related Skills & Chains

- **`recon-scope-triage`** — Before the "aggressive default, probe every live surface" directive can be applied safely, you must know which surfaces are actually the target's. Engagement flow: ASM/recon dataset received → `recon-scope-triage` clears namespace-collision noise + soft-404 false positives → only owned, verified assets enter the test queue. Skipping this wastes the engagement on other companies' assets (and risks attacking innocent third parties).
- **`hunt-spa-api`** — Operationalizes the "harvest JS bundles" cadence line into a full play: SPA JS → backend API map → unauthenticated broken-access-control testing. On a real engagement this play (not any scanner) found the apex Critical. Engagement flow: live SPA/`console`/`app`/`api` host identified → `hunt-spa-api` → test each route family unauthenticated against a gated-sibling control.
- **`hunt-dispatch`** — Once mindset is loaded, the `/hunt` command needs a mode answer (redteam vs wapt, blackbox vs greybox) before it routes to platform-specific skills. Engagement flow: red-team mindset triggered → confirm engagement mode (`bug-bounty` vs red-team vs pentest per project memory) → invoke `/hunt` → `hunt-dispatch` loads the right cluster (M365 / SharePoint / VPN / vCenter / APK).
- **`mid-engagement-ir-detection`** — Red-team mindset says "behavior changes ARE findings"; this skill operationalizes that. Engagement flow: red-team engagement underway → baseline established at session start → response patterns shift mid-test → `mid-engagement-ir-detection` captures the SOC-patch state as a NEW finding (defensive-action observed = client capability metric). Don't dismiss it as "the bug got fixed."
- **`redteam-report-template`** — Red-team deliverable is NOT a bug-bounty report; different audience, different tone, different cadence. Engagement flow: findings collected throughout engagement → at session close, package via `redteam-report-template` (Subject / Observations / Description / Impact / Recommendation / PoC) for client-facing DOCX, not `report-writing` which is for H1/Bugcrowd/Intigriti platforms.
- **`triage-validation`** — Red-team mindset includes "don't retract too fast" — the 4 retractions from an authorized engagement were mindset failures, not validation failures. Engagement flow: every finding through `triage-validation` 7-Question Gate, but with the red-team adjustment that "exploitable only with chain" is still a finding, not a no-finding.
- **`evidence-hygiene`** — Red-team engagements often span weeks; without disciplined evidence capture the deliverable suffers. Engagement flow: red-team mindset triggered → set up `evidence-hygiene` capture cadence (screenshots, request/response dumps, timestamped logs) at session start, not at session close.

## Limitations

- Historical engagement anecdotes, request counts and payout/cost comparisons are not validation evidence. A response change does not establish SOC detection or patch timing without corroboration. Preserve provenance and label hypotheses, historical findings and current reproducibility distinctly.

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
