---
name: wjttc-builder
description: PLAN and GENERATE WJTTC (Championship-Grade) test suites for any project. Analyzes the codebase, classifies components across the WJTTC five tiers (Brake · Engine · Aero · Tyre · Pit), writes a tiered test plan, and scaffolds executable test files. This is the BUILDER — it plans and...
risk: unknown
source: https://github.com/Wolfe-Jam/faf-skills/tree/main/skills/wjttc-builder
source_repo: Wolfe-Jam/faf-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Wolfe-Jam/faf-skills/blob/main/LICENSE
---

# WJTTC Builder - Championship Test Suite Generator

**Philosophy:** "We break things so others never have to know they were broken."

This skill generates F1-inspired test suites following the WJTTC (Wolfe James Tests The Code) methodology.

## GOALS

| Goal | How |
|------|-----|
| **Pre-defined** | Test plan before code → improves code quality |
| **Inline Testing** | Tests/approves at write time → catches bugs at inception |
| **Layer 1 → Layer 2** | Industry + Expert = GOLD Code |
| **AI Optimized** | 100% bi-sync with project.faf |
| **Best Code Possible** | ✪ Championship standard |

## GOLD Code ✨

**Code earns GOLD status when:**

```
┌────────────────────────────────────────┐
│         ✪ GOLD CODE ✨                │
│  ════════════════════════════════════  │
│  ✓ Pre-test plan defined               │
│  ✓ Inline testing at write time        │
│  ✓ Layer 1: 100% industry coverage     │
│  ✓ Layer 2: WJTTC expert edge cases    │
│  ✓ Bi-sync with project.faf            │
│  ✓ All tests passing                   │
│  ════════════════════════════════════  │
│  This code has earned its name.        │
└────────────────────────────────────────┘
```

## Position in Development Pipeline

**WJTTC comes AFTER project.faf, BEFORE coding:**

```
1. project.faf      → Define WHAT we're building (context)
2. WJTTC-TESTS.md   → Define SUCCESS CRITERIA (tests first)
3. Code             → Build to pass the tests
4. Test             → Pass/Fail
5. Repeat           → Until Championship grade
```

## Test-Driven Code (TDC)

**The WJTTC Cycle:**

```
Think → Cross-check → Confirm → Code → Test → [Repeat]
  │         │           │        │       │
  │         │           │        │       └── Pass/Fail verdict
  │         │           │        └── Write implementation
  │         │           └── Green light to proceed
  │         └── STOP if missing info - get it first
  └── Understand what we're building
```

**Cross-check Gate:** STOP if missing information. Get it before proceeding.
- Missing requirements? Ask.
- Unclear acceptance criteria? Clarify.
- Unknown edge cases? Define them.

**Red → Green → Refactor:**
1. Write failing test (RED)
2. Write code to pass (GREEN)
3. Clean up (REFACTOR)

**Never code without knowing what "done" looks like.**

## Two-Layer Testing Architecture

### Layer 1: Industry Standard (100% Coverage)
Use the framework's native testing - Jest, pytest, Vitest, etc.
- Unit tests
- Integration tests
- Standard assertions
- Coverage requirements

**This is the baseline. Non-negotiable.**

### Layer 2: WJTTC Expert (Stress + Edge Cases)
The championship layer that catches what industry tests miss:

| Category | What We Test |
|----------|--------------|
| **Syntax** | Special chars, escapes, quotes, brackets |
| **Emoji** | 🏎️ in strings, filenames, variables |
| **Typecases** | camelCase, snake_case, SCREAMING_CASE, mixed |
| **Variables** | Empty, null, undefined, MAX_INT, negative |
| **Unicode** | RTL text, combining chars, zero-width |
| **Injection** | SQL, XSS, command injection attempts |
| **Boundaries** | 0, 1, -1, MAX, MAX+1, empty array |

**Test Targets:**
- MCP servers and tools
- CLI commands and flags
- API endpoints and payloads
- Engine internals
- Infrastructure configs

## We Test the Testing

**Meta-testing checklist:**
- [ ] Do the tests actually run?
- [ ] Do they fail when code is broken?
- [ ] Do they pass when code is correct?
- [ ] Are edge cases covered?
- [ ] Can tests be run in isolation?
- [ ] Do tests clean up after themselves?

