# Type Performance

Read `packages/effect/typeperf/README.md` before adding fixtures, changing the
harness, updating thresholds, or running cross-ref comparisons. Isolate one
realistic public type path and compare the same fixture and compiler environment
across revisions. Derive supported suites and comparison commands from the
current harness documentation and CLI.

Before changing a threshold, record its previous value and measured result,
explain the expected delta, update it, and run a clean focused verification.
Keep ordinary threshold fixtures separate from cross-ref fixtures.

This branch is complete when the focused measurement is repeatable, threshold
verification is clean when applicable, and reported comparisons include
resolved refs, compiler version, and an explanation of the observed delta.
Fixture or harness changes also require the focused validation and formatting
checks documented in the README.
