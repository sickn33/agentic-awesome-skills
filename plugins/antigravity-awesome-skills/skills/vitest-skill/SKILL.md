---
name: vitest-skill
description: 'Generates Vitest tests in JavaScript/TypeScript with Vite-native speed. Jest-compatible API with ESM support and HMR. Use when user mentions "Vitest", "vi.mock", "vitest.config". Triggers on: "Vitest", "vi.mock", "vi.fn", "Vite test", "vitest config".'
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/vitest-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Vitest Testing Skill
## When to Use

Use this skill when you need generates Vitest tests in JavaScript/TypeScript with Vite-native speed. Jest-compatible API with ESM support and HMR. Use when user mentions "Vitest", "vi.mock", "vitest.config". Triggers on: "Vitest", "vi.mock", "vi.fn", "Vite test", "vitest config".


## Core Patterns

### Basic Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Calculator } from './calculator';

describe('Calculator', () => {
  let calc: Calculator;
  beforeEach(() => { calc = new Calculator(); });

  it('adds two numbers', () => {
    expect(calc.add(2, 3)).toBe(5);
  });

  it('throws on divide by zero', () => {
    expect(() => calc.divide(10, 0)).toThrow();
  });
});
```

### Mocking (vi instead of jest)

```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('./database', () => ({
  getUser: vi.fn().mockResolvedValue({ name: 'Alice' }),
  saveUser: vi.fn().mockResolvedValue(true),
}));

// Mock function
const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: 'test' });

// Spy
const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
expect(spy).toHaveBeenCalledWith('message');
spy.mockRestore();

// Timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.runAllTimers();
vi.useRealTimers();
```

### In-Source Testing

```typescript
// src/math.ts — tests alongside code!
export function add(a: number, b: number) { return a + b; }
export function multiply(a: number, b: number) { return a * b; }

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it('adds', () => { expect(add(2, 3)).toBe(5); });
  it('multiplies', () => { expect(multiply(3, 4)).toBe(12); });
}
```

### Snapshot Testing

```typescript
it('serializes user', () => {
  expect(serializeUser(user)).toMatchSnapshot();
});

it('inline snapshot', () => {
  expect(serializeUser(user)).toMatchInlineSnapshot(`
    { "name": "Alice", "email": "alice@test.com" }
  `);
});
```

### React Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" />);
    expect(screen.getByText('Click me')).toBeDefined();
  });
});
```

### Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| `jest.fn()` | `vi.fn()` | Vitest uses `vi` |
| `jest.mock()` | `vi.mock()` | Different namespace |
| No type safety | TypeScript + strict | Vitest is TS-first |

## Quick Reference

| Task | Command |
|------|---------|
| Run once | `npx vitest run` |
| Watch | `npx vitest` (default) |
| UI | `npx vitest --ui` |
| Coverage | `npx vitest --coverage` |
| Specific file | `npx vitest run src/math.test.ts` |
| Filter | `npx vitest run -t "adds"` |

## vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    includeSource: ['src/**/*.{js,ts}'],
  },
});
```

## Deep Patterns → `reference/playbook.md`

| § | Section | Lines |
|---|---------|-------|
| 1 | Production Configuration | Config, workspace, setup file |
| 2 | Mocking Patterns | vi.mock, spies, timers, fetch |
| 3 | React Testing Library | Components, hooks, providers |
| 4 | Snapshot & Inline Snapshots | File, inline, serializers |
| 5 | Table-Driven Tests | test.each, describe.each |
| 6 | In-Source Testing | Co-located tests in source |
| 7 | API / Integration Testing | Server tests with fetch |
| 8 | CI/CD Integration | GitHub Actions, scripts |
| 9 | Debugging Quick-Reference | 10 common problems |
| 10 | Best Practices Checklist | 13 items |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
