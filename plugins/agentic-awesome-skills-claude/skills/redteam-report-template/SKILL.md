---
name: redteam-report-template
description: Client-facing red-team deliverable format
category: security
risk: safe
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Process guidance; no tooling required. Docs-only; upstream templates
  not bundled.
sources: authorized-engagement-deliverable, enterprise-redteam-report-conventions
report_count: 1
---

## When to use

Use this skill for **client-deliverable** reports:
- External red-team engagements with a signed SOW
- Pentest reports going to a CISO / IT-Sec team (not a triager)
- Findings that will be reviewed by both technical and non-technical stakeholders
- Reports that need DOCX/PDF output (not just markdown / platform UI)

Do NOT use for:
- Bug-bounty platform submissions (use `report-writing` / `bugcrowd-reporting` instead)
- Quick proof-of-concept memos
- Internal team writeups

---

## The 6-section format per finding

This is the canonical structure each finding follows:

```markdown
## Finding F##: <descriptive title>

**Severity:** Critical / High / Medium / Low / Informational
**Status:** Confirmed / Patched mid-engagement / Suspected (1 signal)
**CVSS 3.1:** <score> (<vector>)
**Affected Asset:** <URL / IP / app name>

### 1. Subject
<One-line statement of the issue. Plain English, no jargon.>

### 2. Observations
<Bulleted list of what was observed during testing. Concrete facts only — no interpretation yet.>
- <Observation 1>
- <Observation 2>
- ...

### 3. Description
<Technical explanation of the vulnerability. 2-4 paragraphs. Reader should understand WHY the observations indicate a vulnerability, what the underlying flaw is.>

### 4. Impact
<What an attacker could achieve. Concrete attacker outcomes, NOT generic CIA triad statements. Tie to the client's business — money, data, reputation, regulatory exposure.>

### 5. Recommendation
<Specific, actionable remediation. Vendor patch, configuration change, code-level fix. Avoid "implement security best practices" — say what specifically.>

### 6. Proof of Concept (PoC)
<Steps to reproduce, numbered. Include the exact HTTP requests, payloads, tools used.>

**Step 1:** <action>
```http
<full HTTP request or curl one-liner>
```

**Step 2:** <action>
```
<response excerpt>
```

**Screenshot:**
![F##_descriptive_name] (screenshots/F##_descriptive_name.png)
```

---

## Severity & status disciplines

### Severity table (client-facing — different from CVSS-only)

| Severity | Business definition | CVSS rough range |
|---|---|---|
| Critical | Direct revenue/data loss without prerequisites | 9.0-10.0 |
| High | Full account/system takeover with limited prerequisites | 7.0-8.9 |
| Medium | Significant data exposure or partial compromise | 4.0-6.9 |
| Low | Information disclosure with limited exploitation path | 0.1-3.9 |
| Informational | Hygiene finding, no immediate exploit | N/A |

### Status field (red-team-specific)

This is the field that distinguishes red-team deliverables from bug-bounty reports. Use one of:

- **Confirmed** — reproduced multiple times, with full PoC
- **Confirmed; patched mid-engagement** — was reproducible, client patched during the test window (still ship the finding — see `mid-engagement-ir-detection`)
- **Confirmed; partially reproducible** — works but needs specific conditions
- **Suspected (1 signal)** — single indicator, not confirmed (rare — usually drop)
- **Out-of-band** — finding from passive recon, not actively tested

---

## Mistakes to avoid (from authorized-engagement)

### 1. Don't retract findings that stopped reproducing
If a finding was confirmed and then stopped working, that is almost always a CLIENT PATCH, not a finding-was-false. The correct response is "Confirmed; patched mid-engagement" with timestamps showing when it broke. See `mid-engagement-ir-detection`.

### 2. Don't hedge in the Impact section
Bad: "An attacker could potentially be able to access user data, which may lead to..."
Good: "An attacker reads any user's profile data. Demonstrated on test user `victim@target.com` at 14:22 IST."

### 3. Don't generic-CIA the impact
Bad: "Loss of confidentiality and integrity of customer data"
Good: "Read access to 247,000 customer records including PAN cards, addresses, GST numbers. India DPDPA Section 33 mandates 72-hour breach disclosure to DPB."

### 4. Don't list every recon finding as a finding
Recon notes (subdomains found, ports open, technologies fingerprinted) belong in a separate **Recon / Attack Surface** appendix, not the findings list. A finding must have an attacker-attainable outcome.

### 5. Don't bury the PoC
Each finding MUST have reproducible steps. The PoC section is what proves the finding to a skeptical reader. If you can't write the PoC clearly, the finding probably isn't ready to ship.

---

## Document-level structure

