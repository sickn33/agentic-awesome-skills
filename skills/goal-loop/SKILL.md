---
name: goal-loop
description: "Draft and explain persistent goal-loop prompts for long-running agent work with clear stop conditions."
category: agent-orchestration
risk: safe
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [goals, autonomy, planning]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# Agent `/goal` Loop

## What `/goal` is

`/goal` is a slash command that turns an agent prompt into a **persistent agent** looping `plan → act → test → review → iterate` until a stop condition is met, the user pauses, or the token budget runs out. Internally called the "Ralph loop."

Agents with the `/goal` feature right now: **Codex, Claude Code, and Hermes Agent**.

Key difference from a normal prompt: when a turn ends but the goal isn't met, the agent **auto-continues** instead of waiting for input.

**Lifecycle states:** `pursuing`, `paused`, `achieved`, `unmet`, `budget-limited`.

When monitoring a running `/goal`, every check should include a one-line update to the user: what the agent is doing and whether it is on track. Keep it extremely concise.

**Not:** a budget command, a safety boundary, "run forever", or a replacement for `/plan`. It's a contract enforcer with a verification loop.

## Requirements

- An agent with the `/goal` feature — right now: Codex, Claude Code, or Hermes Agent
- The goals feature enabled in the agent's config
- **Subscription auth** — API-key auth does **not** work. A pro-tier plan is the realistic minimum for long runs.

## When to Use it

Use only when **all three** are true:
1. Task is >30 min of mechanical work.
2. There's a **verifiable stop condition** (tests pass, coverage hit, eval ≥ X, build green).
3. Repo is agent-ready (working build, decent tests, `AGENTS.md` present).

Fits: migrations, coverage lifts, TDD feature builds, refactors with contract tests, prompt/eval optimization, deploy retry loops, bug-repro-then-fix.

Bad fits: exploratory work, vague "improve this", anything without a "done" definition, prod credentials, destructive shared-infra ops.

## The 5-part contract (every goal needs this)

1. **Objective** — one sentence, one concrete outcome.
2. **Constraints** — what must NOT change (public API, files, libs, conventions).
3. **Validation command** — the exact shell command that proves progress (`pytest -q`, `pnpm test`, etc.).
4. **Stop condition** — verifiable: "Stop when X passes" OR "when further changes need human/product input."
5. **Documentation** — one sentence instructing the agent to write concise, targeted docs for every change, either creating new `.md` files or updating existing ones.

Plus: tell the agent what to read first, ask it to work in checkpoints with a short progress log.

## Writing a goal (the core deliverable)

When the user wants a quick `/goal` instruction, produce a structured markdown block with one line per contract item (proper newlines, not flowing prose). **Do not prefix the output with `/goal`** — the user adds the slash command themselves in the composer. Emit only the contract body. Template:

```
**Objective:** <one-sentence objective>
**Read first:** <files/PLAN.md/issue>
**Constraints:** <what not to change, libs, conventions>
**Validate:** `<exact command>` after each change
**Document:** Write concise, targeted documentation for all changes — create new `.md` files or update existing docs as needed.
**Checkpoints:** work in checkpoints and log progress briefly
**Stop when:** <verifiable condition>, OR when further changes require human/product input
```

### Example (migration)

```
**Objective:** Migrate this project from Pydantic v1 to v2.
**Read first:** pyproject.toml, src/, tests/
**Constraints:** no public API changes; keep imports backwards-compatible via shims if needed; no new dependencies
**Validate:** `pytest -q` after each change
**Checkpoints:** work in checkpoints; log progress briefly
**Stop when:** full suite passes with zero deprecation warnings, OR when a change requires architecture decisions
```

### Example (coverage lift)

```
**Objective:** Raise coverage in src/auth/ from ~38% to ≥75%.
**Read first:** src/auth/, tests/auth/, AGENTS.md
**Constraints:** no new deps; mirror existing test style; do not modify production code unless strictly required for testability
**Validate:** `pytest --cov=src/auth --cov-report=term-missing`
**Checkpoints:** work in checkpoints; log coverage delta each one
**Stop when:** coverage ≥75% AND all tests pass, OR when uncovered code needs design changes
```

