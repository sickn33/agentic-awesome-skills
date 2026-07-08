# Contributing to `vercel-optimize`

Keep changes small, metric-grounded, and fixture-tested. Runtime code lives in `skills/vercel-optimize`; tests and fixtures live in `packages/vercel-optimize-tests` so installed skills stay small.

## Common changes

| Change | Edit | Test |
|---|---|---|
| Gate | `lib/gates/<id>.mjs`, `lib/gates/index.mjs` | `node --test packages/vercel-optimize-tests/test/*gate*.test.mjs` |
| Scanner | `lib/scanners/<id>.mjs`, `lib/scanners/index.mjs` | Scanner-specific test in `packages/vercel-optimize-tests/test/` |
| Citation | `references/docs-library.json` | `node skills/vercel-optimize/scripts/check-citations.mjs` |
| Support topic | `references/support-topics/<id>.md` | `node --test packages/vercel-optimize-tests/test/support-topics.test.mjs` |
| Playbook | `references/playbooks/<profile>.md` and selection matrix in `references/scoring.md` | `node --test packages/vercel-optimize-tests/test/support-topics.test.mjs packages/vercel-optimize-tests/test/investigation-brief.test.mjs` |
| Renderer or verifier | `lib/render-report.mjs`, `lib/verify-claim.mjs`, or related module | Focused test plus full test suite |

Generated docs:

```bash
node skills/vercel-optimize/scripts/build-docs.mjs
node skills/vercel-optimize/scripts/check-docs-fresh.mjs
```

Full test loop:

```bash
node --test packages/vercel-optimize-tests/test/*.test.mjs
node skills/vercel-optimize/scripts/check-docs-fresh.mjs
node skills/vercel-optimize/scripts/check-citations.mjs
```

## Rules

- No runtime dependencies. Scripts use Node.js 20+ built-ins and the Vercel CLI.
- No recommendation without a Vercel metric signal, code evidence when code changes are proposed, and an allow-listed citation.
- No invented URLs, exact savings projections, or version-mismatched framework APIs.
- No internal repo paths, service names, customer names, or captured private output in fixtures.
- Keep generated report copy customer-facing. Put debug details behind `--debug-out`.

## Output contracts

Every JSON-emitting script must be deterministic: stable key order, stable sort order, 2-space indentation, trailing newline. If a consumed schema changes, update the schema version and the fixture tests in the same PR.
