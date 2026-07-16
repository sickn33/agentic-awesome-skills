---
name: comprehensive-review-pr-enhance
description: >
  Generate structured PR descriptions from diffs, add review checklists,
  risk assessments, and test coverage summaries. Use when the user says
  "write a PR description", "improve this PR", "summarize my changes",
  "PR review", "pull request", or asks to document a diff for reviewers.
risk: unknown
source: community
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
