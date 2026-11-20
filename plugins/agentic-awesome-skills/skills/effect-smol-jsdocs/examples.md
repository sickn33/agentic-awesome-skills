# Examples

Examples are optional. Keep or add one only for behavior not evident from the
signature, meaningful composition, or useful inference or narrowing. Replace
or remove examples that are trivial, misleading, contrived, or
scaffolding-heavy.

Use `**Example** (Unique use-case title)`, optional prose, and exactly one
non-empty `ts` fence. Titles must remain unique after trimming and lowercasing.

Read `packages/tools/doctest/README.md` for runnable-fence and inline-assertion
syntax. Additionally:

- Use public imports and arrange nontrivial examples as setup, operation, then
  semantic observation.
- The transform does not run Effects or await promises automatically. Prefer
  awaited `Effect.runPromise`; use `Effect.runSync` only when synchronous
  execution is the documented contract.
- Keep type-level examples marked without tautological runtime assertions.
- Leave examples that register tests and intentionally non-executable examples
  as plain `ts` fences.
- Use `Ref`, `Deferred`, or `Queue` rather than mutable probes for concurrency,
  interruption, or races.

If example research suggests an implementation or type bug, report it instead
of changing runtime code during a documentation-only pass.
