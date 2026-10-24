---
name: modern-javascript-patterns
description: "Comprehensive guide for mastering modern JavaScript (ES6+) features, functional programming patterns, and best practices for writing clean, maintainable, and performant code."
risk: safe
source: community
date_added: "2026-02-27"
---

# Modern JavaScript Patterns

Comprehensive guide for mastering modern JavaScript (ES6+) features, functional programming patterns, and best practices for writing clean, maintainable, and performant code.

## Use this skill when

- Refactoring legacy JavaScript to modern syntax
- Implementing functional programming patterns
- Optimizing JavaScript performance
- Writing maintainable and readable code
- Working with asynchronous operations
- Building modern web applications
- Migrating from callbacks to Promises/async-await
- Implementing data transformation pipelines

## Do not use this skill when

- The task is unrelated to modern javascript patterns
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Example boundaries

Code blocks are independent illustrations and can redeclare names; they are not one runnable application. The class example deliberately rejects password operations: private fields and string prefixes are not credential hashing. The highlighting helper escapes interpolated values for HTML text only; keep literal templates trusted and do not reuse it for attributes, URLs or scripts. Fetch resolves on HTTP errors: check `response.ok`, validate response data, and apply explicit deadlines and cancellation; the retry helper only retries network failures. Pagination needs a page/record cap and repeat-page detection. JSON cloning/memoization loses or rejects non-JSON values and cycles; memoized keys also need bounded storage and receiver/purity rules. A timeout race does not abort network work; propagate an AbortSignal when supported.
