---
name: pre-release-review
description: "Run a read-only pre-release review for deploy readiness, migrations, config, secrets, rollout order, rollback risk, and launch blockers."
category: operations
risk: safe
source: community
source_repo: chaunsin/agent-skills
source_type: community
date_added: "2026-06-29"
author: chaunsin
tags: [release, deploy-readiness, ci-cd, rollback, production]
tools: [git, gh, rg]
license: "Apache-2.0"
license_source: "https://github.com/chaunsin/agent-skills/blob/master/LICENSE"
---
# Pre-release Review

Use this skill to run a read-only production release readiness review. The goal is to reduce
release time and coordination failures by finding missing deploy materials, unsafe ordering,
configuration gaps, data migration gaps, and ambiguous production risks before CI/CD or manual
release steps begin.

## When to Use This Skill

- Use when the user asks for a release audit, pre-release review, go-live review, or deploy readiness check.
- Use before publishing a tag, deploying production services, or merging a release branch.
- Use when a PR or git range may include migrations, environment changes, queues, cache behavior, object storage assets, or service contract changes.
- Use when the user asks whether a change is safe to ship and needs a read-only risk report.

## Non-negotiable rules

- Do not modify source code, configs, migrations, secrets, deployment files, or generated files.
- Do not execute migrations, clear or warm caches, upload assets, trigger CI/CD, deploy services,
  publish tags, rotate secrets, or change remote infrastructure.
- Produce a concise report that lists only confirmed problems and plausible risks needing
  confirmation. Do not bury the reader in clean checklist items.
- Sort findings from highest to lowest priority.
- Include module, finding, evidence, inferred owner, risk, and recommended action for each item.
- Never reveal private keys, account passwords, tokens, certificates, cookies, or full secret
  values. Report only file path, line number, variable name, secret type, and a redacted hint.
- If evidence is incomplete but the risk could block production, list it as a confirmation item.

## Required references

- Read `references/checklist.md` before analyzing findings so important release domains are not
  skipped.
- Read `references/report-template.md` before writing the final report so priorities, owner
  inference, secret redaction, and output shape stay consistent.

## Project guidance discovery

Before interpreting the release diff, look for project-local guidance files such as `AGENTS.md` and
`CLAUDE.md` in the repository root and relevant service directories. Read them when present so the
review respects the user's project-specific conventions, service boundaries, release rules,
validation expectations, ownership hints, and known operational constraints.

- Treat project guidance as context for how to interpret risks, not as permission to perform
  mutating release actions.
- If project guidance conflicts with this skill's non-negotiable safety rules, the read-only,
  no-secret-disclosure rules in this skill win.
- If a relevant guidance file cannot be read, note the limitation in "Unable To Verify" only when it
  affects the release review.

## Scope selection

Determine the review range before judging risk. State the chosen range in the report.

1. If the user provides a pull request URL or PR number, review that PR diff first.
   - If `gh` is available and authenticated, use read-only commands such as `gh pr view` and
     `gh pr diff`.
   - If the PR cannot be fetched due to missing tooling, auth, or network limits, say so and ask
     for a local branch, patch, or explicit git range. Do not invent the PR contents.
2. If the user provides an explicit `base..head` range, use it directly.
3. If the user provides only a head commit, compare the previous usable release tag reachable from
   that commit to the head commit.
4. If the user provides no scope, compare the previous usable release tag to `HEAD`.
5. Choose the previous usable release tag carefully:
   - Prefer the repository's visible release-tag convention when one is obvious, such as semantic
     versions, `v*`, or `release-*`. If tag naming is mixed, state the assumption.
   - If `HEAD` is exactly at one or more tags, treat those as the current release point and compare
     against the earlier reachable release tag, not `HEAD`'s own tag.
   - If no usable previous release tag exists, review the latest 5 commits and explicitly warn that
     this is a fallback: there is no usable previous release tag, so the audit only covers the
     latest 5 commits; recommend a PR or tag-based range for future reviews.

## Read-only evidence collection

Run only safe inspection commands, adjusted to the repository and current permissions. Useful
commands include:

```bash
git status --short
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
rg --files -g 'AGENTS.md' -g 'CLAUDE.md'
git tag --merged HEAD --sort=-creatordate
git tag --points-at HEAD
git for-each-ref --sort=-creatordate --format="%(refname:short) %(objectname:short)" refs/tags
git describe --tags --abbrev=0 HEAD
git diff --name-status <base>..<head>
git diff --stat <base>..<head>
git log --oneline --decorate --no-merges <base>..<head>
git diff -U3 <base>..<head> -- <path>
git blame -L <start>,<end> -- <path>
git log --format="%h %an %s" -- <path>
rg -n "<pattern>" .
```