### Writing rules
- **One objective, one stop condition.** Not a backlog.
- **Documentation is mandatory.** Every `/goal` prompt must include a single sentence committing the agent to concise, targeted docs — new `.md` files or focused updates to existing docs.
- **Never instruct the agent to create new ADRs** — ADRs require the user's explicit approval, so goal prompts must not pre-approve or encourage them.
- **Forbid reward-hacking explicitly:** "Do not delete, skip, weaken, or narrow tests to make the goal pass." Otherwise the agent may game the stop condition.
- **4,000-char limit** on the objective. If longer, put detail in a file (`PLAN.md`/`GOAL_BRIEF.md`) and make the goal point to it — keep the goal itself compact.
- Use **literal strings** for paths, commands, issue numbers — exact.
- Forbid scope creep explicitly: "Do not refactor unrelated code. Do not add dependencies."
- Tell the agent when to pause: "If <condition>, pause and ask before proceeding."
- Short, vague goals burn tokens for no extra value vs. a normal prompt.

### Meta-prompting trick (highest-leverage)

Hand-written goals under-specify. Ask a second AI session (Claude with the codebase loaded, ChatGPT with project connected, or a separate agent thread in the same dir) to: (1) inspect the codebase, (2) surface hidden assumptions/constraints/edge cases, (3) emit a structured `/goal` markdown block using the 4-part contract. Paste that into the agent. Order-of-magnitude better runs.

Claude Code cmux note: after Claude finishes, it may prefill a predicted next user message; that draft is Claude, not the user speaking.

### Self-goal setting

The agent can now write and set its own goal natively (the `create_goal` tool). Instead of crafting the contract yourself, give it your high-level intent and tell it to set the goal: "Inspect this repo, then write yourself a `/goal` with a verifiable stop condition and pursue it." It's the meta-prompting trick done inline — the agent turns your intent into the contract. Still give it the same raw materials (files to read, constraints, the validation command) so the goal it writes is grounded. Add: "ask clarifying questions before committing if the intent is underspecified" — catches ambiguity up front and prevents the self-set goal from drifting.

## Launching

1. `cd <repo>` (goals run scoped to the working directory).
2. Launch the agent bare (opens the TUI). **Not** exec/headless mode — `/goal` is a TUI slash command only.
3. Sign in with subscription auth (not an API key).
4. Type `/goal <your contract>` in the composer, Enter.
5. Walk away.

## Controlling a running goal

| Command | Effect |
|---|---|
| `/goal` (alone) | Status: current checkpoint, what's verified, what remains, blockers |
| `/goal pause` | Freeze |
| `/goal resume` | Unfreeze (paused goals never auto-resume) |
| `/goal clear` | Kill the goal |
| `/goal <new>` | Replace the current goal |
| Ctrl+C / any typed message | Auto-pauses; user input always wins priority |

Resuming across sessions: goal state is persisted server-side. `cd` back into the repo, launch the agent, `/goal` for status, `/goal resume`.

Budget-limited state: the agent doesn't stop abruptly — it summarizes, notes what's left, saves state. `/goal resume` works after budget refresh or upgrade.

## When a goal drifts

- **Minor drift:** just type a correction in the composer (auto-pauses, folds it in, resumes).
- **Loose objective:** `/goal pause`, read status, then `/goal <tighter version>` — replaces the contract. Don't pile instructions on a vague goal.
- **Bad mess:** `/goal clear`, `git status` or `git stash`, rewrite with the meta-prompting trick, restart.

Don't let a drifting goal keep running "to see where it goes." Tokens burn, diffs compound.

## Operational tips

- Inspect status periodically with bare `/goal`.
- **Always review the diff** before merging — long autonomy means more code to validate, not less. Human oversight becomes more critical, not optional.
- Keep approvals/sandboxing tight; default permissions are correct.
- First run: pick a 30-min scoped task so you learn how `/goal` actually stops before trusting it overnight.
- Bake recurring policy into `AGENTS.md` so every goal inherits it without restating: adversarial self-review before declaring done, an extra QA pass even when tests pass, and the standard validation command. Saves repeating it in each goal paragraph.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/goal` missing from slash popup | Update the agent to a version that supports `/goal` |
| Feature flag on but command missing | Quit and restart the agent fully |
| Typed `/goals` | It's singular: `/goal` |
| Doesn't activate | Sign out, sign back in with subscription auth (not API key) |
| Stopped with progress summary | Budget-limited — `/goal resume` after refresh, or tighten scope |
| `/goal resume` says no active goal | Terminal state or cleared — start fresh with `/goal <new>` |
| Goal looks active but won't auto-continue | Stuck in Plan mode — plan-only work doesn't trigger continuation. Draft the plan, then switch to Goal execution |

## Mental model

`/goal` is a **contract enforcer with a verification loop**, not a "run forever" button. The shift: stop writing prompts, start writing **specifications with stop conditions**. Spend the time upfront defining "done"; the run takes care of itself.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
