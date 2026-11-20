# Type Tests

Inspect nearby `.tst.ts` files and use their imports and assertion style. Use
ordinary Tstyche assertions such as `toBe` for structural equality and choose a
specific assertion for the inference or assignability contract under test.

Structural equality does not verify editor quick-info rendering. For internal
aliases, unsimplified intersections, or other displayed-type regressions, read
[displayed-types.md](displayed-types.md).

Run targeted `pnpm test-types <filename>`; the root command covers every
configured TypeScript version. For a regression fix, confirm the assertion
fails against the pre-fix type. This branch is complete when the assertion
proves the intended contract and the target passes.
