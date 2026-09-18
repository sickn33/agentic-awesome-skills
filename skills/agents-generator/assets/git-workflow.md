# Git Workflow

## Approval Rules

- **NO commits** without the user validating the code first — show the diff.
- **NO branches** unless explicitly requested.
- **NO push** unless instructed.
- Before touching code: show plan (files to touch + proposed commits).
- After applying: show commands run and results (lint/test/{{QUALITY_TOOL}}).

## Commit Convention

Conventional Commits:

```
feat: <brief description>
fix: <brief description>
refactor: <brief description>
test: <brief description>
chore: <brief description>
docs: <brief description>
```

Rules:

- One commit per logical change.
- Short imperative messages.
- No trailing period.
- **No "Co-Authored-By" or AI attribution.**
- {{COMMIT_LANGUAGE}} for commit messages.

{{COMMIT_EXAMPLES}}

## Pre-Commit Verification

Before committing, run:

```
{{PRE_COMMIT_CYCLE}}
```

If any step fails, do not commit. Fix and retry.

## Branches

Default base: `{{DEFAULT_BRANCH}}`.

Format:

```
{{BRANCH_FORMAT}}
```

## Generation Rules

- **QUALITY_TOOL**: "doctor" if react-doctor is present, otherwise just "lint".
- **COMMIT_LANGUAGE**: "English" for projects with code in English, "Spanish" if the project uses Spanish in commits.
- **COMMIT_EXAMPLES**: 2-3 real examples based on the project's typical change types. Read `git log --oneline -5` if available.
- **PRE_COMMIT_CYCLE**: Shortened version of the full verification cycle.
- **DEFAULT_BRANCH**: Detect with `git branch --show-current` or `git remote show origin`. Default: "master".
- **BRANCH_FORMAT**: `feature/<slug>`, `fix/<slug>`, etc. If the project uses issue references (REQ-XXX), include them in the format.
