# Runtime Performance

For authoritative base/head comparisons or fixture work, read
`packages/effect/runtimeperf/README.md`. Use `pnpm runtimeperf-compare
<suite-or-case>` for local worktree comparisons and explicit `--base`/`--head`
only for committed refs. Report the resolved comparison head and measurement
configuration.

For exploratory scripts under `benchmark/`, match nearby Tinybench scripts,
keep setup outside the measured callback unless setup is the operation, warm
reusable state, close resources, and print the table. Label results exploratory
unless the task defines a repeatable comparison protocol.

Focused runtimeperf work is complete when fixture validation and the selected
run succeed. Comparison work additionally requires every configured round to
succeed, the paired statistical classification to support the conclusion, and
resolved refs and settings to be reported. Harness changes require its focused
checks. Tinybench work is complete when resources close, the table is reported,
and claims remain exploratory unless a repeatable protocol was run.
