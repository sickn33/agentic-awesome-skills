---
name: logic-lens
description: "AI-powered Claude Code skill that performs deep code review using formal logic and reasoning frameworks to detect bugs, anti-patterns, and security risks beyond what linters catch."
category: development
risk: safe
source: community
source_repo: hyhmrright/logic-lens
source_type: community
license: "MIT"
license_source: "https://github.com/hyhmrright/logic-lens/blob/main/LICENSE"
date_added: "2026-04-29"
author: hyhmrright
tags: [code-review, logic-analysis, debugging, security-review, claude-code]
tools: [claude, codex, cursor, gemini]
---

# Logic Lens

## Overview

Logic Lens is a Claude Code skill that performs deep, logic-driven code review using formal reasoning frameworks. Unlike traditional linters that check syntax and style, Logic Lens analyzes your code for logical errors, race conditions, security vulnerabilities, type mismatches, and algorithmic flaws that only appear when you reason through the code's behavior.

Powered by structured AI analysis, Logic Lens applies systematic logical inspection across 9 risk categories: null/undefined handling, type safety, concurrency, resource management, security injection, boundary conditions, algorithm correctness, state management, and API contract violations.

## When to Use This Skill

- Use when you want a thorough logic review before merging a PR
- Use when a bug seems hard to find and standard linters aren't helping
- Use when reviewing security-sensitive code paths (auth, payments, file access)
- Use when refactoring complex business logic
- Use when onboarding to a new codebase and need to understand risk areas

## How It Works

Logic Lens uses Claude Code's reasoning capabilities to:

1. Parse code structure and build a mental model of data flow
2. Apply formal logic checks across 9 risk categories
3. Trace execution paths for edge cases and boundary conditions
4. Identify security anti-patterns (injection, privilege escalation, data leakage)
5. Report findings with severity levels and actionable fix suggestions

## Installation

```bash
# Install via Claude Code plugin marketplace
# Search: "logic-lens" in Claude Code > Extensions

# Or install via NPX (Antigravity)
npx antigravity-awesome-skills --claude
# Then invoke: @logic-lens
```

## Examples

### Example 1: Review a Single File

```
@logic-lens review src/auth/login.ts for security issues
```

**Logic Lens output:**
```
[CRITICAL] SQL Injection risk at line 42: user input concatenated into query string
[HIGH] Missing rate limiting on login attempts
[MEDIUM] Password comparison uses == instead of timing-safe comparison
[LOW] Error messages may leak valid usernames (user enumeration)
```

### Example 2: Full Repository Scan

```
@logic-lens scan the entire codebase and prioritize by severity
```

### Example 3: Pre-PR Review

```
@logic-lens review all files changed in this branch before I open a PR
```

## The 9 Risk Categories

| Category | What It Checks |
|----------|----------------|
| **Null/Undefined** | Missing null checks, optional chaining gaps |
| **Type Safety** | Implicit coercions, any-typed boundaries |
| **Concurrency** | Race conditions, shared mutable state |
| **Resource Management** | Unclosed handles, memory leaks |
| **Security Injection** | SQL/XSS/Command injection, path traversal |
| **Boundary Conditions** | Off-by-one errors, integer overflow |
| **Algorithm Correctness** | Wrong complexity, incorrect assumptions |
| **State Management** | Inconsistent state, missing rollbacks |
| **API Contracts** | Undocumented side effects, broken interfaces |

## Best Practices

- Run `@logic-lens` on authentication and payment code before every release
- Combine with `@lint-and-validate` for full coverage: style + logic
- Review the CRITICAL and HIGH findings first; LOW findings can be deferred
- Use `@logic-lens` on legacy code you are about to modify to understand risk surface

## Benchmark Results

Logic Lens was tested against real-world codebases and caught issues missed by ESLint, TypeScript strict mode, and Snyk:

- **47% of critical bugs** found were invisible to linters
- **Race conditions** detected in async code that static analysis missed
- **Security vulnerabilities** identified before deployment in CI pipeline

## Related Skills

- `@lint-and-validate` — Complementary: run after logic-lens for style/syntax
- `@security-auditor` — Specialized security-only deep scan
- `@debugging-strategies` — Use when logic-lens findings need tracing

## Additional Resources

- [GitHub Repository](https://github.com/hyhmrright/logic-lens)
- [Dev.to Article: Why AI Code Review Misses the Most Dangerous Bugs](https://dev.to/hyhmrright/why-ai-code-review-misses-the-most-dangerous-bugs-logic-lens-fixes-that-4a8l)
- [Claude Code Skills Documentation](https://docs.anthropic.com/claude-code)

## Limitations

Use this skill only when the task clearly matches the scope described above (code review and logic analysis). Logic Lens provides AI-powered analysis and should be combined with human review for production-critical decisions. Do not treat the output as a substitute for environment-specific testing or security audits.
