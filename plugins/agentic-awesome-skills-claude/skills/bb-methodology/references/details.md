# Details (moved from SKILL.md)

> Extended reference content for `bb-methodology`, kept under `references/` so the entrypoint stays within the audit budget.

## PART 4: METHODOLOGY DISCIPLINE (False-Positive Prevention)

Most retracted findings come from four recurring process bugs. Each has a hard rule.

> **Important framing:** These discipline rules are about *correctness of findings* — not throttling of effort. They tell you which signals are real findings and which aren't. They do **not** tell you to send fewer probes. If you find yourself using these rules to justify stopping early, you're misreading them — load `redteam-mindset` (DO NOT STOP primary directive) and continue. Coverage discipline and finding-correctness discipline are orthogonal axes; you need both on full.

### Marker Discipline

When testing for reflection, cache poisoning, parameter pollution, or OOB SSRF, the marker string you inject MUST be unique and unmistakable.

**Rules:**
- Markers are random alphanumeric strings, **8+ characters**, no English words, no protocol keywords.
- **NEVER** use `test`, `marker`, `evil`, `attacker`, `payload`, `javascript`, `script`, `AAAA`, `BBBB`, your domain name, or any string that could plausibly appear naturally in the target's HTML/JS/error messages.
- **Good markers:** `cpmark987abc`, `x4hd2k9pq`, a Collaborator subdomain prefix like `dlsrcurl.<collab>.oastify.com`, or `__ZZ_MARKER_<random>_ZZ__`.
- Before claiming reflection: search the **baseline** (no-marker) response for the marker string. If it appears naturally, change your marker. This single check catches 80% of false-positive reflection reports.
- For OOB testing, sub-tag each Collaborator payload (e.g., `dlsrcurl.<collab>`, `authsrc.<collab>`) so callbacks identify the specific sink that fired.

**Lesson from an authorized engagement:** Initial scan flagged `X-Forwarded-Proto: javascript` as reflecting into multiple SharePoint pages. The "reflection" was the literal word `javascript` appearing naturally in SP help-link hrefs (`href="javascript:HelpWindowKey(...)"`). False positive caused by a non-unique marker.

### Body-Diff Rule

A bypass claim requires response **body** differential, not just status code.

**Rules:**
- 200 OK with byte-identical body to the baseline is NOT a bypass.
- 200 OK with a 5-byte difference might be — verify what changed (correlation ID? timestamp? real content?).
- Always diff the body side-by-side before claiming bypass: `diff <(curl ... baseline) <(curl ... bypass)`.
- Status-code-only claims (e.g. "Host header X gave 200 instead of 403") are the most common rejected-as-N/A category on bug bounty platforms.

**Lesson from an authorized engagement:** `Host: target.example:80@evil.example.com` returned HTTP 200 instead of the baseline 403. Looked like a Host-header bypass. But the body was byte-identical (8341 bytes both) — the AWS ELB normalised the Host to `target.example:80`, dropping the `@evil` portion. Not a bypass.

### Statistical-Sample Rule (for timing-based claims)

Single outliers are NOT signal. Network jitter routinely produces 2× outliers.

**Rules for any user-enum / blind-SQLi / blind-NoSQLi / timing-side-channel claim:**
- Minimum sample size: **n ≥ 10 INTERLEAVED trials per group** (control + test, randomised order, not back-to-back).
- Compute mean, median, σ for each group.
- A signal requires the suspect group's mean to be **≥ 2σ above** the control group's mean.
- A single 2× outlier in n=1 testing is jitter, not signal.

**Lesson from an authorized engagement:** Single-shot probe showed `Administrator` taking 1527 ms vs ~700 ms control on Authentication.asmx Login — looked like clear user-enum signal. Reproduction with n=80 interleaved trials across 8 groups collapsed every group to mean=685-716 ms, σ=25-74 ms. The 1527 ms was network jitter. Finding retracted.

### Shell-Loop Ban (>5 iterations)

For any iteration that runs more than 5 times, **use Python (with try/except per iteration), not shell for-loops.**

**Why:** zsh array expansion fails silently on edge cases. A loop like `for x in "${arr[@]}"` can produce zero iterations with no error if the array wasn't populated by the previous command. The user sees output that looks complete but actually skipped the test entirely.

**Rules:**
- Loops of ≤5 hardcoded items in shell: OK.
- Anything that iterates a list, file, or computed range: Python.
- Always count results. If you expected 100 probes and got <50 lines of output, your loop ate something.

**Lesson from an authorized engagement:** A zsh array-iteration verb-tampering test silently produced no curl invocations across 20+ iterations (zsh ate the array). Output looked like "HIT [GET] /_api/web → " repeated for every probe but the actual response was missing. ~50 probes worth of testing lost. Switching the test to Python with explicit per-iteration logging surfaced the real results.

---


## Related Skills & Chains

