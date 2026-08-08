# Testing Strategy

## Runner

{{TEST_RUNNER_INFO}}

| Command           | Purpose |
| ----------------- | ------- |
| {{TEST_COMMANDS}} |

## Test Files

```text
{{TEST_FILE_STRUCTURE}}
```

{{TEST_COUNT}}

## Running Specific Tests

{{SPECIFIC_TEST_COMMANDS}}

## Patterns

{{TEST_PATTERNS}}

## When Writing New Tests

{{NEW_TEST_RULES}}

## Verification

After changes to {{TESTED_AREA}}:

```
{{VERIFICATION_CYCLE}}
```

## Generation Rules

- **TEST_RUNNER_INFO**: "Vitest X.Y.Z" or "Jest X.Y.Z". If both exist, document which is used for what.
- **TEST_COMMANDS**: Extract from package.json scripts. Include watch mode, single-run, coverage.
- **TEST_FILE_STRUCTURE**: Directory tree with found test files.
- **TEST_COUNT**: "Total: N tests" counting all test cases. If uncountable, report "N test files".
- **SPECIFIC_TEST_COMMANDS**: Generate commands to run specific test files. Format:
  ```
  # Run all tests
  {{PM}} {{TEST_RUN_SCRIPT}}

  # Run a specific test file
  {{PM}} {{TEST_RUNNER}} {{TEST_FILE_PATH}}

  # Run tests matching a pattern
  {{PM}} {{TEST_RUNNER}} -t "test name pattern"
  ```
  - For vitest: `bun run test path/to/file.test.ts` or `bun vitest run -t "pattern"`
  - For jest: `npm test -- path/to/file.spec.ts` or `npx jest -t "pattern"`
  - For playwright: `npx playwright test path/to/file.spec.ts`
  - Read the actual test runner config to determine the correct invocation pattern.
  - List 2-3 real test file paths as examples.
- **TEST_PATTERNS**:
  - If using mocks (vi.mock, jest.mock): document what is mocked and how.
  - If using global fixtures: document where they are.
  - If using inline factories/builders: document the pattern.
  - If there are type narrowing tests (type guards): document it.
- **NEW_TEST_RULES**: Project-specific rules for new tests (where to create, naming, what to cover).
- **TESTED_AREA**: "lib/" or "src/" — the main tested directory.
