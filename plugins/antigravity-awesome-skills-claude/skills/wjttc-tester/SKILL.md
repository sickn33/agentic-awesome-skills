---
name: wjttc-tester
description: F1-inspired test EXECUTOR + reporter. Runs a test plan, finds and reproduces bugs, audits suite signal integrity, then files a WJTTC report (Brake/Engine/Aero/Tyre/Pit) with a tier verdict. Use when you need to test code, validate functionality, reproduce a failure, or produce a test...
risk: unknown
source: https://github.com/Wolfe-Jam/faf-skills/tree/main/skills/wjttc-tester
source_repo: Wolfe-Jam/faf-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Wolfe-Jam/faf-skills/blob/main/LICENSE
---

# WJTTC Championship Tester

**"We break things so others never have to know they were broken."**

Apply F1-inspired standards to software testing. When brakes must work flawlessly at race pace, so must the code in production. This skill **executes** test plans and **files reports** — it is the driver, not the engineer. To plan and generate the suite, use **wjttc-builder**.

## When to use this skill

- Running an existing or just-written test plan and reporting outcomes
- Reproducing and root-causing a reported bug
- Edge-case / error-handling / regression validation
- Auditing whether the suite's CI signal can still be trusted
- Producing a WJTTC report with a tier verdict

## The WJTTC five tiers

Triage every test by blast radius. The first three set severity; Tyre and Pit cover durability and the release gate.

| Tier | Symbol | Meaning | Examples |
|------|--------|---------|----------|
| **Brake** | 🚨 | Life-critical — failure is catastrophic | data loss, auth bypass, payment errors, destructive ops without confirm |
| **Engine** | ⚡ | Performance-critical — wrong results / poor UX | API accuracy, data transforms, calculations, format compliance, perf |
| **Aero** | 🏁 | Polish & edge cases — minor inconvenience | UI quirks, rare message formatting, optional-feature edges, docs |
| **Tyre** | 🛞 | Durability under load — degradation over time | stress/volume, concurrency, memory growth, large inputs |
| **Pit** | 🔧 | Release gate — the stop that lets you go | smoke/regression suite, CI green, the WJTTC report filed |

Test Brake first. If the brakes don't work, nothing else matters.

## Step 0 — Signal Integrity pre-audit (run BEFORE adding/running anything new)

**Red CI is a contract: it must always mean "stop, look, fix."** A suite with high coverage but flaky reds is *less* trustworthy than a smaller suite with zero false alarms — because the team has stopped reading the reds. Fix the signal before you add more tests.

**Method** — classify the last 30 days of CI failures:

| Bucket | Definition | Verdict |
|--------|-----------|---------|
| **Real bug** | Red mapped to a real defect; fixed by a code change | ✓ Signal worked |
| **Flake** | Timing/network/concurrency noise; passed on rerun, no code change | ✗ Test design defect |
| **Infra** | Missing secret, runner image change, upstream dep — not the code | ✗ Workflow design defect |

**Signal Integrity Score:** `SI = Real bugs / (Real bugs + Flakes + Infra) × 100`

| SI % | Verdict | Action |
|------|---------|--------|
| 100% | ✪ | Maintain — exemplary signal |
| 95–99% | ★ Championship | Annotate any flake immediately |
| 85–94% | ◇ Acceptable | Schedule the flake-class fix this sprint |
| 70–84% | ● Eroding | Stop adding tests — fix flakes first |
| <70% | ○ Dead signal | Block merges until signal restored |

**Eliminate on sight:** hard absolute-time perf asserts on shared runners (`expect(t).toBeLessThan(30)`) → move to a non-gating workflow; network calls in the main suite → mock at the boundary; concurrency tests without explicit ordering; secret-dependent steps that hard-fail when missing → grey-skip.

**The inverse rule:** green CI that passes while something is broken is equally a violation. If a real bug shipped despite green, write the regression test BEFORE the fix lands.

**The conversation is the real gate.** CI is supporting infrastructure for the human + AI audit; flaky CI wastes the audit's bandwidth. Signal Integrity keeps CI worthy of the conversation.

## Execution loop