- **`hunt-dispatch`** — When PART 0 mode is confirmed (redteam / wapt + blackbox|greybox). Workflow primitive: after the engagement-type answer is locked, hand off to `hunt-dispatch` to fingerprint the target and load the matching platform + hunt-* skill set; this skill stops being the active context once dispatch prints its taxonomy.
- **`bug-bounty`** — When the user asks a generic "what should I do" or starts a new target. Workflow primitive: `bug-bounty` is the orchestrator that names which `hunt-*` skills to load by topic; this skill (`bb-methodology`) provides the 5-phase workflow that orchestrator runs against.
- **`triage-validation`** — When a finding completes Phase 4 and is about to be written up. Workflow primitive: Phase 5 explicitly calls `/validate` (the 7-Question Gate); only findings that pass all 7 questions get handed off to `report-writing`.
- **`offensive-osint`** + **`web2-recon`** — When Phase 1 (Recon) is active. Workflow primitive: Phase 1's "Wide approach" delegates to `offensive-osint` for asset arsenal and `web2-recon` for the live-host + URL pipeline.

---


## Operator Notes (Claude-BugHunter)

> Engagement-derived additions to the vendored foundation. Wisdom from real
> authorized engagements + Phase 2 verification across this repo's 31+
> skill-area live tests. The upstream methodology covers the WHAT; this
> layer covers the WHEN-IT-ACTUALLY-WORKS and the FAILURE-MODES.

### What the methodology doesn't tell you

The vendored 5-phase workflow is a checklist; real engagements are improvisation. Sometimes you skip phases entirely — a client hands you a single URL and a JWT, recon was already done by their internal team, and Phase 1 collapses to a 10-minute fingerprint. Sometimes you spend 80% of the engagement in Phase 1 because the scope is a 200-asset financial-services parent org and asset discovery IS the work. The methodology is a map of terrain that exists in every engagement, not a sequence you traverse uniformly.

### Mode-confirmation, in practice

PART 0 (the bug-bounty vs WAPT vs red-team gate at the top of this file) is a hard rule, but the answer isn't always handed to you. Read the scope language:

- **"in-scope assets"** + **"out-of-scope assets"** + **"safe harbor"** → bug-bounty discipline. Validation-heavy, OOB-required, no exfil.
- **"kill chain"** + **"objectives"** + **"flag capture"** + **"adversary emulation"** → red-team. Stealth, persistence, lateral movement valid.
- **"compliance"** + **"PCI"** + **"HIPAA"** + **"executive report"** + **"remediation timeline"** → WAPT. Coverage-driven, deliverable-focused, all findings count regardless of exploitability.

When the language is mixed (common — clients often write WAPT-shaped SOWs and call them red-team engagements), default to bug-bounty discipline until proven otherwise. It's the most validation-strict mode; you can always relax later if the client confirms red-team. The reverse — assuming red-team latitude on what turns out to be a WAPT — gets findings retracted at delivery.

### Phase priority shifts by target type

The 5 phases are not equal-weight. Engagement type dictates the time allocation:

| Engagement | Recon | Hunt | Validate+Report |
|---|---|---|---|
| SaaS bug-bounty (defined scope) | 10% | 70% | 20% |
| External red-team (wide scope) | 40% | 30% | 30% |
| WAPT (asset list provided) | 0% | 60% | 40% |
| Enterprise on-prem (single product) | 5% | 50% | 45% |

If you find yourself spending 50% of a SaaS bug-bounty engagement in recon, you're procrastinating on the hunt. If you're spending 10% of an external red-team engagement on recon, you've already lost — the attack surface map IS the deliverable on those.

### When to break the methodology

If you find a Critical in the first 30 minutes of recon, **stop reconning, validate the Critical fully, report it, then return to recon.** The methodology says "complete the phase before moving on" — the value-per-hour curve disagrees. A confirmed Critical paying out within 24h of engagement start is worth more than a comprehensive asset list you'll never get to chain.

The same applies in reverse: if you've been hunting a candidate for 4+ hours and it won't reproduce on a second account, the candidate is dead. Don't sink another 4 hours into making a dead candidate reproduce. Drop it, document the retraction in your notes, move on.

### The discipline rules are non-negotiable

The discipline rules in this file — OOB Gate, Marker Discipline, Body-Diff Rule, Statistical-Sample Rule, Server-Policy-vs-State, Pre-Severity Gate, Shell-Loop Ban — are not methodology. They are quality gates. Methodology is the order of operations; these are the validation guarantees at each step.

Verified across Phase 2D's hardened-lab campaign: 8/8 discipline rules fired correctly against fake-bug-shaped behavior (URL echo dressed as XSS, word collision dressed as reflection, status-code-only "bypasses" with byte-identical bodies, 200-OK leak-claims with no actual leak data). Validation rates fall sharply when these rules get skipped. The friction is the feature — if a rule feels obstructive, that's it doing its job. The findings it kills are the half that would have come back N/A anyway.
- **`evidence-hygiene`** — When Phase 5 is collecting PoC screenshots / HARs. Workflow primitive: before any cookie / PII appears in a screenshot, hand off to `evidence-hygiene` for the redaction protocol.

