# Jev maintainer hints (optional)

TypeSafe **Jev** supplies fast, structured judgments (probabilities and choices) over skill
content. The maintainer helper evaluates the exact skill text, the bounded diff for that skill,
and the PR's `README.md` source-credit diff. It asks Jev to distinguish concrete evidence from
uncertainty and from routine review obligations. In this repository it is an **optional
maintainer accelerator**, not a merge gate.

Official skill review remains **Tessl** (`skill-review` workflow) or a maintainer attestation
with `--reviewed-head` when the check is `manual-review-required`.

## When to use

Run Jev hints **once** while triaging a batch of skill PRs, after deterministic checks and
when you want a sorted “inspect first” list. Skip it when you are already deep in a single
small PR.

Do **not** add Jev to required CI, `merge:batch`, or branch protection.

## Setup

1. Create an API key in the [TypeSafe console](https://console.typesafe.ai/keys).
2. Store it locally (never commit it):

   ```bash
   cp .env.local.example .env.local
   # edit .env.local → TYPESAFE_API_KEY=...
   ```

3. Install the upstream agent skill (already done in this checkout via `npx skills add`):

   ```bash
   npx skills add typesafe-ai/skills --skill typesafe-ai
   ```

   Project copy: `.agents/skills/typesafe-ai/`.

## Command

### Single PR or local range

```bash
npm run maintainer:jev-hints -- --base origin/main --head <pr-head-sha>
```

### Open PR batch

```bash
npm run maintainer:jev-batch
```

Equivalent: `npm run maintainer:jev-hints -- --open-prs`

Evaluate one skill without a diff range:

```bash
npm run maintainer:jev-hints -- --skill-dir skills/my-skill
```

When reviewing a PR without checking it out on `main`, use a worktree and point at it (skill content is read from the `--head` commit via Git):

```bash
git fetch origin pull/1498/head:refs/remotes/origin/pr-1498-head
git worktree add .worktrees/pr-1498 origin/pr-1498-head
npm run maintainer:jev-hints -- --repo .worktrees/pr-1498 --base origin/main --head origin/pr-1498-head
```

Flags:

- `--max-skills 5` — caps API calls per run (default `5`) to stay within a small monthly budget.
- `--max-prs 15` — with `--open-prs`, how many open PRs to scan (default `15`).
- `--dry-run` — list targets only.
- `--json` — machine-readable output (`urgency_score`, `pr_number` when set).

Five structured questions per skill call cover actionable safety, evidence-backed provenance,
review priority, triage bucket, and unresolved semantic questions. Jev's API returns probabilities
and choices rather than a textual rationale, so its output is a prioritization signal: confirm any
suspected issue against the exact files, diff, and repository policy before acting. A high probability
is not itself proof of a defect, and a low probability is not a clean bill of health.

If `TYPESAFE_API_KEY` is unset, the command exits `0` immediately with a one-line skip message.

## Budget

Each changed skill directory costs **one** `systemOne` request with five bundled questions.
At current Jev pricing, a maintainer sweep over a handful of skills is typically cents, not dollars.
Raise `--max-skills` only when needed.

## Security

- Rotate any API key that appeared in chat, logs, or a commit.
- Never paste keys into skills, docs, or workflow secrets on fork PRs.
