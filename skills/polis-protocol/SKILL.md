---
name: polis-protocol
description: "Coordinate multi-vendor AI agents as a self-improving team — a learning router assigns work by track record and citizens can amend the protocol's own rules."
category: orchestration
risk: critical
source: community
source_repo: yehudalevy-collab/polis-protocol
source_type: community
date_added: "2026-06-02"
author: yehudalevy-collab
tags: [multi-agent, coordination, routing, orchestration, governance, vendor-agnostic]
tools: [claude, cursor, gemini, codex, antigravity]
license: "MIT"
license_source: "https://github.com/yehudalevy-collab/polis-protocol/blob/main/LICENSE"
plugin:
  targets:
    codex: blocked
    claude: blocked
---

# Polis Protocol — a team of agents that develops

## Overview

Most agent coordination is a passive board: claim a task, do it, mark it done. It records, but it never gets smarter, and its rules are frozen. Polis Protocol is the active alternative — a folder of markdown where each agent is a "citizen" with a capability card, work is routed by a learning bandit to whoever has the best track record on the task's tags, settled work files lessons that update the routing, and citizens can propose and vote on amendments to the protocol itself. It is vendor-agnostic: Antigravity, Claude, Codex, and Gemini agents can all share one `_polis/`.

In Antigravity specifically, this turns Manager View's fixed pipeline into a team that learns who is actually best at each kind of work, instead of running the same roles in the same order every time.

## When to Use This Skill

- Use when 2+ agents (especially across vendors) work on one project and "who should do this" is a real question.
- Use when you want the team to measurably improve over time — routing that adapts from outcomes, not static role labels.
- Use when you need a durable, git-auditable record of who did what, what was learned, and which rules changed.
- Use when Antigravity's default orchestration is too rigid and you want routing + governance on top of it.

## How It Works

### Step 1: Found a polis

Clone a reviewed revision of the repo and run the scaffolder directly (review `install.sh` first if you prefer the one-line installer):

```bash
git clone https://github.com/yehudalevy-collab/polis-protocol.git
cd polis-protocol
git checkout <reviewed-commit-sha>
python3 scripts/init_polis.py \
  --project-root . \
  --agent-id gemini-antigravity-yourproject \
  --vendor google --model gemini-3 --tool antigravity
```

This writes `_polis/` plus the skill into `.antigravity/skills/`, and bridge pointers (`GEMINI.md`, `AGENTS.md`) that point every tool at `_polis/CONSTITUTION.md`. Tip: add `--dry-run` to preview every file before anything is written.

### Step 2: Register citizens and open contracts

Each agent publishes a capability card under `_polis/citizens/`. Work is opened as a contract with `required_tags`, not assigned to a fixed role.

### Step 3: Route by track record

```bash
python3 polis-protocol/scripts/route_contract.py --polis-root _polis \
  --contract _polis/contracts/open/your-task.md --explain
```

The router prints a score breakdown (history / self-rating / cost / availability) and recommends the citizen with the strongest record on the task's tags.

### Step 4: Settle, learn, and amend

A settled contract files a lesson; `--reconcile` folds it into `routing_stats.yml` so the next similar task routes better. When a rule stops working, a citizen proposes an amendment and the others vote.

## Examples

### Example 1: See the team learn (no install, 30 seconds)

```bash
git clone https://github.com/yehudalevy-collab/polis-protocol.git
cd polis-protocol
git checkout <reviewed-commit-sha>
bash scripts/demo.sh
```

The router recommends Gemini for a Spanish-translation contract — because settled work taught it she has the best record on that tag, not because anyone reassigned it.

### Example 2: Explain any routing decision

```bash
python3 scripts/route_contract.py --polis-root examples/research-team/_polis \
  --contract examples/research-team/_polis/contracts/open/parent-newsletter-issue-3.md --explain
```

## Notes

- No server, no runtime, no database — the whole protocol is markdown plus two small Python scripts.
- Vendor-agnostic by design; a Claude or Codex agent can join the same polis an Antigravity agent created.
- Full Antigravity integration guide: https://github.com/yehudalevy-collab/polis-protocol/blob/main/docs/antigravity.md

## Limitations

- Routing quality depends on accurate citizen capability cards and enough settled work history to learn from.
- The protocol coordinates agent work but does not replace review, tests, or explicit maintainer approval.
- Multi-agent voting and amendments can add process overhead for small, single-owner tasks.
- The upstream scripts are external code; pin to a reviewed commit and run `--dry-run` before allowing writes to a project.
