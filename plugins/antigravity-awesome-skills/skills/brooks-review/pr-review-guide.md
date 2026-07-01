# PR Review Guide — Mode 1

**Purpose:** Analyze a code diff or specific files for decay risks that are directly visible
in the changed code. Every finding must follow the Iron Law: Symptom → Source → Consequence → Remedy.

---

## Before You Start

**Auto-generated files:** If the diff contains generated files (protobuf stubs, OpenAPI clients,
ORM migrations, lock files, minified bundles), skip those files entirely. Generated code reflects
tool choices, not developer decisions. Note in the report which files were skipped and why.

**Scope calibration:** Adjust analysis depth based on PR size before starting.

| PR Size | Approach |
|---------|----------|
| < 50 lines | Focus on Steps 1–3 only; run Step 6a only if imports changed; run Step 6b if any class, method, or variable was renamed or introduced |
| 50–300 lines | Full process, all steps |
| > 300 lines | Full process; note in the Scope line that review is sampled — cover the highest-risk areas rather than every file |

For PRs > 500 lines: flag in the Summary that a PR this size is itself a Change Propagation signal. A change that cannot be reviewed in one pass suggests tangled responsibilities.

---

## Analysis Process

Work through these seven steps in order. Do not skip steps.

### Step 1: Understand the scope

Read the diff or files and answer:
- What is the stated purpose of this change?
- Which files were modified?
- Flag immediately if the PR changes more than 10 unrelated files — that itself is a
  🟡 Warning: Change Propagation (a PR that touches many unrelated things is a sign
  that responsibilities are tangled).

### Step 2: Scan for Change Propagation

*Scan this first — it is the most visible risk in a diff.*

Look for:
- Does this change touch files in modules that have no conceptual connection to the stated purpose?
- Does any modified class change for more than one business reason in this diff?
- Does any method use more data from another class than from its own?

If the diff shows no cross-module changes beyond what the feature requires → skip, no finding.

### Step 3: Scan for Cognitive Overload

Look for:
- Are any new or modified functions longer than 20 lines?
- Is there nesting deeper than 3 levels in new or modified code?
- Are there more than 4 parameters in any new function signature?
- Are there magic numbers or unexplained constants in new code?
- Do new variable or function names require reading the implementation to understand?
- Are there train-wreck chains (3+ method calls chained)?

### Step 4: Scan for Knowledge Duplication

Look for:
- Does this change introduce logic that already exists elsewhere in the codebase?
- Does this change introduce a new name for a concept that already has a name?
- Does this change add a class to a hierarchy that has a parallel in another module?

### Step 5: Scan for Accidental Complexity

Look for:
- Does this change add an abstraction with only one concrete use?
- Does this change add a class that only wraps another class or delegates everything?
- Does this change add configuration options or extension points that serve no current requirement?

### Step 6a: Scan for Dependency Disorder

- Do any new imports create a dependency from a high-level module to a low-level one?
  (e.g., domain service now imports a database driver or HTTP client)
- Do any new imports introduce a cycle between modules?
- Does any new interface force callers to depend on methods they do not use?

If no new imports and no structural changes → skip, no finding.

### Step 6b: Scan for Domain Model Distortion

- Do new class or variable names match the language the business uses for the same concept?
- Does any new class hold only data with no behavior (pure data bag), where behavior was expected?
- Does any new method put logic that belongs to the domain in a service or utility layer?

---

## Severity Calibration

Apply the Iron Law format from `../_shared/common.md`. Each risk in `../_shared/decay-risks.md` has its own Severity
Guide with numeric thresholds — use those as the primary reference. When a finding sits
on the boundary between two tiers, use this as a tiebreaker:
- 🔴 Critical — actively breaking velocity or creating production risk *today*
- 🟡 Warning — will if left unaddressed through the next few features
- 🟢 Suggestion — worth fixing when nearby, not urgent

When multiple findings exist, list Critical items first. If there are more than 5 findings,
add a one-line "Recommended fix order" at the end of the Findings section.

---

## Step 7: Quick Test Check

*Run this last. Three signals only — this is not a full Mode 4 review.*

If the diff contains only generated files, configuration, or documentation with no
production logic changes → skip Step 7 entirely.

**Signal 1: Do tests exist for the changed behavior?**

- Does the diff modify production code?
- Are corresponding test file changes included in the diff?
- If new public behavior was added with no new tests:
  → 🟡 Warning: Coverage Illusion — new behavior is untested
  → Source: Feathers — Working Effectively with Legacy Code, Ch. 1
- If the change is a pure refactor and existing tests cover the behavior → no finding.

**Signal 2: Quick Mock Abuse sniff**

Only check if the diff includes test file changes.

- Is mock setup code in new/modified tests obviously longer than the test logic?
- Are the primary assertions `expect(mock).toHaveBeenCalledWith(...)` with no behavior verification?
- Does the diff add any methods to production classes that are only called from test files?

If any of these are true:
  → 🟡 Warning: Mock Abuse — test complexity exceeds behavior complexity
  → Source: Osherove — The Art of Unit Testing, mock usage guidelines

**Signal 3: Quick Test Obscurity sniff**

Only check if the diff includes test file changes.

- Do new test names express scenario and expected outcome?
  (Pattern: `methodName_scenario_expectedResult` or equivalent)
- Are there new tests with multiple assertions and no message strings on any of them?

If test names are vague or assertions lack messages:
  → 🟢 Suggestion: Test Obscurity — test intent is unclear from the test name or assertions
  → Source: Meszaros — xUnit Test Patterns, Assertion Roulette (p.224)

**Output rule:**

If all three signals are clean → write no Test findings. Proceed directly to the report.

If findings exist → add them to the Findings section using the standard Iron Law format.
Label the risk as the test decay risk name (e.g., "Coverage Illusion", "Mock Abuse",
"Test Obscurity").

> **Note:** Step 7 is a fast check, not a full test audit. When systemic test problems
> are found, note in the Summary: "Consider running `/brooks-lint:brooks-test` for a
> complete test quality diagnosis."

---

## Output

Use the standard Report Template from `../_shared/common.md`.
Mode: PR Review
Scope: list the files reviewed (excluding skipped generated files).
