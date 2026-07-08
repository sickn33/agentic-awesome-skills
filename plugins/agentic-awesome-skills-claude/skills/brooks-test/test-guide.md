# Test Quality Review Guide — Mode 4

**Purpose:** Diagnose the health of a test suite using six test-space decay risks.
Every finding must follow the Iron Law: Symptom → Source → Consequence → Remedy.

---

## Before You Start: Build the Test Suite Map

Before scanning for any risk, map the current test suite structure:

```
Unit tests:        X files, ~N tests
Integration tests: X files, ~N tests
E2E tests:         X files, ~N tests
Ratio:             Unit X%  :  Integration X%  :  E2E X%
Coverage areas:    [modules with tests] vs [modules without tests]
```

If you cannot access test files directly, ask the user **one question** — choose the
most relevant:
1. "Which module is hardest to test or has the least coverage?"
2. "When you make a change, how often do unrelated tests break?"
3. "Is there a part of the codebase your team avoids touching because it has no tests?"

After one answer, proceed. Do not ask more than one question.

---

## Analysis Process

Work through these five steps in order.

### Step 1: Scan for Test Obscurity

*Scan this first — the most visible risk and the one that determines whether the suite
is maintainable at all.*

Look for:
- Read 5–10 test names at random: can each one communicate subject + scenario + expected
  outcome without opening the test body?
- Are there tests where a failure gives no clue which behavior broke (multiple assertions,
  no message strings)?
- Does any test depend on external state (files, database rows, env variables, shared mutable
  fixtures) that is invisible from within the test body?
- Is there a single massive setUp or beforeEach that every test inherits regardless of
  what it actually needs?

If all test names are clear and setups are minimal → no finding.

### Step 2a: Scan for Test Brittleness

*Brittle tests break on refactors that do not change observable behavior — they test
implementation, not contracts.*

Look for:
- Ask (or check git history): did any recent refactor cause test failures with no
  behavior change?
- Are there test methods where the name contains "and" or that assert on 3 or more
  unrelated behaviors (Eager Test)?
- Do assertions specify mock call order or exact parameter values that are irrelevant
  to the observable behavior?
- Are tests coupled to private methods or internal state directly?

If brittleness is systemic (most tests in the file break on a rename) → 🔴 Critical.
If isolated (1–2 brittle tests) → 🟢 Suggestion.

### Step 2b: Scan for Mock Abuse

*Mock Abuse produces tests that pass regardless of whether the real behavior is correct.
Scan this separately from brittleness — over-mocking is often the cause of brittleness,
but it is a distinct problem worth its own finding.*

**Sample 3–5 tests once for both steps 2a and 2b together** — read each test body and
check brittleness signals and mock-setup ratio in the same pass, then write separate
findings if both problems are present.

Look for:
- Is mock setup code longer than the assertion logic in the sampled tests?
- Are the primary assertions `expect(mock).toHaveBeenCalledWith(...)` rather than
  assertions on outputs, state, or observable events?
- Are there methods in production classes that are only called from test files
  (test-induced design damage)?
- Does any single test create more than 3 mock objects?

If mock setup-to-assertion ratio exceeds 3:1 → 🟡 Warning.
If production methods exist only for test access → 🔴 Critical (architecture is being
distorted by the test suite).

### Step 3: Scan for Test Duplication

Look for:
- Is the same setup block (same variables initialized the same way) repeated across
  5 or more test files without a shared helper?
- Are there multiple tests that pass identical inputs and assert identical outputs
  with no differentiation (Lazy Test)?
- Is the same business scenario covered at unit, integration, and E2E level with no
  difference in what each layer is testing?

If duplication is systemic (10 or more instances) → Critical.
If localized (3–5 instances) → Warning.

### Step 4: Scan for Coverage Illusion and Architecture Mismatch

Look for Coverage Illusion:
- Pick the most recently modified core module. Are its error-handling branches and
  null/boundary inputs covered by tests?
- Are there legacy areas (old functions, no test files nearby) that are actively
  being changed?
- Do the tests assert on side effects (DB writes, events emitted, state transitions)
  or only on return values?

**Characterization Test check:** If legacy code is being modified without existing tests,
the team needs Characterization Tests before making the change — not after. Look for
this pattern and flag it when absent.

A Characterization Test locks in current behavior (right or wrong) so future changes
do not silently regress it. Template:
```
test("characterize: [module].[method] given [input], returns [current output]") {
  // Call the code under test with realistic inputs
  // Assert on whatever it currently returns — even if you suspect the output is wrong
  // Add a comment: "This captures current behavior, not necessarily correct behavior"
}
```
Source: Feathers — Working Effectively with Legacy Code, Ch. 13: Characterization Tests

Look for Architecture Mismatch:
- Compare the suite map from the start: is the ratio close to 70% unit / 20% integration / 10% E2E?
- Are high-risk modules tested at higher density than trivial utilities?

**Test suite performance:** A slow test suite is a first-class maintainability risk — it
breaks the fast-feedback loop and causes developers to skip running tests locally.
- If the full suite runtime is known and > 10 minutes → 🟡 Warning
- If the full suite runtime is > 30 minutes or unknown → 🔴 Critical (unknown suite time
  means nobody is running it regularly)
- If tests that could be unit tests are integration tests, that is a Performance Mismatch:
  each misclassified test adds seconds of avoidable wait time

Source: Meszaros — xUnit Test Patterns, Slow Tests (p. 253)

### Step 5: Apply Iron Law, Output Report

Apply the Iron Law format from `../_shared/common.md` to each finding.

Use the standard Report Template. Mode: Test Quality Review.
Include the Test Suite Map as a code block immediately before the `## Findings` heading, labeled "Test Suite Map".