```
1. Executive Summary (1 page, non-technical)
   - Engagement overview (dates, scope)
   - Risk posture summary (heat-map: <X critical, Y high, Z medium...>)
   - Top 3 strategic recommendations
   - Comparison to industry baseline (optional)

2. Engagement Details
   - Scope (in-scope, out-of-scope, exclusions)
   - Methodology (recon → exploit → reporting; or align with PTES / OSSTMM)
   - Tools used
   - Timeline (start / end / key milestones)
   - Team

3. Risk Summary Table
   | F# | Title | Severity | Status |
   |----|-------|----------|--------|
   | F01 | ... | Critical | Confirmed |
   ...

4. Findings (one per ## section, in severity order — Critical first)

5. Attack Surface / Recon Appendix
   - Subdomains discovered
   - Open ports / services
   - Technology fingerprints
   - APKs found
   - Credentials in breach corpora (count + sample only — redact)
   - Identity-fabric map (IdP, MFA posture)

6. Indicators of Compromise (IoCs)
   - Source IPs used during testing (so SOC can correlate)
   - User-Agent strings
   - Test accounts created
   - Files uploaded (with cleanup status)

7. Cleanup Statement
   - Confirmation that all test artifacts (accounts, uploads, persistence) were removed
   - Outstanding cleanup items requiring client action

8. Appendices (raw output, screenshots index, full target list)
```

---

## DOCX generation pipeline (markdown → docx with embedded images)

```bash
# Prerequisite: pandoc installed
brew install pandoc

# Convert
pandoc REPORT_FINAL.md \
  -o REPORT_FINAL.docx \
  --resource-path=engagement_log/poc \
  --reference-doc=~/.claude/skills/redteam-report-template/templates/reference.docx \
  --toc \
  --toc-depth=2 \
  --highlight-style=tango

# Verify image count
python3 -c "
from docx import Document
d = Document('REPORT_FINAL.docx')
imgs = [r for r in d.part.rels.values() if 'image' in r.target_ref]
print(f'Embedded images: {len(imgs)}')
print(f'Paragraphs: {len(d.paragraphs)}')
print(f'Headings: {sum(1 for p in d.paragraphs if p.style.name.startswith(\"Heading\"))}')
"
```

### Image filename convention

```
screenshots/F<NN>_<descriptive>.png

Examples:
F01_locked_accounts.png
F02a_saml_landing.png
F02b_saml_ca_block_page.png
F03_sqli_timing_chart.png
F15_saml_metadata.png
```

Variants get letter suffixes (F02a, F02b). Always zero-pad finding number.

---

## Writing tone — for client deliverables

| Section | Tone |
|---|---|
| Subject | Plain English, jargon-free, 1 line |
| Observations | Bulleted facts, past tense ("observed that...") |
| Description | Technical but accessible; assume CISO reader |
| Impact | Business-translated; tie to revenue/regulation |
| Recommendation | Imperative, specific, actionable |
| PoC | Operator-level technical; copy-pasteable |

**Always:**
- Use past tense for observations ("The endpoint returned a 200 status code")
- Use present tense for descriptions of the flaw ("The application does not validate...")
- Use imperative for recommendations ("Apply patch ... by ...")
- Number reproduction steps; never "first... then... also..."

**Never:**
- "Could potentially" — prove it or drop it
- "It might be possible" — same
- "We recommend implementing security best practices" — say which one specifically
- "The application is vulnerable to..." without saying what specifically

---

## Audience translation — same finding, different framing

Example: hardcoded JWT in APK

| Section | Technical framing | CISO framing | Board framing |
|---|---|---|---|
| Impact | "JWT signing key extracted from APK enables forging admin tokens" | "Anyone with the customer-facing mobile app can read any customer's invoice" | "A leaked secret in our mobile app lets attackers impersonate users" |

The same finding's Impact paragraph should cover both ends — start with the business outcome, then drop into technical detail.

---

## Findings that are sometimes wrongly excluded

Red-team deliverables should include — not just bug-bounty payable bugs:

- **Information disclosure that helps attack mapping** (CodeIgniter debug toolbar leaking routes, version banners on appliances) — Medium
- **User enumeration** (Microsoft OneDrive 302 vs 404 differential) — Medium
- **Pre-existing security state observations** (247 accounts already locked by external attacker; weak password policies) — Informational with stakeholder relevance
- **Defensive observations** (SOC patched our SQLi within 30 min — evidence of working detection) — Informational/positive
- **Sister-app pattern issues** (same code template across 7 apps) — Medium (multiplied blast radius)

Bug bounty would reject most of these. Red-team deliverables embrace them — the client paid for the assessment to know.

---

## Mid-engagement events to document

Beyond findings themselves, the deliverable should include:

- Detected SOC responses (timestamps when defenses kicked in)
- Concurrent external attacker activity (if any was observed)
- Findings the client patched during the engagement (with PoC pre-patch as evidence)
- Tooling failures (e.g., MCP timeout, CAPTCHA not solvable) — these affect what was/wasn't testable

Each gives the client context about their real-world detection capability, which often matters more than the findings themselves.

