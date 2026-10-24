---
name: comprehensive-review-pr-enhance
description: >
  Generate structured PR descriptions from diffs, add review checklists,
  risk assessments, and test coverage summaries. Use when the user says
  "write a PR description", "improve this PR", "summarize my changes",
  "PR review", "pull request", or asks to document a diff for reviewers.
risk: critical
source: community
date_added: "2026-01-28"
---

# Pull Request Enhancement

## When to Use
- You need to turn a git diff into a reviewer-friendly pull request description.
- You want a PR summary with change categories, risks, testing notes, and a checklist.
- The diff is large enough that reviewers need explicit structure instead of a short ad hoc summary.

## Workflow

1. Run `git diff <base>...HEAD --stat` to identify changed files and scope
2. Categorise changes: source, test, config, docs, build, styles
3. Generate the PR description using the template below
4. Add a review checklist based on which file categories changed
5. Flag breaking changes, security-sensitive files, or large diffs (>500 lines)

## PR Description Template

```markdown
## Summary
<!-- one-paragraph executive summary: what changed and why -->

## Changes
| Category | Files | Key change |
|----------|-------|------------|
| source   | `src/auth.ts` | added OAuth2 PKCE flow |
| test     | `tests/auth.test.ts` | covers token refresh edge case |
| config   | `.env.example` | new `OAUTH_CLIENT_ID` var |

## Why
<!-- link to issue/ticket + one sentence on motivation -->

## Testing
- [ ] unit tests pass (`npm test`)
- [ ] manual smoke test on staging
- [ ] no coverage regression

## Risks & Rollback
- **Breaking?** yes / no
- **Rollback**: revert this commit; no migration needed
- **Risk level**: low / medium / high — because ___
```

## Review Checklist Rules

Add checklist sections only when the matching file category appears in the diff:

| File category | Checklist items |
|---------------|----------------|
| source | no debug statements, functions <50 lines, descriptive names, error handling |
| test | meaningful assertions, edge cases, no flaky tests, AAA pattern |
| config | no hardcoded secrets, env vars documented, backwards compatible |
| docs | accurate, examples included, changelog updated |
| security-sensitive (`auth`, `crypto`, `token`, `password` in path) | input validation, no secrets in logs, authz correct |

## Splitting Large PRs

When diff exceeds 20 files or 1000 lines, suggest splitting by feature area:

```
git checkout -b feature/part-1
git cherry-pick <commits-for-part-1>
```

## Resources

- `resources/implementation-playbook.md` — Python helpers for automated PR analysis, coverage reports, and risk scoring

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Evidence and helper limits

Use the repository’s existing PR template and scale the description to the actual diff; do not invent metrics, tests, performance gains, rollback safety or issue intent. These Python fragments are incomplete sketches: status/category/impact/dependency/coverage/AI helper functions are absent, so no automated review result exists until implemented and run. Bind base/head SHAs and compare compatible coverage from the same tool/configuration and scope in isolated checkouts; unavailable coverage is unknown, not zero. Risk averages, line-count thresholds and review-time estimates are arbitrary advisory heuristics and cannot override a specific severe finding or required review. The fixed architecture diagram is illustrative, not inferred evidence. Diff-line positions need Git hunk mapping and renamed/deleted/binary-file handling; regex matches and file-name categories are not security analysis. Split branches must originate from the agreed base rather than successively cherry-picking onto branches already containing all changes. Drafting descriptions does not authorize branch pushes, PR creation, comments, reviews or merges; apply the user’s actual authorized action and repository rules.
