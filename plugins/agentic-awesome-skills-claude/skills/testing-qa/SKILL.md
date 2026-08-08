---
name: testing-qa
description: "Comprehensive testing and QA workflow covering unit testing, integration testing, E2E testing, browser automation, and quality assurance."
category: workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# Testing/QA Workflow Bundle

## Overview

Comprehensive testing and quality assurance workflow covering unit tests, integration tests, E2E tests, browser automation, and quality gates for production-ready software.

## When to Use This Workflow

Use this workflow when:
- Setting up testing infrastructure
- Writing unit and integration tests
- Implementing E2E tests
- Automating browser testing
- Establishing quality gates
- Performing code review

## Workflow Phases

### Phase 1: Test Strategy

#### Skills to Invoke
- `test-automator` - Test automation
- `test-driven-development` - TDD

#### Actions
1. Define testing strategy
2. Choose testing frameworks
3. Plan test coverage
4. Set up test infrastructure
5. Configure CI integration

#### Copy-Paste Prompts
```
Use @test-automator to design testing strategy
```

```
Use @test-driven-development to implement TDD workflow
```

### Phase 2: Unit Testing

#### Skills to Invoke
- `javascript-testing-patterns` - Jest/Vitest
- `python-testing-patterns` - pytest
- `unit-testing-test-generate` - Test generation
- `tdd-orchestrator` - TDD orchestration

#### Actions
1. Write unit tests
2. Set up test fixtures
3. Configure mocking
4. Measure coverage
5. Integrate with CI

#### Copy-Paste Prompts
```
Use @javascript-testing-patterns to write Jest tests
```

```
Use @python-testing-patterns to write pytest tests
```

```
Use @unit-testing-test-generate to generate unit tests
```

### Phase 3: Integration Testing

#### Skills to Invoke
- `api-testing-observability-api-mock` - API testing
- `e2e-testing-patterns` - Integration patterns

#### Actions
1. Design integration tests
2. Set up test databases
3. Configure API mocks
4. Test service interactions
5. Verify data flows

#### Copy-Paste Prompts
```
Use @api-testing-observability-api-mock to test APIs
```

### Phase 4: E2E Testing

#### Skills to Invoke
- `playwright-skill` - Playwright testing
- `e2e-testing-patterns` - E2E patterns
- `webapp-testing` - Web app testing

#### Actions
1. Design E2E scenarios
2. Write test scripts
3. Configure test data
4. Set up parallel execution
5. Implement visual regression

#### Copy-Paste Prompts
```
Use @playwright-skill to create E2E tests
```

```
Use @e2e-testing-patterns to design E2E strategy
```

### Phase 5: Browser Automation

#### Skills to Invoke
- `browser-automation` - Browser automation
- `webapp-testing` - Browser testing
- `screenshots` - Screenshot automation

#### Actions
1. Set up browser automation
2. Configure headless testing
3. Implement visual testing
4. Capture screenshots
5. Test responsive design

#### Copy-Paste Prompts
```
Use @browser-automation to automate browser tasks
```

```
Use @screenshots to capture marketing screenshots
```

### Phase 6: Performance Testing

#### Skills to Invoke
- `performance-engineer` - Performance engineering
- `performance-profiling` - Performance profiling
- `web-performance-optimization` - Web performance

#### Actions
1. Design performance tests
2. Set up load testing
3. Measure response times
4. Identify bottlenecks
5. Optimize performance

#### Copy-Paste Prompts
```
Use @performance-engineer to test application performance
```

### Phase 7: Code Review

#### Skills to Invoke
- `code-reviewer` - AI code review
- `code-review-excellence` - Review best practices
- `find-bugs` - Bug detection
- `security-scanning-security-sast` - Security scanning

#### Actions
1. Configure review tools
2. Run automated reviews
3. Check for bugs
4. Verify security
5. Approve changes

#### Copy-Paste Prompts
```
Use @code-reviewer to review pull requests
```

```
Use @find-bugs to detect bugs in code
```

### Phase 8: Quality Gates

#### Skills to Invoke
- `lint-and-validate` - Linting
- `verification-before-completion` - Verification

#### Actions
1. Configure linters
2. Set up formatters
3. Define quality metrics
4. Implement gates
5. Monitor compliance

#### Copy-Paste Prompts
```
Use @lint-and-validate to check code quality
```

```
Use @verification-before-completion to verify changes
```

## Testing Pyramid

```
        /       /  \    E2E Tests (10%)
      /----     /      \  Integration Tests (20%)
    /--------   /          \ Unit Tests (70%)
  /------------```

## Quality Gates Checklist

- [ ] Unit test coverage > 80%
- [ ] All tests passing
- [ ] E2E tests for critical paths
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Code review approved
- [ ] Linting clean

## Related Workflow Bundles

- `development` - Development workflow
- `security-audit` - Security testing
- `cloud-devops` - CI/CD integration
- `ai-ml` - AI testing

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
