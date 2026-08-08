---
name: test-fixing
description: "Systematically identify and fix all failing tests using smart grouping strategies. Use when explicitly asks to fix tests (\"fix these tests\", \"make tests pass\"), reports test failures (\"tests are failing\", \"test suite is broken\"), or completes implementation and wants tests passing."
risk: safe
source: community
date_added: "2026-02-27"
---

# Test Fixing

Systematically identify and fix all failing tests using smart grouping strategies.

## When to Use
- Explicitly asks to fix tests ("fix these tests", "make tests pass")
- Reports test failures ("tests are failing", "test suite is broken")
- Completes implementation and wants tests passing
- Mentions CI/CD failures due to tests

## Systematic Approach

### 1. Initial Test Run

Run `make test` to identify all failing tests.

Analyze output for:

- Total number of failures
- Error types and patterns
- Affected modules/files

### 2. Smart Error Grouping

Group similar failures by:

- **Error type**: ImportError, AttributeError, AssertionError, etc.
- **Module/file**: Same file causing multiple test failure
- **Root cause**: Missing dependencies, API changes, refactoring impacts

Prioritize groups by:

- Number of affected tests (highest impact first)
- Dependency order (fix infrastructure before functionality)

### 3. Systematic Fixing Process

For each group (starting with highest impact):

1. **Identify root cause**

   - Read relevant code
   - Check recent changes with `git diff`
   - Understand the error pattern

2. **Implement fix**

   - Use Edit tool for code changes
   - Follow project conventions (see CLAUDE.md)
   - Make minimal, focused changes

3. **Verify fix**

   - Run subset of tests for this group
   - Use pytest markers or file patterns:
     ```bash
     uv run pytest tests/path/to/test_file.py -v
     uv run pytest -k "pattern" -v
     ```
   - Ensure group passes before moving on

4. **Move to next group**

### 4. Fix Order Strategy

**Infrastructure first:**

- Import errors
- Missing dependencies
- Configuration issues

**Then API changes:**

- Function signature changes
- Module reorganization
- Renamed variables/functions

**Finally, logic issues:**

- Assertion failures
- Business logic bugs
- Edge case handling

### 5. Final Verification

After all groups fixed:

- Run complete test suite: `make test`
- Verify no regressions
- Check test coverage remains intact

## Best Practices

- Fix one group at a time
- Run focused tests after each fix
- Use `git diff` to understand recent changes
- Look for patterns in failures
- Don't move to next group until current passes
- Keep changes minimal and focused

## Example Workflow

User: "The tests are failing after my refactor"

1. Run `make test` → 15 failures identified
2. Group errors:
   - 8 ImportErrors (module renamed)
   - 5 AttributeErrors (function signature changed)
   - 2 AssertionErrors (logic bugs)
3. Fix ImportErrors first → Run subset → Verify
4. Fix AttributeErrors → Run subset → Verify
5. Fix AssertionErrors → Run subset → Verify
6. Run full suite → All pass ✓

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
