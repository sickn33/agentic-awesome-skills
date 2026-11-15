---
name: accesslint-diff
description: Diff a live page's accessibility violations against a baseline — by default compares uncommitted changes (stash-based), or pass --branch [name] to diff against a branch. Reports only new violations introduced, violations fixed, and pre-existing count. Use `scan` for a full audit with no diffing.
metadata:
  aas-risk: safe
  aas-source: https://github.com/AccessLint/skills
  aas-date-added: '2026-06-02'
---

## When to Use

- Compare a requested page's accessibility findings between verified base and candidate revisions.
- Report introduced, fixed and still-present findings without changing application source.

## 1. Establish isolated snapshots

This package does not bundle the CLI or browser. Verify the current installed tool schema or a reviewed pinned package version first. Do not evaluate `$ARGUMENTS` or branch/URL text as shell syntax.

1. Resolve the requested base and head to full commit SHAs; identify whether staged, unstaged or untracked content belongs to the candidate.
2. Preserve the user's checkout. Prefer isolated worktrees or recoverable snapshots for base and candidate; do not switch their branch or pop an unrelated stash. A branch mode comparing only committed HEAD must disclose excluded local changes.
3. Use each revision's reviewed lockfile and authorized build procedure. Serve base and candidate on separate local ports, wait for a deterministic ready selector and verify which revision each page actually serves. A fixed sleep is not a readiness check.
4. Audit matching URLs, account state, viewport, selectors, engine version and rule configuration. Keep private snapshots in a fresh owner-only directory, not a predictable shared `/tmp` filename. Capture the baseline and candidate using the actual supported CLI flags; do not invent commands when integration is unavailable.
5. Compare findings and inspect selector drift or removed content. Record inaccessible states and manual WCAG checks separately. Never promise full restoration without verifying file status and content.

## 2. Report

```
Accessibility diff — http://localhost:3000/ vs main (94 rules, live DOM)
2 new · 1 fixed · 4 pre-existing hidden

New — Critical
- color-contrast — 2.1:1 (needs 4.5:1), #bbb on #fff
    where: main > p.subtitle   fix: darken to #767676
Fixed
- img-alt — <img src="old.jpg"> (no longer present)
```

Each new violation: **where** (selector verbatim + `file:line (symbol)` if `source` present — never fabricate), **evidence**, **fix** (mechanical change or `NEEDS HUMAN`).

Don't edit. For an explicitly authorized fix request, use the available `accesslint-audit` procedure and verify with the same controlled baseline. This report-only skill does not authorize a separate agent handoff.

## 3. Tear down

Close only browser processes, servers and snapshots created for this run. Preserve pre-existing sessions and recoverable work. Remove an isolated worktree only after needed evidence has been saved; never use a global browser stop command for cleanup.

## Gotchas

- Diff output is limited to exercised pages/states and the selected automated rules; it is not a WCAG certification.
- Removed elements can disappear from an audit without being an accessible replacement. Inspect the user journey.
- Heavy DOM changes can invalidate selector matching; verify corresponding elements or run full audits of both snapshots.
- Report illustrative sample counts as examples, not measurements.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
