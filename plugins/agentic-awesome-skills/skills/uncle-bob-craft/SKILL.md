---
name: uncle-bob-craft
description: "Use when performing code review, writing or refactoring code, or discussing architecture; complements clean-code and does not replace project linter/formatter."
category: code-quality
risk: safe
source: community
date_added: "2026-03-06"
author: antigravity-contributors
tags: [clean-code, clean-architecture, solid, code-review, craftsmanship, uncle-bob]
tools: [claude, cursor, gemini]
---

# Uncle Bob Craft

Apply Robert C. Martin (Uncle Bob) criteria for **code review and production**: Clean Code, Clean Architecture, The Clean Coder, Clean Agile, and design-pattern discipline. This skill is **complementary** to the existing `@clean-code` skill (which focuses on the Clean Code book) and to your project's linter/formatter—it does not replace them.

## Overview

This skill aggregates principles from Uncle Bob's body of work for **reviewing** and **writing** code: naming and functions (via `@clean-code`), architecture and boundaries (Clean Architecture), professionalism and estimation (The Clean Coder), agile values and practices (Clean Agile), and design-pattern use vs misuse. Use it to evaluate structure, dependencies, SOLID in context, code smells, and professional practices. It provides craft and design criteria only—not syntax or style enforcement, which remain the responsibility of your linter and formatter.

## When to Use This Skill

- **Code review**: Apply Dependency Rule, boundaries, SOLID, and smell heuristics; suggest concrete refactors.
- **Refactoring**: Decide what to extract, where to draw boundaries, and whether a design pattern is justified.
- **Architecture discussion**: Check layer boundaries, dependency direction, and separation of concerns.
- **Design patterns**: Assess correct use vs cargo-cult or overuse before introducing a pattern.
- **Estimation and professionalism**: Apply Clean Coder ideas (saying no, sustainable pace, three-point estimates).
- **Agile practices**: Reference Clean Agile (Iron Cross, TDD, refactoring, pair programming) when discussing process.
- **Do not use** to replace or override the project's linter, formatter, or automated tests.

## Aggregators by Source

| Source | Focus | Where to go |
|--------|--------|-------------|
| **Clean Code** | Names, functions, comments, formatting, tests, classes, smells | Use `@clean-code` for detail; this skill references it for review/production. |
| **Clean Architecture** | Dependency Rule, layers, boundaries, SOLID in architecture | See [reference.md](./reference.md) and [references/clean-architecture.md](./references/clean-architecture.md). |
| **The Clean Coder** | Professionalism, estimation, saying no, sustainable pace | See [reference.md](./reference.md) and [references/clean-coder.md](./references/clean-coder.md). |
| **Clean Agile** | Values, Iron Cross, TDD, refactoring, pair programming | See [reference.md](./reference.md) and [references/clean-agile.md](./references/clean-agile.md). |
| **Design patterns** | When to use, misuse, cargo cult | See [reference.md](./reference.md) and [references/design-patterns.md](./references/design-patterns.md). |

## Design Patterns: Use vs Misuse

- **Use patterns** when they solve a real design problem (e.g., variation in behavior, lifecycle, or cross-cutting concern), not to look "enterprise."
- **Avoid cargo cult**: Do not add Factory/Strategy/Repository just because the codebase "should" have them; add them when duplication or rigidity justifies the abstraction.
- **Signs of misuse**: Pattern name in every class name, layers that only delegate without logic, patterns that make simple code harder to follow.
- **Rule of thumb**: Introduce a pattern when you feel the third duplication or the second reason to change; name the pattern in code or docs so intent is clear.

## Smells and Heuristics (Summary)

| Smell / Heuristic | Meaning |
|-------------------|--------|
| **Rigidity** | Small change forces many edits. |
| **Fragility** | Changes break unrelated areas. |
| **Immobility** | Hard to reuse in another context. |
| **Viscosity** | Easy to hack, hard to do the right thing. |
| **Needless complexity** | Speculative or unused abstraction. |
| **Needless repetition** | DRY violated; same idea in multiple places. |
| **Opacity** | Code is hard to understand. |

Full lists (including heuristics C1–T9-style) are in [reference.md](./reference.md). Use these in review to name issues and suggest refactors (extract, move dependency, introduce boundary).

## Review vs Production

| Context | Apply |
|---------|--------|
| **Code review** | Dependency Rule and boundaries; SOLID in context; list smells; suggest one or two concrete refactors (e.g., extract function, invert dependency); check tests and professionalism (tests present, no obvious pressure hacks). |
| **Writing new code** | Prefer small functions and single responsibility; depend inward (Clean Architecture); write tests first when doing TDD; avoid patterns until duplication or variation justifies them. |
| **Refactoring** | Identify one smell at a time; refactor in small steps with tests green; improve names and structure before adding behavior. |