For PRs, use `gh pr view` and `gh pr diff` only when they are available and allowed. Do not bypass
network, auth, sandbox, or approval restrictions. If a command cannot run, record the limitation in
the report's "Unable to verify" section.

## Review workflow

1. Confirm the git repository root, current branch, dirty state, and selected comparison range.
2. Collect changed file names, file status, diff stats, commit summaries, and touched services.
3. Inspect relevant diffs rather than relying on filenames alone.
4. Use the checklist to map changed code to production requirements:
   - schema changes to migrations, indexes, seeds, and backfills
   - config reads to env examples, deploy secrets, flags, and runtime config
   - cache key or TTL changes to invalidation, prewarm, and compatibility work
   - queue producers/consumers to topic setup, DLQ, idempotency, and deploy order
   - asset references to object storage, CDN, templates, certificates, and permissions
   - service contract changes to deploy sequence, backward compatibility, and rollback risk
5. Infer owners with `git blame` on changed lines when possible; otherwise use recent `git log`
   authors for the file or commit. Label them as inferred owners, and do not include email
   addresses.
6. Classify each finding as P0, P1, or P2 using `references/report-template.md`.
7. Write the final report in the user's language when practical. Keep conclusion values exactly as
   `BLOCKED`, `NEEDS_CONFIRMATION`, or `NO_BLOCKER_FOUND`.

## Dirty worktree handling

By default, review only the selected committed range. Do not silently mix uncommitted or untracked
changes into the release diff unless the user explicitly asks to include worktree changes.

- Always report whether the worktree is dirty.
- If dirty or untracked files touch release-relevant areas such as migrations, deployment config,
  env examples, CI/CD, secrets, cache, queues, assets, or service contracts, add a P2 confirmation
  item saying those changes are excluded from the committed-range review and must be committed,
  discarded, or reviewed separately before release.
- If the user explicitly asks to include dirty worktree changes, inspect them with read-only
  commands such as `git diff` and `git diff --name-status`, and clearly label them as uncommitted
  evidence.

## Evidence expectations

Every finding should cite concrete evidence:

- file path and line number when available
- commit hash or PR reference when line evidence is not enough
- command limitation when evidence could not be collected
- diff relationship, such as "schema changed but no migration file changed"

Do not state that something is safe just because no file matched a pattern. Use "not verified" for
areas that cannot be confirmed from local repository evidence.

## Findings versus verification limits

Separate release confirmation items from neutral tool limits:

- A release confirmation item is a diff-linked production risk, such as a new env var whose
  production secret cannot be verified, a schema change with unclear migration status, or a new queue
  whose infrastructure cannot be confirmed. Classify it as P1 or P2 and set the conclusion to
  `NEEDS_CONFIRMATION` unless a P0 also exists.
- An "Unable To Verify" entry is a neutral limitation, such as missing remote access or deployment
  platform credentials when the diff does not introduce a specific release requirement. Neutral
  limitations do not change the conclusion by themselves.
- If a limitation blocks confirmation of a release-critical diff change, promote it to a P1/P2
  finding rather than leaving it only in "Unable To Verify".
- Use `NO_BLOCKER_FOUND` only when no P0-P2 findings or release confirmation items were found from
  available evidence. The report may still include neutral verification limits.

## Output rules

- Show P0 and P1 findings first, then P2 confirmation items.
- Do not list clean checklist categories.
- Include a service deployment order section only when the diff touches multiple services,
  asynchronous workers, migrations, queues, cache, or public contracts.
- If no P0 blocker is found but P1/P2 confirmation items remain, use `NEEDS_CONFIRMATION`.
- If no P0-P2 findings exist, include the reviewed range and any neutral verification limits.
- Keep the report short enough for a release manager to act on immediately.

## Limitations

- This skill is read-only and does not deploy, tag, publish, run migrations, rotate secrets, or change infrastructure.
- It can identify release risks from available evidence, but it cannot prove production state without access to the relevant deployment, secrets, database, queue, cache, or observability systems.
- It should not replace service-owner signoff for high-risk production changes.

## Test prompts

Use these prompts to validate the skill behavior:

- "Run a pre-release review and tell me if this production deploy has risks."
- "Review PR #123 before release. Check migrations, configs, and cache work."
- "This repo has no tags. Use the default strategy and audit release readiness."
- "Check `v1.2.3..HEAD` for backend go-live blockers."
