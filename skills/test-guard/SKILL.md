---
name: test-guard
description: Enforces testing best practices — test design, mocking boundaries, coverage, and test quality.
metadata:
  testing:
    risk: critical
  category: testing
  author: amElnagdy
  version: 1.0.0
  source: https://github.com/amElnagdy/guard-skills
---

# Test Guard

Enforces testing best practices across languages and frameworks.

## When to Use

- Writing new tests
- Reviewing test quality
- Improving test coverage
- Fixing flaky tests

## Core Rules

1. **Real Objects over Mocks** — Use real objects when possible; mock only external boundaries
2. **Parametrize** — Use parameterized tests to reduce duplication
3. **Test Behavior, Not Implementation** — Test what code does, not how it does it
4. **One Assertion Per Test** — Each test should verify one behavior
5. **Test Edge Cases** — Empty inputs, nulls, boundaries, errors

## How to Apply

1. Read the full skill documentation in `references/`
2. Apply language-specific patterns (see `references/pytest.md`, `references/jest.md`, etc.)
3. Check common mistakes (see `references/common-mistakes.md`)
4. Use the review checklist

## Critical Rules

1. **NEVER mock value objects** — Use real Pydantic models, dataclasses, DTOs
2. **NEVER mock internal functions** — Only mock external boundaries
3. **NEVER skip edge cases** — Test empty, null, boundary, error conditions
4. **NEVER skip parametrize** — Use parameterized tests for multiple inputs
5. **NEVER skip the review checklist** — Use it before every test review

## Anti-Loop Guard

**IMPORTANT**: This skill includes built-in loop prevention.

If you detect ANY of these signs, STOP IMMEDIATELY:
- The same test file being reviewed more than twice
- Identical test patterns being generated repeatedly
- The test review process restarting without new input

When loop detected:
1. Output current progress as partial report
2. List what has been completed vs. what remains
3. Ask user for explicit direction before continuing