## How It Works

### When reviewing code

1. **Boundaries and Dependency Rule**: Check that dependencies point inward (e.g., use cases do not depend on UI or DB details). See [references/clean-architecture.md](./references/clean-architecture.md).
2. **SOLID in context**: Check Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion where they apply to the changed code.
3. **Smells**: Scan for rigidity, fragility, immobility, viscosity, needless complexity/repetition, opacity; list them with file/area.
4. **Concrete suggestions**: Propose one or two refactors (e.g., "Extract this into a function named X," "Introduce an interface so this layer does not depend on the concrete DB client").
5. **Tests and craft**: Note if tests exist and if the change respects sustainable pace (no obvious "we'll fix it later" comments that violate professionalism).

### When writing or refactoring code

1. Prefer **small, single-purpose** functions and classes; use `@clean-code` for naming and structure.
2. Keep **dependencies pointing inward**; put business rules in the center, adapters at the edges.
3. Introduce **design patterns** only when duplication or variation justifies them.
4. Refactor in **small steps** with tests staying green.

## Examples

### Example 1: Code review prompt (copy-pasteable)

Use this to ask for an Uncle Bob–oriented review:

```markdown
Please review this change using Uncle Bob craft criteria (@uncle-bob-craft):
1. Dependency Rule and boundaries — do dependencies point inward?
2. SOLID in context — any violations in the touched code?
3. Smells — list rigidity, fragility, immobility, viscosity, needless complexity/repetition, or opacity.
4. Suggest one or two concrete refactors (e.g., extract function, invert dependency).
Do not duplicate lint/format; focus on structure and design.
```

### Example 2: Before/after (extract and name)

**Before (opacity, does more than one thing):**

```python
def process(d):
    if d.get("t") == 1:
        d["x"] = d["a"] * 1.1
    elif d.get("t") == 2:
        d["x"] = d["a"] * 1.2
    return d
```

**After (clear intent, single level of abstraction):**

```python
def apply_discount(amount: float, discount_type: int) -> float:
    if discount_type == 1:
        return amount * 1.1
    if discount_type == 2:
        return amount * 1.2
    return amount

def process(order: dict) -> dict:
    order["x"] = apply_discount(order["a"], order.get("t", 0))
    return order
```

## Best Practices

- ✅ Use `@clean-code` for naming, functions, comments, and formatting; use this skill for architecture, boundaries, SOLID, smells, and process.
- ✅ In review, name the smell or principle (e.g., "Dependency Rule violation: use case imports from the web framework").
- ✅ Suggest at least one concrete refactor per review (extract, rename, invert dependency).
- ✅ Run the project linter and formatter separately; this skill does not replace them.
- ❌ Do not use this skill to enforce syntax or style; that is the linter's job.
- ❌ Do not add design patterns without a clear duplication or variation reason.

## Common Pitfalls

- **Problem:** Treating every class as needing a Factory or Strategy.  
  **Solution:** Introduce patterns only when you have a real design need (third duplication, second axis of change).

- **Problem:** Review only listing "violates SOLID" without saying where or how.  
  **Solution:** Point to the file/function and which principle (e.g., "SRP: this function parses and persists; split into parse and persist").

- **Problem:** Skipping the project linter because "we applied Uncle Bob."  
  **Solution:** This skill is about craft and design; always run the project's lint and format.

## Related Skills

- **`@clean-code`** — Detailed Clean Code book material (names, functions, comments, formatting, tests, classes, smells). Use for day-to-day code quality; use uncle-bob-craft for architecture and cross-book criteria.
- **`@architecture`** — General architecture decisions and trade-offs. Use when choosing high-level structure; use uncle-bob-craft for Dependency Rule and boundaries.
- **`@code-review-excellence`** — Code review practices. Combine with uncle-bob-craft for principle-based review.
- **`@refactor-clean-code`** — Refactoring toward clean code. Use with uncle-bob-craft when refactoring for boundaries and SOLID.
- **`@test-driven-development`** — TDD workflow. Aligns with Clean Agile and Clean Coder (tests as requirement, sustainable pace).

## Limitations

- **Does not replace the project linter or formatter.** Run lint and format separately; this skill gives design and craft criteria only.
- **Does not replace automated tests.** It can remind you to write tests (Clean Coder, Clean Agile) but does not run or generate them.
- **Complementary to tooling.** Use it alongside existing CI, lint, and test suites.
- **No syntax or style enforcement.** It focuses on structure, dependencies, smells, and professional practice, not on brace style or line length.
- **Summaries, not the books.** Full Clean Code heuristics, component principles (REP/CCP/CRP, ADP/SDP/SAP), and detailed stories are in the books; we reference the most used parts. See [reference.md](./reference.md) "Scope and attribution."
