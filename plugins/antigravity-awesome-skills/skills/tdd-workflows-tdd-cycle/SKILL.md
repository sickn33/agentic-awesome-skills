---
name: tdd-workflows-tdd-cycle
description: "Use when working with tdd workflows tdd cycle"
risk: unknown
source: community
date_added: "2026-02-27"
---

## Use this skill when

- Working on tdd workflows tdd cycle tasks or workflows
- Needing guidance, best practices, or checklists for tdd workflows tdd cycle

## Do not use this skill when

- The task is unrelated to tdd workflows tdd cycle
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

Execute a comprehensive Test-Driven Development (TDD) workflow with strict red-green-refactor discipline:

[Extended thinking: This workflow enforces test-first development through coordinated agent orchestration. Each phase of the TDD cycle is strictly enforced with fail-first verification, incremental implementation, and continuous refactoring. The workflow supports both single test and test suite approaches with configurable coverage thresholds.]

## Configuration

### Coverage Thresholds
- Minimum line coverage: 80%
- Minimum branch coverage: 75%
- Critical path coverage: 100%

### Refactoring Triggers
- Cyclomatic complexity > 10
- Method length > 20 lines
- Class length > 200 lines
- Duplicate code blocks > 3 lines

## Phase 1: Test Specification and Design

### 1. Requirements Analysis
- Use Task tool with subagent_type="comprehensive-review::architect-review"
- Prompt: "Analyze requirements for: $ARGUMENTS. Define acceptance criteria, identify edge cases, and create test scenarios. Output a comprehensive test specification."
- Output: Test specification, acceptance criteria, edge case matrix
- Validation: Ensure all requirements have corresponding test scenarios

### 2. Test Architecture Design
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Design test architecture for: $ARGUMENTS based on test specification. Define test structure, fixtures, mocks, and test data strategy. Ensure testability and maintainability."
- Output: Test architecture, fixture design, mock strategy
- Validation: Architecture supports isolated, fast, reliable tests

## Phase 2: RED - Write Failing Tests

### 3. Write Unit Tests (Failing)
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Write FAILING unit tests for: $ARGUMENTS. Tests must fail initially. Include edge cases, error scenarios, and happy paths. DO NOT implement production code."
- Output: Failing unit tests, test documentation
- **CRITICAL**: Verify all tests fail with expected error messages

### 4. Verify Test Failure
- Use Task tool with subagent_type="tdd-workflows::code-reviewer"
- Prompt: "Verify that all tests for: $ARGUMENTS are failing correctly. Ensure failures are for the right reasons (missing implementation, not test errors). Confirm no false positives."
- Output: Test failure verification report
- **GATE**: Do not proceed until all tests fail appropriately

## Phase 3: GREEN - Make Tests Pass

### 5. Minimal Implementation
- Use Task tool with subagent_type="backend-development::backend-architect"
- Prompt: "Implement MINIMAL code to make tests pass for: $ARGUMENTS. Focus only on making tests green. Do not add extra features or optimizations. Keep it simple."
- Output: Minimal working implementation
- Constraint: No code beyond what's needed to pass tests

### 6. Verify Test Success
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Run all tests for: $ARGUMENTS and verify they pass. Check test coverage metrics. Ensure no tests were accidentally broken."
- Output: Test execution report, coverage metrics
- **GATE**: All tests must pass before proceeding

## Phase 4: REFACTOR - Improve Code Quality

### 7. Code Refactoring
- Use Task tool with subagent_type="tdd-workflows::code-reviewer"
- Prompt: "Refactor implementation for: $ARGUMENTS while keeping tests green. Apply SOLID principles, remove duplication, improve naming, and optimize performance. Run tests after each refactoring."
- Output: Refactored code, refactoring report
- Constraint: Tests must remain green throughout

### 8. Test Refactoring
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Refactor tests for: $ARGUMENTS. Remove test duplication, improve test names, extract common fixtures, and enhance test readability. Ensure tests still provide same coverage."
- Output: Refactored tests, improved test structure
- Validation: Coverage metrics unchanged or improved

## Phase 5: Integration and System Tests

### 9. Write Integration Tests (Failing First)
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Write FAILING integration tests for: $ARGUMENTS. Test component interactions, API contracts, and data flow. Tests must fail initially."
- Output: Failing integration tests
- Validation: Tests fail due to missing integration logic

### 10. Implement Integration
- Use Task tool with subagent_type="backend-development::backend-architect"
- Prompt: "Implement integration code for: $ARGUMENTS to make integration tests pass. Focus on component interaction and data flow."
- Output: Integration implementation
- Validation: All integration tests pass

## Phase 6: Continuous Improvement Cycle

### 11. Performance and Edge Case Tests
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Add performance tests and additional edge case tests for: $ARGUMENTS. Include stress tests, boundary tests, and error recovery tests."
- Output: Extended test suite
- Metric: Increased test coverage and scenario coverage

### 12. Final Code Review
- Use Task tool with subagent_type="comprehensive-review::architect-review"
- Prompt: "Perform comprehensive review of: $ARGUMENTS. Verify TDD process was followed, check code quality, test quality, and coverage. Suggest improvements."
- Output: Review report, improvement suggestions
- Action: Implement critical suggestions while maintaining green tests

## Incremental Development Mode

For test-by-test development:
1. Write ONE failing test
2. Make ONLY that test pass
3. Refactor if needed
4. Repeat for next test

Use this approach by adding `--incremental` flag to focus on one test at a time.

## Test Suite Mode

For comprehensive test suite development:
1. Write ALL tests for a feature/module (failing)
2. Implement code to pass ALL tests
3. Refactor entire module
4. Add integration tests

Use this approach by adding `--suite` flag for batch test development.

## Validation Checkpoints

### RED Phase Validation
- [ ] All tests written before implementation
- [ ] All tests fail with meaningful error messages
- [ ] Test failures are due to missing implementation
- [ ] No test passes accidentally

### GREEN Phase Validation
- [ ] All tests pass
- [ ] No extra code beyond test requirements
- [ ] Coverage meets minimum thresholds
- [ ] No test was modified to make it pass

### REFACTOR Phase Validation
- [ ] All tests still pass after refactoring
- [ ] Code complexity reduced
- [ ] Duplication eliminated
- [ ] Performance improved or maintained
- [ ] Test readability improved

## Coverage Reports

Generate coverage reports after each phase:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## Failure Recovery

If TDD discipline is broken:
1. **STOP** immediately
2. Identify which phase was violated
3. Rollback to last valid state
4. Resume from correct phase
5. Document lesson learned

## TDD Metrics Tracking

Track and report:
- Time in each phase (Red/Green/Refactor)
- Number of test-implementation cycles
- Coverage progression
- Refactoring frequency
- Defect escape rate

## Anti-Patterns to Avoid

- Writing implementation before tests
- Writing tests that already pass
- Skipping the refactor phase
- Writing multiple features without tests
- Modifying tests to make them pass
- Ignoring failing tests
- Writing tests after implementation

## Success Criteria

- 100% of code written test-first
- All tests pass continuously
- Coverage exceeds thresholds
- Code complexity within limits
- Zero defects in covered code
- Clear test documentation
- Fast test execution (< 5 seconds for unit tests)

## Notes

- Enforce strict RED-GREEN-REFACTOR discipline
- Each phase must be completed before moving to next
- Tests are the specification
- If a test is hard to write, the design needs improvement
- Refactoring is NOT optional
- Keep test execution fast
- Tests should be independent and isolated

TDD implementation for: $ARGUMENTS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