## Signal Integrity Audit (The Red-Means-Real Doctrine)

**Before you measure coverage, measure signal trust.**

Red CI is a contract: stop, look, fix. If red means *"shrug, runner had a noisy neighbor, just rerun,"* the signal is dead — and dead signal is worse than no signal at all. A test suite with 100% coverage but flaky reds is **less trustworthy** than one with 80% coverage and zero false alarms, because the team has stopped reading the reds.

**This is the parent doctrine. Every other testing principle serves it.**

### The Audit

For any test suite under review, classify the last 30 days of CI failures into three buckets:

| Bucket | Meaning | Action |
|--------|---------|--------|
| **Real bug** | Red corresponded to an actual code defect that was fixed by a code change | ✓ Signal worked |
| **Flake** | Red was timing/network/concurrency noise; passed on rerun with no code change | ✗ Test design defect |
| **Infra** | Red was missing secret, runner image change, dep upstream — not the code under test | ✗ Workflow design defect |

### Signal Integrity Score

```
SI = (Real bugs) / (Real bugs + Flakes + Infra) × 100
```

| SI % | Verdict | Required Action |
|------|---------|-----------------|
| 100% | TROPHY ✪ | Maintain — exemplary signal |
| 95-99% | Championship | Annotate any flake immediately |
| 85-94% | Acceptable | Schedule flake-class fix this sprint |
| 70-84% | Eroding | Stop adding tests; fix flakes first |
| <70% | DEAD SIGNAL | Block all merges until signal restored |

**The credibility problem precedes the coverage problem.** A suite at 60% coverage with 100% SI is healthier than one at 95% coverage with 70% SI.

### Common Flake Sources to Eliminate on Sight

- **Hard absolute-time perf assertions on shared CI runners** — `expect(time).toBeLessThan(30)`. Move to non-gating workflow with `continue-on-error: true`.
- **Network-dependent tests in main suite** — mock at the boundary or route to integration tier.
- **Concurrency tests without explicit ordering** — use deterministic schedulers.
- **OS scheduler-dependent timing** — replace with statistical (P95 over N) or relative (vs same-run baseline) assertions.
- **Secret-dependent steps that fail when missing** — grey-skip, don't fail.

### The Inverse Rule

**Green CI that passes when something is broken is equally a contract violation.** If a real bug shipped despite green CI, that's a coverage gap that demands a regression test BEFORE the fix lands. Treat false negatives with the same urgency as false positives.

### When the Conversation Is the Real Gate

Automated CI is supporting infrastructure. **The human + AI conversational audit — noticing patterns, tracing root causes, fixing systems — is the actual quality gate.** Flaky CI wastes the conversation's bandwidth. Signal Integrity exists to keep CI worthy of the conversation it serves.

## When to Use This Skill

- AFTER defining project.faf context
- BEFORE writing any implementation code
- When starting a new feature (define tests first)
- When fixing a bug (write failing test first)
- Building regression test suites

## Test Tier System — the WJTTC Five

WJTTC has **five** tiers: **Brake · Engine · Aero · Tyre · Pit**. The builder classifies every component into one of them. (`faf wjttc` audits a suite for the same five and flags untiered tests — name your tests with a tier word so the audit can place them.)

### Tier 1: BRAKE (Safety — Critical)
**When failure = catastrophic consequences**

Identify and test:
- Security vulnerabilities (auth bypass, injection, XSS)
- Data loss or corruption risks
- Payment/financial processing
- API key/credential exposure
- Backup/restore functionality

### Tier 2: ENGINE (Core Functionality)
**When failure = poor experience or incorrect results**

Identify and test:
- Core API endpoints
- Data transformations
- Business logic accuracy
- Integration points
- Performance benchmarks

### Tier 3: AERO (Polish)
**When failure = minor inconvenience**

Identify and test:
- UI/UX edge cases
- Error message formatting
- Optional features
- Documentation accuracy

### Tier 4: TYRE (Live — the Real Road)
**Where the rubber meets the road: durability under real conditions over time**

Identify and test:
- Edge cases and boundary inputs against the real surface (live data shapes, large payloads)
- Wear and durability — long-running sessions, repeated calls, soak/load behavior
- Degraded conditions — slow networks, partial data, rate limits, retries
- Resource leaks (memory, file handles, connections) under sustained use

