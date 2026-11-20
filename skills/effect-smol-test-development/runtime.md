# Runtime Tests

- Use `it.effect` for Effect-returning tests and regular `it` for pure
  synchronous tests.
- `it.effect` and `it.live` provide and close a `Scope`; return scoped effects
  directly instead of wrapping the body in `Effect.scoped`.
- Use `assert` from `@effect/vitest`, not Vitest's `expect`.
- Use `TestClock` for time-dependent behavior.
- Keep `Effect.runSync` out of unit tests; runnable documentation follows the
  root JSDoc validation rules.

Inspect nearby tests for imports and structure. This branch is complete when
every changed behavior has focused coverage and its targeted test passes.