1. **Scope** — what should it do? happy path, edges, failure modes, perf targets, tier of each.
2. **Audit signal** (Step 0) before trusting or extending the suite.
3. **Run** each test: set up, prepare data, execute, observe actual vs expected, record pass/fail/blocked, capture evidence on failure.
4. **Reproduce** every failure deterministically; root-cause it; note the fix.
5. **Tier coverage check** — confirm every test is tiered:
   ```bash
   faf wjttc --path tests          # audit tier coverage (vendor-neutral)
   faf wjttc --strict --json       # CI gate: non-zero if any test is untiered
   ```
6. **Report** — file the WJTTC report (below), then surface the tier verdict.

## WJTTC report format

Save reports to **`./wjttc-reports/`** in the project under test (or a path the user specifies). Never write to an absolute/personal path. Name files `YYYY-MM-DD-{project}-{feature}-tests.yaml`.

```yaml
---
# WJTTC Test Report
project: "project-name"
feature: "feature-being-tested"
date: "2026-06-26"
tier: "Engine"            # Brake | Engine | Aero | Tyre | Pit
result: "PASS"            # PASS | FAIL | BLOCKED
environment: "OS, runtime version, key deps"
---

## Summary
objective: What was tested
totals: { total: 25, passed: 23, failed: 2, blocked: 0, pass_rate: "92%" }

## Failures
- name: "Long-string handling"
  tier: "Engine ⚡"
  status: "FAIL"
  steps: ["...", "..."]
  expected: "Handle gracefully"
  actual: "Crash"
  error: "RangeError: ..."
  root_cause: "Unbounded buffer"
  fix: "Cap input length / stream"

## Edge cases
- { case: "Empty string", input: "''", expected: "error", actual: "error", status: "PASS" }
- { case: "Unicode", input: "🏎️", expected: "stored", actual: "stored", status: "PASS" }

## Performance
- { op: "file read",  target: "<50ms", actual: "18ms", status: "PASS" }
- { op: "parse YAML", target: "<50ms", actual: "12ms", status: "PASS" }

## Bugs found
- id: 1
  title: "..."
  severity: "Brake"      # tier doubles as severity
  reproducibility: "Always"
  impact: "Who is affected, how serious"
  fix: "..."

## Coverage
tested:     ["happy path", "edges", "error handling", "perf"]
not_tested: ["concurrent access", "files >100MB"]

## Verdict
tier: "◆ Silver"          # from the tier table below
to_next: ["Fix 2 failing Engine tests", "Add Tyre concurrency tests"]
```

## Tier verdict

Map the pass rate (or SI score) to the single canonical FAF tier ladder. No second ladder, no medals.

| Score | Tier | Symbol |
|-------|------|--------|
| 100% | Trophy | ✪ |
| 99% | Gold | ★ |
| 95% | Silver | ◆ |
| 85% | Bronze | ◇ |
| 70% | Green | ● |
| 55% | Yellow | ● |
| 1% | Red | ○ |
| 0% | White | ♡ |

The FAF score is **deterministic** — same input, same score. A test report should be just as falsifiable: every verdict traces to a reproducible run. **FAF doesn't lie.**

## WJTTC method notes

- **Test with real data**, not just sanitized inputs — anonymized production data, messy inputs, production-like volume.
- **Document every failure** so it can be reproduced: what failed, how to repro, why it matters, how to fix.
- **Tier before you test** — severity is the tier, so triage first; `faf wjttc` enforces that nothing ships untiered.
- **Wire it into CI** with TAF receipts so the report is part of the record, not a one-off:
  ```bash
  faf taf setup --write     # create .github/workflows/taf.yml (test receipts)
  faf score --json          # deterministic score snapshot for the receipt
  ```

## Quick checklist (before release)

- [ ] Signal Integrity audited (SI ≥ 85%)
- [ ] Brake tests pass — zero tolerance
- [ ] Edges + error handling tested
- [ ] Tyre: behaves under load / concurrency
- [ ] `faf wjttc --strict` green — every test tiered
- [ ] Regression (Pit) suite passes
- [ ] WJTTC report filed in `./wjttc-reports/`
- [ ] Pass rate ≥ 85% (◇ Bronze, production-ready)

## Resources

- Website: https://faf.one · Skills Site: https://skills.faf.one
- faf-cli: https://github.com/Wolfe-Jam/faf-cli
- Sibling skill: **wjttc-builder** (plan + generate the suite)

---

*Made with 🧡 by wolfejam.dev — "We break things so others never have to know they were broken."*

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