### Tier 5: PIT (Operational — When Needed)
**The pit stop: getting it onto the track and keeping it serviceable**

Identify and test:
- Integration and end-to-end wiring across components
- Deploy / release checks (build, packaging, smoke tests, migrations)
- Ops health — startup/shutdown, config loading, secrets present, observability
- Rollback and recovery paths

## Test Suite Generation Process

### Step 1: Analyze the Project

To understand what to test:

1. Read key files (package.json, main entry points, API routes)
2. Identify the project type (web app, CLI, API, library)
3. List all public interfaces (APIs, functions, UI interactions)
4. Note external dependencies (databases, APIs, services)

### Step 2: Categorize by Tier

For each identified component, assign one of the five tiers:

```
Tier 1 (Brake): Authentication, data writes, payments, security
Tier 2 (Engine): Core features, API responses, business logic
Tier 3 (Aero):  UI polish, optional features, error formatting
Tier 4 (Tyre):  Edge cases, durability, soak/load, degraded conditions
Tier 5 (Pit):   Integration, deploy/release checks, ops health, rollback
```

### Step 3: Generate Test Plan

Create a WJTTC-TEST-SUITE.md file with:

1. **Header** - Project name, version, date, tester
2. **Test Summary** - Objectives and pass rate targets
3. **Tier 1 (Brake) Tests** - All critical/safety tests with pass/fail tables
4. **Tier 2 (Engine) Tests** - Core functionality tests
5. **Tier 3 (Aero) Tests** - Polish and formatting tests
6. **Tier 4 (Tyre) Tests** - Edge cases, durability, degraded conditions
7. **Tier 5 (Pit) Tests** - Integration, deploy/ops, rollback checks
8. **Performance Targets** - Timing benchmarks
9. **Execution Log** - Checklist for running tests
10. **Championship Certification** - Pass rate to tier mapping

### Step 4: Generate Executable Tests (Optional)

If requested, generate test files:

- JavaScript: `tests/*.test.js` (Jest/Vitest)
- Python: `tests/test_*.py` (pytest)
- Bash: `tests/test_*.sh` (shell scripts)

## Output Format

### Test Suite Location
```
project/
└── tests/
    ├── WJTTC-TEST-SUITE.md     # Test plan document
    ├── test_tier1_brake.js     # Executable tests (optional)
    ├── test_tier2_engine.js
    ├── test_tier3_aero.js
    ├── test_tier4_tyre.js
    └── test_tier5_pit.js
```

### Championship Scoring

Pass rate maps to the canonical FAF tier system (the same tiers FAF uses everywhere):

| Score | Tier | Symbol | Status |
|-------|------|--------|--------|
| 100% | Trophy | ✪ | Perfect — Gold Code |
| 99% | Gold | ★ | Exceptional |
| 95% | Silver | ◆ | Top tier |
| 85% | Bronze | ◇ | Production ready |
| 70% | Green | ● | Solid foundation |
| 55% | Yellow | ● | Needs improvement |
| 1% | Red | ○ | Major work needed |
| 0% | White | ♡ | Empty |

## Quick Generation Command

To generate a test suite for the current project:

1. Analyze the codebase structure
2. Identify all testable components
3. Assign tiers to each component
4. Generate WJTTC-TEST-SUITE.md
5. Optionally generate executable test files

## Example Test Table Format

```markdown
### T1.1 - [Test Name]
**Status:** ⏳ PENDING
**Priority:** CRITICAL

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| [Scenario 1] | [Expected result] | | |
| [Scenario 2] | [Expected result] | | |

**Test Command:**
\`\`\`bash
[How to run this test]
\`\`\`
```

## Integration — where the builder hands off

This skill is the **builder**: it plans and generates. It does **not** run the suite.

- **Execute + report** → use the `wjttc-tester` skill (it runs tests, finds bugs, writes WJTTC reports).
- **Audit tier balance** → `faf wjttc` classifies an existing suite across the five tiers and flags untiered tests (`--strict` exits non-zero on any untiered; `--json` for CI). Name your generated tests with a tier word (brake/engine/aero/tyre/pit) so the audit can place them.
- **Wire CI receipts** → `faf taf setup` installs the TAF receipt printer so each run leaves a verifiable record.

---

*Championship Testing Standards 🏎️*

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
