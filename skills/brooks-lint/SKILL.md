---
name: brooks-lint
description: "AI code reviewer grounded in classic software engineering books for catching design smells, coupling issues, and architectural risks."
category: development
risk: safe
source: community
source_repo: hyhmrright/brooks-lint
source_type: community
license: "MIT"
license_source: "https://github.com/hyhmrright/brooks-lint/blob/main/LICENSE"
date_added: "2026-04-29"
author: hyhmrright
tags: [code-review, architecture, software-design, refactoring, claude-code]
tools: [claude, codex, cursor, gemini]
---

# Brooks Lint

## Overview

Brooks Lint is a Claude Code skill that reviews your code through the lens of 12 classic software engineering books. Instead of checking style rules, it asks: "What would the authors of *The Pragmatic Programmer*, *Clean Code*, and *Designing Data-Intensive Applications* say about this code?"

It synthesizes the principles from landmark engineering books into actionable, structured feedback — catching design smells, tight coupling, missing abstractions, and architectural risks that linters and AI tools typically miss.

Named after Fred Brooks, author of *The Mythical Man-Month* — because the hardest bugs are conceptual, not syntactic.

## The 12 Books

| Book | Key Principles Applied |
|------|----------------------|
| *The Pragmatic Programmer* | DRY, orthogonality, tracer bullets |
| *Clean Code* | Naming, function size, comment clarity |
| *The Mythical Man-Month* | Conceptual integrity, second-system effect |
| *Designing Data-Intensive Applications* | Data consistency, fault tolerance, scalability |
| *A Philosophy of Software Design* | Deep modules, information hiding, complexity |
| *Refactoring* | Code smells, extract method, encapsulation |
| *Working Effectively with Legacy Code* | Seams, characterization tests, dependency breaking |
| *Domain-Driven Design* | Ubiquitous language, bounded contexts, aggregates |
| *Release It!* | Stability patterns, timeouts, bulkheads, circuit breakers |
| *Structure and Interpretation of Computer Programs* | Abstraction, recursion, metalinguistic abstraction |
| *The Art of UNIX Programming* | Modularity, composability, rule of least surprise |
| *Extreme Programming Explained* | YAGNI, simple design, collective ownership |

## When to Use This Skill

- Use when you want architectural feedback beyond what linters provide
- Use before major refactors to identify structural debt
- Use when reviewing code that "works but feels wrong"
- Use when onboarding to a codebase to quickly map risk areas
- Use for design reviews before starting a new module or service

## How It Works

Brooks Lint applies each book's core principles as a review lens:

1. **Smell detection**: Flags violations of DRY, SRP, Law of Demeter, etc.
2. **Coupling analysis**: Identifies tight dependencies and missing abstraction layers
3. **Naming critique**: Applies Clean Code naming rules to variables, methods, classes
4. **Architecture review**: Checks for DDIA-style data consistency and fault tolerance gaps
5. **Stability patterns**: Flags missing timeouts, retries, and circuit breakers (Release It!)
6. **Complexity scoring**: Applies APOSD complexity metrics to identify over-engineered sections

## Installation

```bash
# Install via Claude Code plugin marketplace
# Search: "brooks-lint" in Claude Code > Extensions

# Or install via NPX (Antigravity)
npx antigravity-awesome-skills --claude
# Then invoke: @brooks-lint
```

## Examples

### Example 1: Review a Service Class

```
@brooks-lint review src/services/PaymentService.ts
```

**Brooks Lint output:**
```
[Pragmatic Programmer] DRY violation: payment validation logic duplicated in 3 places
[Clean Code] Method processPayment() does 4 things — violates Single Responsibility
[Release It!] No timeout on external payment gateway call — risk of cascade failure
[DDIA] No idempotency key — retry on network error will double-charge
[APOSD] PaymentService knows too much about UserRepository — high coupling
```

### Example 2: Full Codebase Architecture Review

```
@brooks-lint analyze the overall architecture of this codebase
```

### Example 3: Pre-Refactor Review

```
@brooks-lint what are the biggest design smells in this module before I refactor it?
```

## Review Categories

| Category | Books Applied | What It Catches |
|----------|--------------|-----------------|
| **DRY / Duplication** | PP, Refactoring | Copy-paste code, shared logic not extracted |
| **Naming** | Clean Code, DDD | Unclear names, domain language violations |
| **Coupling** | APOSD, PP | Tight dependencies, missing interfaces |
| **Stability** | Release It! | Missing timeouts, no retry logic, no circuit breakers |
| **Data Integrity** | DDIA | Race conditions, non-idempotent operations |
| **Complexity** | APOSD, SICP | Over-engineering, unnecessary abstraction |
| **Legacy Debt** | WELC | Hard-to-test code, missing seams |
| **Domain Clarity** | DDD, XP | Anemic models, missing bounded contexts |

## Best Practices

- Run `@brooks-lint` after writing new service layers or data pipelines
- Combine with `@logic-lens` for full coverage: logic bugs + design smells
- Use `@brooks-lint analyze architecture` weekly on growing codebases
- Focus on CRITICAL and HIGH findings first — LOW findings are style suggestions

## Related Skills

- `@logic-lens` — Complementary: catches logic bugs; brooks-lint catches design issues
- `@security-auditor` — Specialized security-only deep scan
- `@lint-and-validate` — Style/syntax linting to run alongside design review

## Additional Resources

- [GitHub Repository](https://github.com/hyhmrright/brooks-lint)
- [Dev.to Article: I Synthesized 12 Classic Engineering Books into an AI Code Reviewer](https://dev.to/hyhmrright/i-synthesized-12-classic-engineering-books-into-an-ai-code-reviewer-heres-what-it-caught-3ed1)
- [Related skill: logic-lens](https://github.com/hyhmrright/logic-lens)

## Limitations

Use this skill only when the task clearly matches the scope described above (design review and architectural analysis). Brooks Lint applies AI-powered analysis grounded in established engineering principles. It should complement — not replace — human design review for production-critical decisions. Results reflect the principles of the 12 source books and may not apply to all architectural styles or domains.