---

## Template library (where to put canned text)

Maintain reusable boilerplate in:
```
~/.claude/skills/redteam-report-template/templates/
    executive_summary.md      # Reusable exec summary skeleton
    methodology.md            # Standard methodology section
    cleanup_statement.md      # Standard cleanup language
    reference.docx            # Pandoc style template (fonts, headings, colors)
    cover.docx                # Cover page template
```

Don't write these from scratch each engagement; clone and customize.

---

## Quality checks before delivery

Pre-delivery checklist:

- [ ] Every finding has all 6 sections populated (no "TBD")
- [ ] Every finding has at least one screenshot or HTTP-level evidence
- [ ] Every PoC includes redactions for client PII (mask emails, phone numbers, IDs)
- [ ] Every screenshot is referenced in the MD with a relative path that resolves
- [ ] DOCX render check — image count matches MD reference count
- [ ] Severity ordering: Critical findings first, then High, etc.
- [ ] Executive summary is updated to match final findings (count, themes)
- [ ] Cleanup statement explicitly says what was created and what was removed
- [ ] IoC section enables the SOC to reconstruct what they saw
- [ ] Spell-check (especially client company name, product names)
- [ ] All tool versions noted in methodology
- [ ] Status field set correctly on every finding (especially patched-mid-engagement)

---

## Bridge to neighboring skills

- `report-writing` — bug-bounty platform reports (different format, different audience)
- `redteam-mindset` — informs what counts as a finding worth shipping
- `mid-engagement-ir-detection` — informs the "patched mid-engagement" status pattern
- `evidence-hygiene` — informs screenshot redaction discipline
- `m365-entra-attack`, `enterprise-vpn-attack`, etc. — each provides finding-templates specific to its attack surface

---

## Anti-patterns

- **DO NOT** write a 50-page report for 3 findings — pad-by-page erodes credibility
- **DO NOT** use the same severity for everything — calibrate
- **DO NOT** copy-paste OWASP top-10 boilerplate into Description sections
- **DO NOT** include findings without PoCs — they read as speculative
- **DO NOT** skip the Recommendation section's specificity — "patch and review" doesn't help
- **DO NOT** mix bug-bounty CVSS scoring with red-team severity unthinkingly — context differs (e.g., a Medium on a CVSS basis can be Critical for the client if it touches a regulated dataset)

---

## Real engagement metric (authorized-engagement)

For calibration:
- 14 findings shipped (2 Critical, 4 High, 5 Medium, 3 Low/Info)
- 18 screenshots embedded
- 52,737 bytes markdown / 2,262,484 bytes DOCX
- 414 paragraphs, 123 headings in DOCX
- 16 inline images (2 were inline in MD-only edge cases)
- Time-to-deliverable: ~6 hours after engagement close for first draft

These numbers are typical for a 1-week external red-team engagement on a mid-size enterprise. Scale down for short tests, up for full purple-team exercises.

---

## Related Skills & Chains

- **`triage-validation`** — This template ingests findings that have ALREADY passed the 7-Question Gate. Engagement flow: every finding through `triage-validation` first → only validated findings → `redteam-report-template` packaging. Skipping triage produces a deliverable padded with informational noise that erodes client trust.
- **`evidence-hygiene`** — The DOCX with 16 embedded screenshots only works if evidence was captured systematically throughout the engagement. Engagement flow: `evidence-hygiene` discipline at session start → timestamped, organized screenshot folder → `redteam-report-template` consumes that folder to populate Evidence blocks.
- **`redteam-mindset`** — The Subject / Observations / Description / Impact / Recommendation / PoC structure assumes the operator already thinks like a red-teamer (impact-first, blast-radius framing). Engagement flow: `redteam-mindset` loaded at engagement start → findings collected with red-team framing baked in → `redteam-report-template` produces deliverable without rewriting every Impact section.
- **`mid-engagement-ir-detection`** — Defensive-action findings (SOC patches mid-test, new IPS rules deployed, account lockouts triggered by external attacker) are first-class findings in red-team deliverables. Engagement flow: `mid-engagement-ir-detection` captures behavior-change events → each becomes its own Subject in the deliverable, framed as "client capability observation" not as "bug we missed."
- **`report-writing`** + **`bugcrowd-reporting`** — Bug-bounty platform reports use DIFFERENT structure (one finding per submission, platform-specific severity scoring, OOS-clause counters). Engagement flow: if engagement mode is `bug-bounty` per project memory → use `report-writing` / `bugcrowd-reporting` instead. This template is ONLY for external red-team / enterprise client deliverables.

## Limitations

- Process guidance only; it does not authorize probing or exploitation — those steps need their own authorized skill and confirmation gate.
- Docs-only import: upstream templates, commands, and research assets are not bundled.

### Example

```markdown
Apply this skill's checklist to the current engagement notes and report gaps.
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
