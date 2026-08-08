---
name: run-deep-swe
description: "Run reproducible DeepSWE coding-agent benchmark evaluations through OpenRouter and mini-swe-agent."
category: agent-evaluation
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [benchmark, deepswe, openrouter, evaluation]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
disable-model-invocation: true
---

# Run DeepSWE via OpenRouter

## When to Use

- Use when the user wants to benchmark a model on DeepSWE or mini-swe-agent tasks.
- Use when you need a reproducible coding-agent evaluation plan and output artifacts.

DeepSWE (deepswe.datacurve.ai) is a 113-task Harbor-compatible coding-agent benchmark. It runs via **Pier** (Harbor fork) driving **mini-swe-agent** (model-agnostic). Any model reachable through OpenRouter can be scored.

## Prerequisites — state-check first

```bash
which uv git docker || echo "MISSING: install uv, git, docker"
docker info >/dev/null 2>&1 || echo "MISSING: Docker daemon not running (Pier's default sandbox)"
echo "OPENROUTER_API_KEY set? ${OPENROUTER_API_KEY:+YES}"
```

**Docker must be running** — Pier sandboxes each task in Docker by default (`--env modal` for cloud instead).

`OPENROUTER_API_KEY` must already be present in the environment. If it is unset,
ask the user to configure their preferred secret-management path; do not read
shell startup files, print secrets, or invent a key.

## Setup

```bash
git clone https://github.com/datacurve-ai/deep-swe && cd deep-swe
uv tool install datacurve-pier            # PyPI (preferred)
# or: uv tool install git+https://github.com/datacurve-ai/pier
# pier bundles mini-swe-agent as the --agent driver
```

Run all `pier` commands from inside `deep-swe/`, using relative `-p tasks/...`.

## OpenRouter wiring (the part the docs don't spell out)

mini-swe-agent has a native OpenRouter model class. Both routes below use `OPENROUTER_API_KEY` and the OpenRouter slug (`vendor/model`, e.g. `minimax/minimax-m3`):

**Route A — native OpenRouter class (preferred, hits openrouter.ai/api/v1 directly):**
```bash
pier run -p deep-swe/tasks --agent mini-swe-agent \
  --model minimax/minimax-m3 --model-class openrouter
```

**Route B — LiteLLM provider prefix (fallback; same key):**
```bash
pier run -p deep-swe/tasks --agent mini-swe-agent \
  --model openrouter/minimax/minimax-m3
```

Notes:
- Slug = the exact OpenRouter slug. Verify it at openrouter.ai/models before running.
- Free/zero-cost models: OpenRouter cost tracking can error. Set `export MSWEA_COST_TRACKING=ignore_errors`.
- Flag spelling can vary by version — confirm with `pier run --help` and `mini --help`.

## Smoke test FIRST (1 task — do this before any full run)

Always validate end-to-end wiring on a single task before spending tokens on the corpus:

```bash
pier run -p deep-swe/tasks/<task-id> --agent mini-swe-agent \
  --model minimax/minimax-m3 --model-class openrouter
# list available task ids:
ls deep-swe/tasks
```

Pass criteria: run completes, model returns actions (not auth/format errors), a score/trajectory is emitted. If it 401s → key wrong. If "provider not provided"/"model not mapped" → fix slug or switch route.

## Subset run (deterministic sample)

```bash
pier run -p deep-swe/tasks --agent mini-swe-agent \
  --model minimax/minimax-m3 --model-class openrouter \
  --n-tasks 10 --sample-seed 0
```

## Full 113-task corpus (costs tokens + time — confirm with user first)

```bash
pier run -p deep-swe/tasks --agent mini-swe-agent \
  --model minimax/minimax-m3 --model-class openrouter
# add `--env modal` to run in parallel Modal sandboxes (needs Modal configured)
```

## Output & leaderboard

- Trials land in `jobs/<run>/<trial_id>/`. Inspect with `pier view jobs/<run>`, `pier analyze jobs/<run>`, or `pier critique run jobs/<run>`.
- Report: the exact command used, pass/fail, score, and any blockers.
- Submit results for the official leaderboard to: **<email-address>**

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| HTTP 401 | bad/missing key | re-export `OPENROUTER_API_KEY` |
| "LLM Provider NOT provided" | missing slug prefix | use Route B `openrouter/...` or Route A with `--model-class openrouter` |
| "model isn't mapped"/cost error | unknown cost for model | `export MSWEA_COST_TRACKING=ignore_errors` |
| unknown flag | version drift | check `pier run --help` |

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
