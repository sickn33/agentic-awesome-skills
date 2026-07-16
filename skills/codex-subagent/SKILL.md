---
name: codex-subagent
description: "Launch Codex CLI as an isolated subagent for bounded coding, review, or verification tasks."
category: agent-orchestration
risk: critical
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [codex, subagents, delegation]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
disable-model-invocation: true
---

# Codex CLI as a Subagent

## When to Use

- Use when a bounded coding, review, or verification task can run in a separate Codex CLI session.
- Use when parallel work needs explicit file ownership and a clear definition of done.

Codex CLI is OpenAI's terminal coding agent. `codex exec` runs it non-interactively:
it works autonomously in a sandbox, streams progress to stderr, and prints only the
final message to stdout. Auth reuses the user's ChatGPT subscription — never an API key.

## When to delegate

- Self-contained coding task with clear success criteria (fix, feature, refactor, review).
- Parallel work: several independent tasks at once (see Parallel runs).
- Second opinion / independent verification of your own changes.

Do NOT delegate tasks that need conversation context you can't fully write into the prompt.

## Preflight

```bash
codex --version       # missing? npm i -g @openai/codex  (or: brew install --cask codex)
codex login status    # exit 0 + "Logged in using ChatGPT" = ready
```

Not logged in → stop and tell the user to run `codex login` (one-time browser OAuth).
Never read, print, or copy credentials (`~/.codex/auth.json`).

## Launch

```bash
OUT=$(mktemp /tmp/codex-out.XXXXXX)
codex exec \
  --cd /path/to/repo \
  --sandbox workspace-write \
  --output-last-message "$OUT" \
  "Full task prompt: goal, constraints, files to touch, definition of done." \
  </dev/null
```

- `</dev/null` is MANDATORY when stdin is not a real terminal (background shells,
  scripts): codex treats open stdin as extra context and waits forever for EOF.
- Codex sees NOTHING of your conversation. Put all context in the prompt:
  goal, relevant paths, constraints, and how to verify it's done.
- Long prompt? Pipe it via stdin instead: `codex exec [flags] - < /tmp/task.md`.
- Wrap the command in a background/Bash subagent if your host agent has one
  (Cursor: Task tool with a shell subagent) so Codex's verbose stream stays out
  of the parent context. Fallback: a plain background terminal.
- Runs take minutes and have no built-in timeout — background it and monitor.
- Optional: `-m <model>` to override the model, `--json` for JSONL event stream.

## Collect results

```bash
cat "$OUT"                            # final message = the deliverable
git -C /path/to/repo status --short   # see what Codex actually changed
```

Follow-up in the same session (run from the same cwd — resume filters by cwd):

```bash
codex exec resume --last "follow-up instruction" </dev/null
```

## Parallel runs

Parallelize only genuinely independent tasks, and assign file ownership upfront so
results merge cleanly. One git worktree per Codex run — never two in the same tree:

```bash
git worktree add /tmp/wt-taskA -b codex/task-a
codex exec --cd /tmp/wt-taskA --sandbox workspace-write -o /tmp/outA.md "task A" </dev/null
```

## Failure modes

- Hangs forever with no output → stdin was left open. Kill it, relaunch with `</dev/null`.
- `codex login status` non-zero → the user must run `codex login`. Don't work around it.
- ChatGPT plan rate limit hit → report to the user; never retry in a loop.
- "Not a git repo" error → add `--skip-git-repo-check`, or init a repo first.
- Network is blocked inside the workspace-write sandbox by default. If the task
  needs it (installs, API calls): `-c sandbox_workspace_write.network_access=true`.
- NEVER use `--dangerously-bypass-approvals-and-sandbox`.

## Rules

- One task per launch. Split big jobs into multiple launches.
- Review Codex's diff yourself before declaring the task done.

## Cursor-native wrapper (optional)

For auto-routing and `/codex` invocation inside Cursor, add `~/.cursor/agents/codex.md` —
a custom subagent whose description is "delegates coding tasks to Codex CLI" and whose
body points at this skill.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
