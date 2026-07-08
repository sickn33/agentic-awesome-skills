---
name: jest-skill
description: 'Generates Jest unit and integration tests in JavaScript or TypeScript. Covers mocking, snapshots, async testing, and React component testing. Use when user mentions "Jest", "describe/it/expect", "jest.mock", "toMatchSnapshot". Triggers on: "Jest", "expect().toBe()", "jest.mock",...'
risk: unknown
source: https://github.com/LambdaTest/agent-skills/tree/main/jest-skill
source_repo: LambdaTest/agent-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/LambdaTest/agent-skills/blob/main/LICENSE
---

# Jest Testing Skill
## When to Use

Use this skill when you need generates Jest unit and integration tests in JavaScript or TypeScript. Covers mocking, snapshots, async testing, and React component testing. Use when user mentions "Jest", "describe/it/expect", "jest.mock", "toMatchSnapshot". Triggers on: "Jest", "expect().toBe()", "jest.mock",...


## Core Patterns

### Basic Test

```javascript
describe('Calculator', () => {
  let calc;
  beforeEach(() => { calc = new Calculator(); });

  test('adds two numbers', () => {
    expect(calc.add(2, 3)).toBe(5);
  });

  test('throws on division by zero', () => {
    expect(() => calc.divide(10, 0)).toThrow('Division by zero');
  });
});
```

### Matchers

```javascript
expect(value).toBe(exact);                 // === strict
expect(value).toEqual(object);             // deep equality
expect(value).toBeTruthy();
expect(value).toBeNull();
expect(value).toBeGreaterThan(3);
expect(value).toBeCloseTo(0.3, 5);
expect(str).toMatch(/regex/);
expect(arr).toContain(item);
expect(arr).toHaveLength(3);
expect(obj).toHaveProperty('name');
expect(obj).toMatchObject({ name: 'Alice' });
expect(() => fn()).toThrow(CustomError);
```

### Mocking

```javascript
// Mock function
const mockFn = jest.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue({ data: 'test' });
expect(mockFn).toHaveBeenCalledWith('arg1');
expect(mockFn).toHaveBeenCalledTimes(1);

// Mock module
jest.mock('./database');
const db = require('./database');
db.getUser.mockResolvedValue({ name: 'Alice' });

// Mock with implementation
jest.mock('./api', () => ({
  fetchUsers: jest.fn().mockResolvedValue([{ name: 'Alice' }]),
}));

// Spy
const spy = jest.spyOn(console, 'log').mockImplementation();
expect(spy).toHaveBeenCalledWith('expected');
spy.mockRestore();

// Fake timers
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.useRealTimers();
```

### Async Testing

```javascript
test('fetches users', async () => {
  const users = await fetchUsers();
  expect(users).toHaveLength(3);
});

test('resolves with data', () => {
  return expect(fetchData()).resolves.toEqual({ data: 'value' });
});

test('rejects with error', () => {
  return expect(fetchBadData()).rejects.toThrow('not found');
});
```

### React Component Testing (Testing Library)

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginForm from './LoginForm';

test('submits login form', async () => {
  const onSubmit = jest.fn();
  render(<LoginForm onSubmit={onSubmit} />);

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'user@test.com' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button', { name: /login/i }));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@test.com', password: 'password123',
    });
  });
});
```

### Snapshot Testing

```javascript
test('renders correctly', () => {
  const tree = renderer.create(<Button label="Click" />).toJSON();
  expect(tree).toMatchSnapshot();
});
// Update: jest --updateSnapshot
```

### Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| `expect(x === y).toBe(true)` | `expect(x).toBe(y)` | Better errors |
| No `await` on async | Always `await` | Swallows failures |
| Snapshot everything | Snapshot UI, assert logic | Snapshot fatigue |

## Quick Reference

| Task | Command |
|------|---------|
| Run all | `npx jest` |
| Watch | `npx jest --watch` |
| Coverage | `npx jest --coverage` |
| Update snapshots | `npx jest --updateSnapshot` |
| Run file | `npx jest tests/calc.test.js` |
| Single test | `test.only('name', () => {})` |

## Deep Patterns

For production-grade patterns, see `reference/playbook.md`:

| Section | What's Inside |
|---------|--------------|
| §1 Production Config | Node + React configs, path aliases, coverage thresholds |
| §2 Mocking Deep Dive | Module/partial/manual mocks, spies, timers, env vars |
| §3 Async Patterns | Promises, rejections, event emitters, streams |
| §4 test.each | Array, tagged template, describe.each for table-driven tests |
| §5 Custom Matchers | toBeWithinRange, toBeValidEmail, TypeScript declarations |
| §6 React Testing Library | userEvent, hooks, context providers |
| §7 Snapshot Testing | Component, inline, property matchers |
| §8 API Service Testing | Mocked axios, CRUD patterns, error handling |
| §9 Global Setup | Multi-project config, DB setup/teardown |
| §10 CI/CD | GitHub Actions with coverage gates |
| §11 Debugging Table | 10 common problems with fixes |
| §12 Best Practices | 15-item production checklist |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
