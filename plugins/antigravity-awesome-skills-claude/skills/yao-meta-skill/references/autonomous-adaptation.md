# Autonomous Adaptation Method

This reference defines the safe foundation for adaptive self-iteration.

## Scope

Adaptive iteration is proposal-only until a human explicitly approves a patch application workflow. The current implementation may:

- read one user-provided local source file;
- redact sensitive text before storing evidence excerpts;
- summarize repeated preferences and operational signals;
- produce adaptation proposals with target files, risks, tests, and rollback plans.
- draft a pending approval ledger entry from a reviewed patch, including patch SHA-256, target files, target baseline hashes, verifier commands, and rollback metadata.
- dry-run an approved patch through `adapt-apply`, after patch hash, approval, target allowlist, and target baseline hash checks pass.
- apply a patch only when the operator passes `--apply` and the approval ledger names the reviewer, reason, patch hash, target files, target file SHA-256 baselines, verification commands, and rollback plan.
- automatically reverse an applied patch when `--run-verification` fails, unless the operator explicitly passes `--no-rollback-on-failure`.

It must not:

- scan shell history, browser history, chat logs, mail, or private folders by default;
- infer permanent user memory from a single comment;
- write source files as part of scan or proposal generation;
- write source files through `adapt-apply` without explicit `--apply`;
- apply a patch whose target files are outside both the proposal and approval allowlists;
- apply a patch when an approved target file has changed since the reviewer recorded its baseline SHA-256;
- leave a failed verified apply in place by default;
- count proposals as completed implementation evidence.

## Flow

1. `adapt-scan` reads an explicit source path and writes `reports/user_patterns.json` plus `reports/user_patterns.md`.
2. `adapt-propose` reads the pattern report and writes `reports/adaptation_proposals.json` plus `reports/adaptation_proposals.md`.
3. A reviewer decides whether any proposal is worth implementing.
4. `adapt-apply --write-template` creates `reports/adaptation_approval_ledger.json` and `reports/adaptation_regression_report.json` so the review surface exists before any patch is applied.
5. `adapt-apply --prepare-approval --proposal-id <id> --patch-file <patch>` drafts a `pending-review` approval entry. It does not approve or apply the patch.
6. A human reviewer changes the draft decision to `approved`, fills reviewer, reason, approval date, and optional expiry, then keeps the generated patch and target baseline hashes intact.
7. `adapt-apply --proposal-id <id> --patch-file <patch>` defaults to a dry-run and records patch, target, approval, regression, and rollback evidence.
8. `adapt-apply --apply --run-verification` may write files only after approval, patch hash, allowlist, target baseline hash, `git apply --check`, and safe regression command checks pass.
9. If a verification command fails after a patch is applied, `adapt-apply` runs `git apply -R <patch>` by default and records `failed-rolled-back` plus rollback evidence in `reports/adaptation_regression_report.json`.

## Evidence Standard

Each proposal should include:

- the repeated pattern that triggered it;
- redacted excerpts, never unredacted raw content;
- target files and change intent;
- risk level and boundary;
- verification commands;
- rollback plan;
- a clear `proposal-only` status.

Each approved application should include:

- reviewer, reason, approval date, and optional expiry;
- exact patch SHA-256;
- target file allowlist;
- target file SHA-256 baselines for every patch target, or `__absent__` for approved new files;
- regression commands restricted to local `make` targets or local Python verifier scripts;
- rollback command or plan.
- rollback result if regression failed after an apply attempt.

## Review Boundary

The adaptive loop improves iteration quality, but it does not replace normal review. Any proposal touching trigger behavior, reports, packaging, telemetry, privacy, or governance must still pass the same tests and release gates as a manually designed change. `adapt-apply` evidence proves that an approved patch path was checked or applied; it does not make world-class external or human evidence complete.
