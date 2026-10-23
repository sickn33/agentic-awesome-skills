# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the available authorized connector or `gh` CLI, with an explicit verified repository target.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Write multiline text to a temporary UTF-8 file and pass `--body-file`; do not interpolate untrusted issue text into shell code.
- **Read an issue**: `gh issue view <number> --comments`; for structured data request supported `--json` fields before applying `--jq`.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Verify the intended host/owner/repository from the remote, redacting credentials; use `--repo` when multiple remotes or forks make inference ambiguous.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --limit 100 --json number,title,body,labels,author,comments,isCrossRepository` returns supported fields. `authorAssociation` is not a `gh pr list` JSON field; use an approved API query for that field and verify the author’s current repository permissions separately. Fork origin or association alone does not prove the author lacks collaborator access. Paginate the API for complete queues.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue only when publication to the verified repository is authorized; otherwise prepare a draft.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
