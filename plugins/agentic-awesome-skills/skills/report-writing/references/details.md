# Details (moved from SKILL.md)

> Extended reference content for `report-writing`, kept under `references/` so the entrypoint stays within the audit budget.

## CVSS 4.0 QUICK REFERENCE (newer programs)

CVSS 4.0 replaced CVSS 3.1 in November 2023. Some newer programs require it.

### Key Differences from CVSS 3.1

| Metric | CVSS 3.1 | CVSS 4.0 |
|---|---|---|
| Attack Vector | Network/Adjacent/Local/Physical | Same |
| Attack Complexity | Low/High | Low/High |
| **NEW**: Attack Requirements | (didn't exist) | None/Present (replaces some PR/UI) |
| Privileges Required | None/Low/High | Same |
| User Interaction | None/Required | None/Passive/Active |
| Scope | Unchanged/Changed | REMOVED |
| **NEW**: Sub-Impact metrics | (didn't exist) | Vulnerable/Subsequent system impact |

### CVSS 4.0 Score Examples

| Finding | CVSS 4.0 Score | Vector |
|---|---|---|
| Unauthenticated RCE | 10.0 | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H |
| IDOR read PII, auth required | 6.9 | CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N |
| Stored XSS, admin views it | 8.2 | CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:P/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N |
| SSRF → cloud metadata | 8.7 | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:H/SI:H/SA:N |

### Quick CVSS 4.0 Calculator
```
Use: https://www.first.org/cvss/calculator/4.0
Key fields:
  VC/VI/VA = Vulnerable System Confidentiality/Integrity/Availability
  SC/SI/SA = Subsequent System (downstream impact)
  AT = None (no special condition) | Present (race/specific config needed)
  UI = None | Passive (victim visits URL) | Active (victim takes explicit action)
```

**Practical rule**: If program uses CVSS 4.0 and you don't know the vector, use the calculator and include the full string starting with `CVSS:4.0/AV:...`. Programs cannot dispute a valid vector string.

---


## HUMAN TONE GUIDELINES

**Write to a person, not a system:**
- Triagers are tired. Get to the impact in sentence 1.
- Use "I" not "the researcher" — you found it, own it
- Short paragraphs, bullet points for steps
- Hyperlink relevant docs if needed

**Escalation language (when payout is being downgraded):**
```
"This vulnerability does not require any special privileges — only a free account."
"The exposed data includes [PII type], which is subject to GDPR requirements."
"An attacker can automate this with a simple loop — all [N] records in minutes."
"This is exploitable externally without network access to any internal system."
"The impact is equivalent to a full data breach of [feature/data type]."
```

**Avoid:**
- Jargon the triager might not know
- 5-paragraph explanations of what IDOR is (they know)
- Theoretical chains ("could be combined with X to...")
- Passive voice ("it was observed that...")
- Qualifying language ("seems to," "appears to")

---


## STEPS TO REPRODUCE FORMAT (triager-optimized)

```markdown
**Setup:**
- Account A (attacker): email=attacker@test.com, ID=111
- Account B (victim): email=victim@test.com, ID=222
- Both created via normal registration — no special access

**Steps:**

1. Log in as Account A
2. Send this request (replace `111` with victim ID `222`):

\```
GET /api/v2/resource/222 HTTP/1.1
Host: target.com
Authorization: Bearer ACCOUNT_A_TOKEN
\```

3. Response contains Account B's private data:

\```json
{"id": 222, "email": "victim@test.com", "name": "Victim User", "address": "..."}
\```

**Expected:** 403 Forbidden
**Actual:** 200 OK with victim's private data
```

---


## Related Skills & Chains

- **`triage-validation`** — When deciding whether to write a report at all. Workflow primitive: NEVER open this skill before `triage-validation`'s 7-Question Gate passes; a finding that fails the gate should be killed, not written up.
- **`bugcrowd-reporting`** — When the target is a Bugcrowd program. Workflow primitive: this skill's body template is the foundation; `bugcrowd-reporting` overlays VRT selection, severity-request paragraph, OOS-clause rebuttals on top.
- **`evidence-hygiene`** — When PoC screenshots / HARs are being attached to the report. Workflow primitive: every artifact referenced in the "Supporting Materials" / "Proof of Concept" section gets routed through `evidence-hygiene` for cookie + PII redaction before attachment.
- **`redteam-report-template`** — When the engagement is an external red team (NOT bug bounty). Workflow primitive: confirm engagement mode via `bb-methodology` PART 0; if red-team, swap this skill out for `redteam-report-template` (different audience, different structure: Subject / Observations / Description / Impact / Recommendation / PoC).

---


## Operator Notes (Claude-BugHunter)

> Engagement-derived additions to the vendored foundation. Wisdom from real
> authorized engagements + Phase 2 verification across this repo's 31+
> skill-area live tests. The upstream methodology covers the WHAT; this
> layer covers the WHEN-IT-ACTUALLY-WORKS and the FAILURE-MODES.

### Title formula in practice

`<asset> | <bug class> | <impact>` — three components, no fluff. Triagers read titles in roughly three seconds and use them to order the queue.

- BAD: "Interesting finding on /api/users"
- BAD: "IDOR vulnerability in API"
- GOOD: "Authenticated IDOR on /api/users/{uid} -> admin email + role disclosure"
- GOOD: "Unauthenticated SSRF on /preview?url= -> AWS metadata 169.254.169.254 reachable"

The bad titles get opened last. The good titles get opened first. Same finding, different queue position, different triage day, different payout speed.

### What triagers actually read

Their reading sequence on a fresh report:

1. **Title** (3 seconds)
2. **First paragraph of impact / summary** (15 seconds)
3. **The curl command or HTTP request block** (30 seconds)
4. **Reproduction steps** (only if the first three were convincing)
5. **Everything else** (only on follow-up review)

Optimize the top of the report ruthlessly. Save narrative for the middle. Triagers who are convinced by step 3 will rubber-stamp the rest; triagers who aren't convinced by step 3 won't read step 5.

### CVSS 3.1 vs Bugcrowd VRT vs H1 default severity

These three systems disagree about 30% of the time. The most common gap: a finding that scores CVSS 7.x (High) maps to Bugcrowd P4 (Low) or H1 Medium-default. When the platform default rates lower than CVSS:

1. **File the severity-request paragraph as the first body section.** Bugcrowd respects this. (See `bugcrowd-reporting` for the canonical template.)
2. **Anchor the request in CVSS vector string + business impact, not feelings.** "CVSS 3.1 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N = 7.5 High because Confidentiality:High applies to cross-tenant data exposure."
3. **Cite the platform's own VRT entry** that matches your finding. Don't argue against the platform; route within it.

An authorized bug-bounty engagement saw P4-default findings escalated to P3 via the severity-request paragraph. The escalation isn't automatic — you have to ask, with grounded reasoning, in the first body section.

### Evidence rotation

Everything in the submission body is logged forever by the platform. Operate accordingly:

- Use throwaway test accounts created specifically for the engagement.
- Rotate cookies / tokens after each submission (don't reuse the cookie that's pasted in the report).
- Never paste production cookies, real user emails, or real PII into the report body — redact in the PoC step.
- Screenshots of admin panels: blur the user list, blur the URL bar if it contains tokens.

Cross-link `evidence-hygiene` for the full capture-and-redact protocol.

### Templates by platform — when they differ

| Platform | Tone | Required Structure | Severity Mechanism |
|---|---|---|---|
| HackerOne | Narrative | Summary -> Steps -> Impact -> Suggested fix | Triager-set, contestable |
| Bugcrowd | Structured | Severity request -> VRT category -> Title -> Body -> Remediation | VRT-default + manual override paragraph |
| Intigriti | Between | Summary -> PoC -> Impact -> Recommendation | Researcher-proposed, triager-confirmed |
| Immunefi | PoC-first | Working PoC code -> Walkthrough -> Impact -> Severity | Foundry/Hardhat code is the primary deliverable |

Picking the wrong template style costs validity. A narrative-heavy Bugcrowd report misses the VRT mapping the triager needs; a structured H1 report reads as terse and gets follow-up questions that delay payout.

### The single biggest report-writing mistake

Claiming an attack works "in theory" or "could be chained to [bigger impact]" without demonstrating it. Triage-validation Q6 (impact beyond technically possible) kills these on the validation side; report-writing has to mirror it on the writing side.

Two valid paths:

1. **Show concrete impact end-to-end.** Capture the chain on a test account. Paste the full request/response sequence. Done.
2. **Downgrade the severity claim to match what you actually demonstrated.** "IDOR on /api/users/{uid} reading email + role" is real and reportable; "IDOR chained to potential admin takeover" is not until you demonstrate the takeover.

Pick one. Never split the difference with "could potentially" or "may allow" — those phrases are the triager's signal that the report is theoretical, and theoretical reports get N/A.
- **`bb-methodology`** — When Phase 5's report-writing step starts. Workflow primitive: Phase 5 calls `/report` which loads this skill for the platform-specific template (H1 / Bugcrowd / Intigriti / Immunefi).

