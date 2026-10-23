---
name: agentic-verify
description: "Check that a Python change is caught by tests: run every mutant of the changed lines and write tests until they catch them. Reports evidence instead of a diff to read."
category: testing
risk: safe
source: community
source_repo: timini/agentic-verification
source_type: community
date_added: "2026-10-16"
author: Tim Richardson
license: MIT
license_source: "https://github.com/timini/agentic-verification/blob/v0.3.0/LICENSE"
tags: [testing, pytest, mutation-testing, python, verification]
tools: [claude]
argument-hint: "[--base REV] [--budget-minutes N] [path]"
---

# Verify a change

## Overview

This skill checks that code Claude wrote or changed is actually tested. It defines the check
before coding, runs every mutant of the changed lines with a pinned runner, and writes tests until
the tests catch them. It reports which mutants were killed and which new tests fail on the old
code, so the user can trust the change from evidence. Upstream source:
[timini/agentic-verification](https://github.com/timini/agentic-verification/tree/v0.3.0/plugin/skills/verify).

## When to Use This Skill

- Use after implementing a feature or fix in a Python/pytest project, before saying the work is done.
- Use when the user asks whether a change is tested.
- Use `@agentic-test-audit` instead to review a whole test suite rather than one change.

## How It Works

Arguments: `$ARGUMENTS`. `--base` is the git revision to compare with: `HEAD` (default) checks
uncommitted work, a branch such as `main` checks a whole branch. Other options go to the runner.

The goal is that the user can trust the change from evidence, without reading every line. A
runner verdict describes coverage and the supported mutants tested; it cannot establish that every possible defect would fail a test. Passing tests alone do not
show that: our study found 71% of the calls that could be deleted unnoticed sat in functions
that looked well tested.

### Runner

```bash
AV='uvx --from git+https://github.com/timini/agentic-verification@07608b3b9e4e359bc0b93b3eca94bb78d67e369e#subdirectory=runner agentic-verification'
$AV verify <project-root> --base <rev> [--budget-minutes N]
$AV replay --run <run-dir> --mutant <id> --all
$AV base-check <project-root> --base <rev> [tests...]
```

Pass the project root (the directory pytest runs in), not a package directory or a file.
`base-check` runs tests against the production source as it was at `--base`, in a disposable
copy, and lists the tests that pass now and fail there: those detect the change.

The runner works in a disposable copy and writes only to `.test-suite-audit/` in the project.
It needs Python 3.12+ and `pytest-cov` in the project's environment, plus `pytest-randomly` for
the order check. Use a Bash timeout of the budget plus 2 minutes. The last stdout line is JSON
with the verdict and report paths.

### Rules

- Never weaken, skip or delete an existing test to get a verified verdict, and never edit a
  test so it matches wrong behaviour. If an existing test fails, the change or the test is wrong:
  find out which and tell the user.
- A new test must assert behaviour a user of the code depends on: a result, an effect, an
  error. Do not assert on private helpers or mock the code under change. A test that mocks the
  thing it checks passes when the feature is broken.
- Only the runner decides that a mutant is killed. Do not call a mutant equivalent yourself;
  list it for the user with your reasoning.
- Do not retry a failing or flaky test until it passes. Report it; it hides real failures.
- Never stash, revert or edit production files to see a test fail on the old code. Use
  `base-check`, which does it in a copy; an interrupted stash leaves the user's code broken.

### Steps

1. **Define the check first.** Before writing code (or, if the code exists, before testing it),
   restate the success criteria in one to three lines, and pick the strongest oracle available:
   - an end-to-end or public-API test of the user-visible behaviour, if there is a flow to drive;
   - a property, for pure logic: round trip, invariant, idempotence, or agreement with a simple
     reference implementation (Hypothesis, if the project has it or the user agrees to add it);
   - a differential test, for a refactor or migration: the old version (`git show <base>:<file>`)
     is the oracle; compare on generated inputs and list intentional differences with a reason;
   - example tests otherwise, including the edge cases the criteria name.
   Write that test and see it fail before the change. If the change already exists, run
   `base-check` to confirm the test fails on the old code.
2. **Keep the loop fast.** While iterating, run only the tests for the area you are changing.
   The verify report lists the tests covering the changed lines and how long they take.
3. **Run verify** once the change and its tests are written. Read the verdict:
   - `verified`: every changed line runs under a test and every mutant of the changed lines was
     killed. Go to step 5.
   - `gaps`: changed lines no test runs, surviving mutants, or a suite that is not green and
     deterministic. Go to step 4.
   - `incomplete`: the budget ended first (rerun with a larger `--budget-minutes`), or no
     mutant applies to the changed lines, for example a decorated function. Then the mutants
     give no evidence: rely on `base-check` and say so.
   - `no change`: nothing under the source packages changed since `--base`; check the base.
4. **Close each gap**, then rerun verify (step 3). Stop after three rounds and report what is left.
   - Surviving mutant: read its patch in `mutants/<id>.patch`. It shows a wrong version of your
     code that the tests accept. Write a test that passes on the real code and fails on that
     version, then confirm it with `replay --all` (`killed_now: true`). If the mutant changes
     nothing a caller could observe, leave it and say why.
   - Uncovered changed line: test it, or remove it if it is dead code.
   - New test that catches none of the change's mutants (`change-weak-tests`): strengthen its
     assertions, or explain what it checks instead.
   - Failing, intermittent or order-dependent test: report it; do not work around it. Tests
     that already fail on the base revision are listed as a caveat and do not cause `gaps`.
5. **Optional, for larger changes: review in a fresh context.** If you can start a subagent, give
   it only the success criteria, the diff and the test files, and ask it to write one test that
   should pass and might not. Run it. A failure is a bug or a missing requirement.
6. **Report evidence, not a diff.** Lead with the verdict, then:
   - the success criteria and which tests check each one;
   - mutants killed out of mutants run on the changed lines, and changed lines not covered;
   - which new tests `base-check` shows failing on the old code;
   - tests you added, and gaps closed this way;
   - what is left: surviving mutants with your reason, and anything not assessed;
   - the fast check command from the report, and the path to `report.md`.
   Do not say the change is correct. Say what the tests now catch.

For the meaning of statuses and labels, see [reading the report](https://github.com/timini/agentic-verification/blob/v0.3.0/plugin/skills/audit/reference/report.md).

## Examples

### Example 1: Check uncommitted work

```bash
AV='uvx --from git+https://github.com/timini/agentic-verification@07608b3b9e4e359bc0b93b3eca94bb78d67e369e#subdirectory=runner agentic-verification'
$AV verify . --base HEAD --budget-minutes 10
```

### Example 2: Confirm a new test kills a surviving mutant

```bash
$AV replay --run .test-suite-audit/<run-dir> --mutant <id> --all
```

## Limitations

- Python and pytest only. Needs Python 3.12+ and `pytest-cov`; the order check needs `pytest-randomly`.
- A killed mutant shows the tests notice that change, not that the code is correct.
- Some changes get no mutants (for example a decorated function); the verdict is then `incomplete`.
- The runner decides kills; possibly equivalent mutants are left for human review.

## Security & Safety Notes

- The runner is fetched with `uvx` from GitHub at tag `v0.3.0` (commit `07608b3b9e4e359bc0b93b3eca94bb78d67e369e`). Review it before first use.
- The runner uses a temporary copy and report directory, but project tests/plugins and the fetched runner execute code. A copy is not a security sandbox: inspect them first and isolate network, credentials and external services. Do not assume test side effects are confined to temporary files.
- The agent adds test files; it must not weaken, skip or delete existing tests.

## Related Skills

- `@agentic-test-audit` - audit a whole pytest suite for gaps, flaky and slow tests, and removal candidates.
