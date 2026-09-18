---
name: debate-review
description: Two-model debate review of a GitHub PR, GitLab MR, Azure DevOps PR, or
  local working tree, posted as inline comments or printed. Use for any PR/MR review
  request, or a local review before a PR exists.
risk: safe
category: code-quality
source: https://github.com/amElnagdy/review-skills
source_repo: amElnagdy/review-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/review-skills/blob/master/LICENSE
compatibility: Requires Node 18+, Git 2.31+ for Azure DevOps, `gh` (GitHub), `glab`
  (GitLab) or `az` (Azure DevOps) authenticated, and delegate-skills installed for
  the main/debate lanes.
metadata:
  version: 0.2.0
---
# debate-review

## When to Use

- You have a GitHub PR or GitLab MR that needs a thorough pre-merge review.
- You want a two-model debate (main reviewer vs. debate reviewer) to catch blind spots before posting inline comments.

Two models argue before anything is posted. A main reviewer finds issues. A debate reviewer tries to
knock them down and may add its own. The main reviewer then makes the final call, and one review with
inline comments lands on the PR or MR. It posts from the user's own `gh`, `glab` or `az` account as a
non-approval review or comment. It never approves and never requests changes.

You are the orchestrator. You run one command and relay the result. You do not review the diff
yourself, and you do not touch the PR.

## Run it

```bash
node "<skill-dir>/scripts/review-pr.mjs" --local [--base <ref>]
node "<skill-dir>/scripts/review-pr.mjs" <pr-url | number> [--dry-run]
```

- If the user wants a review and there is no PR/MR URL, run `--local` from the repo (or `--repo-dir`). Do not invent a URL. Relay stdout. `--local` never talks to a forge and rejects non-UTF-8 Git paths rather than decoding them lossily.
- `<pr-url>` is a GitHub `/pull/N`, GitLab `/-/merge_requests/N`, or Azure DevOps
  `/_git/<repo>/pullrequest/N` URL (`dev.azure.com` or the legacy `*.visualstudio.com`). A bare number
  resolves against the cwd's `origin`, including Azure DevOps https and `ssh.dev.azure.com:v3/` remotes.
- `--dry-run` prints a live PR review instead of posting it. It does not combine with `--local`.
- Azure DevOps needs `az` logged in (`az login`) with access to the project. No extension is required,
  the script talks to the REST API through `az rest`. A review there is N inline comment threads plus
  one closed summary thread, since Azure DevOps has no single review object; the alert blockquotes
  render as plain quotes, which still read.
- The reviewers are two delegate-skills lanes, `review-main` and `review-debate`. If either is missing
  the script says so. Add them with `delegate-setup`. Pick two different implementers, since the debate
  is only worth something when the second model doesn't share the first one's blind spots (main
  `claude` or `grok`, debate `codex` at high effort is a good pair). For a one-off, pass
  `--main <implementer>` or `--debate <implementer>`. Only implementers whose relay has `--read-only`
  are accepted. These two lanes belong to the reviewer. Don't point them at a lane you use for other
  work, such as a plan-debate lane.
- Exit code `3` means this head sha already has a debate-review. Re-run with `--force` to post again.
- A run takes minutes, since it is two or three implementer sessions back to back. Run it in the
  background and report the printed URL when it finishes. Don't poll tightly.

All flags: `--help`. Contracts: [references/schema.md](references/schema.md). What gets posted:
[references/comment-format.md](references/comment-format.md). The reviewer briefs live in `assets/prompts/`
and the script fills them in; you don't need to read them.

## After it posts

Each posted comment carries a `<!-- debate-review:<id> status=... -->` marker. `babysit-pr` handles
GitHub and GitLab rounds (verify, fix blockers, reply, resolve). It cannot harvest Azure DevOps yet,
so relay Azure findings directly to the user. Don't act on the findings yourself unless asked.

## Artifacts

`~/.cache/debate-review/<owner>__<repo>/<N>/<head>/` holds `run.json` (all three documents, timings,
what was posted) plus `main/`, `debate/`, and `final/`, each with the brief sent and the relay's
`result.json`.
`--local` writes under `~/.cache/debate-review/local/<repo>/<branch>/<head>/` instead.


## Limitations

- Requires `delegate-skills` with `review-main` and `review-debate` lanes and authenticated `gh`/`glab`.
- Docs-only import — executable helpers (`scripts/`) not included; see upstream for full runtime. Posts a single `COMMENT` review only.

> Adapted from [amElnagdy/review-skills](https://github.com/amElnagdy/review-skills) (MIT) — docs-only, runtime not bundled.
