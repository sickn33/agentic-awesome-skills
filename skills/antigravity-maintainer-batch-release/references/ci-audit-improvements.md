# CI audit follow-up — November 2026

The read-only audit covered 150 workflows on November 1–2 plus the separate
October 31 PR #2213 cycle. It identified a provenance-selection defect, repeated
late failures, a slow script-suite branch and accumulating Turbo archives.

## Changes and retained boundaries

- SkillSpector selects the newest exact-head upstream `ci.yml` run before finding
  its unique current-attempt `pr-evidence` job. Both listings are paginated. The
  check must belong to GitHub Actions and match the job/head; live PR identity,
  run attempt and newest-run selection are rechecked. Newer same-named metadata
  checks cannot hide correct CI evidence. Failed, pending, ambiguous, rerun or
  foreign evidence cannot authorize a scan. A real workflow-shell regression
  exercises the metadata collision and the negative cases offline.
- The complete script inventory retains two workers and the original six-group
  cohort; the measured seven-group reorder was slower and rejected. Installation, integrity and filesystem durability tests remain real.
- A fast local pre-push option targets the navigation/README/workflow regressions
  implicated by observed correction cycles. Full protected checks remain intact.
- Component receipts expose generator subcommand timings. The registry preview passes one fresh compatibility report to the index and
  bundle generators in a single process, avoiding two identical analyses. No
  report persists across invocations; independent check modes remain unchanged.
- CI avoids new Turbo archives for all-HIT runs and bounds retained opaque task
  entries before saving a changed archive. Branch trust and output verification
  remain unchanged; no remote cache, quota increase or cache promotion is enabled.
- Preview platform smoke starts after the exact runtime is packed, concurrently
  with the full Core contracts; the final aggregate waits for every branch.
  Full-history preview/scanner checkout uses blob filtering, retaining history.

## Measurement and deliberate limits

Compare equivalent commits, complete inventories and runner/toolchain contexts.
Record isolated scheduling benchmarks separately from hosted whole-run time.
Changes to cache hit rate do not prove a whole-cycle reduction when script tests
or CodeQL still finish later. #2213 used the catalog profile, not the web cache.

The original 20–40 second full-validation reduction was a hypothesis, not an
acceptance result. Save actual results with the PR and report negative results.
No semantic review, CodeQL language, Windows/PowerShell proof, coverage threshold,
branch protection or required check is removed to obtain a faster number.

The existing bounded read-only polling remains: moving fork analysis to a
privileged workflow completion event is not a prerequisite for this optimization.
Do not add `pull_request_target`, broad write tokens or execute fork payloads to
remove an idle wait. No new paid runners or scheduled workflows are introduced.

Broader generator parsing reuse, unbounded test workers, changed test isolation
and replacement typecheckers need separate profiling and equivalence evidence;
the audit does not establish that those changes improve the complete cycle.
