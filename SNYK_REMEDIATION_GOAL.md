# Snyk Remediation Goal - 2026-07-03

## Outcome

Resolve or prove obsolete every issue in `/Users/nicco/Downloads/snyk_issues_issues_detail_07_03_2026_6c0cfd94-a834-4319-9a66-e9cfc6db073f.csv`.

## Baseline

- CSV rows: 1006 Snyk vulnerability rows.
- Snyk Open Source rows: 17, mostly Python dependency findings in `requirements.txt`.
- Snyk Code rows: 989, including path traversal, hardcoded non-cryptographic secrets, insecure XML parser, SSRF, command injection, and a few issues in external projects.
- Current checked-out repo: `/Users/nicco/Projects/antigravity-awesome-skills` on `main`, initially clean and aligned with `origin/main`.
- CSV target split:
  - `sickn33/antigravity-awesome-skills`: 1000 rows.
  - `sickn33/chronochat`: 4 rows.
  - `sickn33/spendwise`: 2 rows.

## Constraints

- Preserve existing repo structure and maintainer conventions.
- Do not weaken tests, generated-state checks, or security scanners to make the goal pass.
- Keep canonical skills and plugin mirrors synchronized where a touched skill is mirrored.
- Treat public, destructive, or outside-workspace actions as approval-gated if they require escalation.

## Primary Verifier

The strongest available Snyk verification reports zero unresolved issues from this CSV set, or each remaining CSV issue has documented evidence that it is obsolete, not in this repository, or blocked by an external permission boundary.

## Supporting Checks

- Dependency checks for every touched manifest or requirements file.
- Repo checks appropriate to touched files, with `npm run validate`, `npm run test`, and `npm run security:docs` before completion when feasible.
- Targeted tests or static checks for each code-finding class fixed locally.
- Git diff review confirming no unrelated user changes were reverted.

## Iteration Loop

1. Parse and group the CSV.
2. Obtain exact file/line details for grouped Snyk Code findings from Snyk CLI, dashboard, or equivalent exported data.
3. Fix one issue class or dependency surface at a time.
4. Add or run the strongest focused validation available.
5. Re-run Snyk or equivalent checks.
6. Record evidence and continue until no safe next remediation remains.

## Blocker Standard

Only block after the same external condition repeats across the required goal turns and no meaningful local remediation or verification work remains. Examples: Snyk dashboard/CLI refuses access, or external repos require writes outside the current approved workspace.

## Completion Proof

Completion requires a final summary with:

- CSV issue count reconciliation.
- Changed files.
- Exact verifier commands and pass/fail results.
- Evidence that all `antigravity-awesome-skills` CSV issues are fixed or obsolete.
- Status of the 6 external-project CSV issues, with exact blocker/proof if they cannot be fixed from this workspace.
