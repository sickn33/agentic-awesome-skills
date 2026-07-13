---
name: test-guard
description: "Review generated test code against universal testing rules before it ships."
risk: safe
source_repo: "https://github.com/amElnagdy/guard-skills"
---

## When to Use

Use when reviewing generated test code to catch common testing anti-patterns, flaky tests, missing edge cases, and framework-specific mistakes before merging.

# Test Guard

You are reviewing generated or changed test code before it ships. Enforce the rules below after the first test-writing pass and before the tests are presented, committed, or merged. Be a sharp reviewer, not a pedantic one: flag what wastes maintenance effort or hides real bugs, ignore cosmetic preferences.

These rules exist because coding agents over-generate tests. The common failure modes: mock-heavy unit tests that assert implementation details, near-duplicate test bodies that differ by one value, and tests that re-verify the framework instead of the project's logic. Each looks productive in a diff and costs maintenance forever.

## When this skill activates

- A coding agent has just written new test functions or test files, in any language
- You are editing existing tests
- You are reviewing a diff that contains test changes
- The user asks you to write, add, or review tests

## Adapt to the project first

These rules are universal, but their application is not. Before reviewing:

1. Check the project's own agent instructions (CLAUDE.md, AGENTS.md) and testing docs. Project-specific testing rules win over this skill when they conflict.
2. Identify the test stack, then read the matching reference for concrete patterns:
   - Python / pytest → [references/pytest.md](references/pytest.md)
   - PHP / PHPUnit / Pest / WordPress → [references/phpunit.md](references/phpunit.md)
   - JavaScript / TypeScript / Jest / Vitest → [references/jest.md](references/jest.md)
3. If the project calls LLM APIs, uses agent frameworks, or wires up observability/telemetry, also read [references/llm-app-testing.md](references/llm-app-testing.md) — it adds three rules specific to LLM applications.
4. Map the project's system boundaries: network calls, databases, filesystem, clock and randomness, third-party SDKs, LLM APIs. Existing fixtures and test helpers usually reveal where the project already draws these lines.

## What to do

1. Read the test code: the diff, the new file, or the section being modified.
2. Check each test against the rules below.
3. Report violations concisely: rule number, location, why it violates, suggested fix.
4. If the user explicitly invokes this skill before test writing, apply the rules as you write — don't write violations and then flag them.

When writing new tests, ask for each test: "What specific bug does this catch that no other test in this suite catches?" If you can't answer clearly, don't write it.

## The Nine Rules

### Rule 1: Test behavior, not implementation
Test what code does from the caller's perspective. Assert return values and observable side effects. Never assert that an internal helper was called with specific arguments — that test breaks on every refactor while catching nothing.

**Violation pattern:** asserting a mock of an internal function was called, where that function is not a system boundary.
**Fix:** assert the return value or the state change the caller observes.

### Rule 2: Every mock must be justified
Mock only at system boundaries: network and HTTP calls, LLM APIs, databases, filesystem I/O on external files, clock and randomness, third-party SDKs. Never mock internal classes or helper functions to isolate a "unit" — the seams you create hide the integration bugs worth catching.

When you mock a boundary, assert what the caller *does with the response*, not that the mock received specific arguments.

### Rule 3: One scenario per test, data-driven for variants
If two or more tests share identical setup and differ only in input/output values, merge them into one data-driven test (`@pytest.mark.parametrize`, PHPUnit `#[DataProvider]`, Jest `test.each`).

**When separate tests ARE correct:** different setup, different assertions, different mock configurations, or genuinely different scenarios that happen to exercise the same function.

### Rule 4: Every test must justify its existence
Ask: "What bug does this catch that no other test catches?" Delete tests that only catch typos, verify default values of data classes, or test trivial pass-through logic.

**Common unjustified tests:** constructors setting attributes, a function rejecting input the type system already forbids, string formatting of log messages, a constant equaling its literal value.

### Rule 5: Name tests for the scenario
Pattern: `test_<scenario>_<expected_outcome>`. The name should read like a requirement, not echo the function signature.

| Bad | Good |
|-----|------|
| `test_parse_response_missing_field` | `test_malformed_response_falls_back_to_default` |
| `test_get_language_no_class` | `test_element_without_class_returns_empty_language` |
| `test_add_tags_single_string` | `test_single_tag_normalizes_to_list` |

### Rule 6: Production regression tests are sacred
Tests that reproduce a real production bug are always justified. Reference the incident (date, issue ID, or short description) in the name or a comment, and never delete them. They are exempt from Rule 4 — their justification is the incident.

### Rule 7: No tests for framework guarantees
Don't test that the validation library validates, the ORM commits, the router returns 404, or the test framework's fixtures work. Test *your* logic that sits on top of the framework.

**Violation pattern:** a test that would still pass if you deleted all the project's custom code and kept only framework defaults.

### Rule 8: State and value objects are real, never mocked
Never mock a data model, DTO, entity, or state object. Construct a real instance. Mocking state hides field-name typos and validation errors — exactly the bugs worth catching. If constructing the real object is painful, that is design feedback, not a reason to mock; add a small builder or factory helper.

### Rule 9: Infrastructure under test gets real infrastructure
When database queries, schema behavior, or persistence logic *is the subject* of the test, run against a real test database with real migrations applied via fixtures. Mocking the session there tests nothing. Mocking the database is fine when persistence is only a side effect of the behavior under test.

## Reporting format

When flagging violations, use this format:

```
**Rule N violation** in `tests/path/file.ext::<test_name>`
- What: <one sentence describing the violation>
- Fix: <one sentence describing what to do instead>
```

Group violations by file. If a file has no violations, don't mention it.

## Severity guide

Not all violations are equal. Use judgment:

- **Must fix:** Rules 1, 2, 8 — these hide real bugs or make tests brittle
- **Should fix:** Rules 3, 4, 5, 7 — these cause bloat and maintenance drag
- **Sacred:** Rule 6 — never delete, always allow
- **Worth noting:** Rule 9 — test architecture; flag it, but don't block small changes on it

## References

- [references/pytest.md](references/pytest.md) — Python/pytest patterns: parametrize, fixtures, mock boundaries, real Pydantic instances
- [references/phpunit.md](references/phpunit.md) — PHP/PHPUnit/Pest patterns, including WordPress and WooCommerce test boundaries
- [references/jest.md](references/jest.md) — Jest/Vitest patterns: test.each, module mocks, msw, snapshot discipline
- [references/llm-app-testing.md](references/llm-app-testing.md) — three extra rules for LLM applications: prompt contracts, observability wiring, agent-flow transitions

## What this skill does NOT do

- It does not run tests. Use the project's test runner for that.
- It does not enforce code style — that's the linter's job.
- It does not decide *what* to test — only *how* to test it.
- It does not flag pre-existing violations in files you're not touching, unless asked to audit.
