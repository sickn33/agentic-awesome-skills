# Measured release finalization

Complete actual bundle reviews and repairs while independent checks run. Use the existing dossier, exact-head receipts and bounded source coordinator; do not bulk-align branches or invent review. Strict protection, all four checks, the complete script suite and full Linux/Windows candidate remain mandatory.

Rehearsal and preparation require at least 3 GiB free in the temporary filesystem before expensive work. This is a conservative floor, not a peak-space guarantee. The package-content test owns a unique npm cache and removes it at process exit. Never delete other runs, global caches or active checkouts. Hard process termination may leave scratch files requiring ownership/process inspection.

Before preparation, every external merged PR since the previous tag must have a verified `@login` and exact PR URL in the release section. The admission reads GitHub PR authors rather than guessing from project names. Bots and the repository owner are excluded; source notices and upstream licenses remain mandatory. Prepare notes early so missing credits fail before version generation.

After an explicitly authorized GitHub/site publication has passed the protected release flow:

```sh
mkdir -m 700 /absolute/private/finalization
npm run release:finalize -- X.Y.Z /absolute/private/finalization
```

This command requires an already published release; it never publishes npm, creates a release/tag, supplies review, merges source PRs or updates local MCP hosts. It dispatches release-only Pages, a full protected legacy sync, a second full no-drift sync, and `release-final-verification.yml` on main. The existing legacy workflow alone owns its protected automation PR. Every run is bound to its observed ref SHA and a unique newly dispatched workflow run. An ambiguous dispatch remains blocked for reconciliation, never automatically repeated. Failed checks require diagnosis. Successful saved stages are re-read before reuse; concurrent writers are refused. The original journal start survives resume and each stage includes start/end timestamps, exact SHA and run ID. Keep source cycle, local preparation and finalization journals together; do not sum parallel stage savings.

The final workflow runs the unchanged full GitHub/site release verifier, including candidate integrity, ancestry, exact release CI/CodeQL/Pages, catalog SEO, all redirect pairs and exact Google/Bing webmaster bytes. Its JSON is retained for seven days. Consume it only from a successful exact workflow/run/head; a downloaded JSON alone is not merge or publication authority. Existing npm exclusion remains explicit. Standard public-repository GitHub runners only; no paid cache, larger runner, quota change or organization needed.

Live audits default to at most three complete attempts, with bounded backoff for 429/502/503/504 or transport timeouts. Active workers drain before retry. Markup, manifest, webmaster and ordinary 404 failures never retry as a success. Every successful attempt checks all selected URLs; final verification always selects all. `AAS_LEGACY_CONCURRENCY=1..64` configures final-verifier transport parallelism without changing coverage. All attempts remain in the receipt or emitted failure diagnostics.

## Performance decisions

The measured candidate took seven minutes; runtime handoff already overlaps full suite/site and Linux/Windows installs. Preserve that dependency graph. The candidate's two Turbo misses were valid after catalog/site/version changes. Do not remove real inputs to manufacture hits. Existing two-worker isolated cohort remains the safe default: broader sharding or narrower dependency keys require measured complete inventory, negative invalidation tests and independent context/output-integrity proof before adoption. Do not claim these speculative changes as implemented speedups.

Review, repairs, preflight, queue, compute and dispatch gaps must be reported separately. Existing source journals do not measure every activity outside coordinator commands; that time cannot be labelled idle. First measure the new real full cycle before promising a percentage saving.

Record work outside the coordinator with `npm run maintenance:activity -- /absolute/private/state start review` and the matching `end review` (also repair, preflight, queue and dispatch). Pairing and the private-store writer lock reject overlapping or orphan transitions; this records observations, never review approval.

The bounded driver refuses further alignments while any prepared selected merge awaits checks/review. Independent intake stays available; merge authority and its exact-head checks are unchanged. This prevents aligning a batch ahead of sequential strict-base merges.

Successful final live proof can be resumed for at most 15 minutes. An expired or invalid timestamp stops, requiring a fresh private finalization state and complete live audit; an old green workflow never establishes current public health. Resume preserves original stage completion times.
