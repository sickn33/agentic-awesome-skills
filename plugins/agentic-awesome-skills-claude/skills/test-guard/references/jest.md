# Test Guard — JavaScript / TypeScript / Jest / Vitest Patterns

Concrete applications of the nine rules for JS/TS projects. Read this when reviewing or writing Jest or Vitest tests.

## Rule 2: Mock boundaries in JS/TS

Justified mock targets:

- Network: prefer `msw` (Mock Service Worker) over `jest.mock`-ing your own fetch wrapper — it mocks at the true boundary
- LLM / third-party SDK clients (`openai`, `@anthropic-ai/sdk`, Stripe, etc.)
- Timers and randomness: `vi.useFakeTimers()` / `jest.useFakeTimers()`, seeded RNG
- Filesystem and process env in Node code

Unjustified mocks:

- `jest.mock('../utils/helpers')` — mocking your own internal module to isolate a "unit" (Rule 2)
- Mocking a class's private method via prototype patching (Rule 1)
- Hand-built object literals pretending to be domain entities when a real constructor or factory exists (Rule 8)

## Rule 3: test.each

```ts
// Violation: three near-identical it() blocks
// Fix:
test.each([
  ['Hello World', 'hello-world'],
  ['  padded  ', 'padded'],
  ['Café Menu', 'cafe-menu'],
])('slugify(%s) → %s', (raw, expected) => {
  expect(slugify(raw)).toBe(expected);
});
```

## Snapshot discipline

Snapshot tests are implementation tests in disguise unless the snapshot *is* the contract (e.g., a public JSON output, a CLI's help text). Avoid snapshots of:

- Full component trees that change on every styling tweak (Rule 1 — brittle, asserts implementation)
- Large objects nobody reviews — an unread snapshot approves itself (Rule 4)

Prefer targeted assertions: `expect(screen.getByRole('button')).toHaveTextContent('Save')`.

## UI component tests

- Test what the user sees and does (Testing Library queries by role/label), not component internals or state hooks (Rule 1).
- Don't test that React renders, routes resolve, or props propagate — framework guarantees (Rule 7).

## Rule 9: Real persistence

For data-layer logic (Prisma/Drizzle/Knex queries), run against a real test database — `testcontainers`, a Dockerized Postgres, or SQLite where compatible. Mocking the query builder to test the query builder tests nothing.
