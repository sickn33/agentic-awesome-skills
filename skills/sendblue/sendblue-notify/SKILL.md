---
name: sendblue-notify
description: "Text the user's phone when a long-running task, agent turn, or scheduled job finishes — via @sendblue/cli for outbound, optionally wired to a Claude Code Stop hook for automatic fire."
category: automation
risk: safe
source: community
source_type: official
date_added: "2026-05-22"
author: AnthonyFirth
tags: [sendblue, imessage, sms, notifications, hooks, claude-code, automation]
tools: [claude, cursor, gemini]
---

# Sendblue Notify

## Overview

Outbound, fire-and-forget notifications from a local Claude Code session, script, or scheduled job to the user's phone via Sendblue. This is the "walk away from the terminal" pattern: kick off something long, get an iMessage when it lands. This skill owns **when to notify and what to say**. Actual sending goes through [[sendblue-cli]]. Hook wiring (so notifications fire automatically) goes through [[update-config]].

## When to Use This Skill

- Use when the user says "text me when X is done", "ping my phone", "notify me on completion", "let me know when the build/deploy/migration finishes", or "send me an iMessage when…".
- Use when the user asks to wire a hook that texts on agent stop, `/loop` iteration, or `/schedule` completion.
- Use when an agent turn is genuinely long-running and the user has gone heads-down on something else.
- Do **not** use for short, interactive tasks where the user is watching the terminal — the notify is noise.

## Prerequisites

The CLI must be installed and authenticated:

```bash
npx @sendblue/cli whoami        # confirms creds
# or, if first run:
npx @sendblue/cli setup
```

The user's phone number must be a verified contact on the account. On the free plan, the contact has to text the Sendblue number once before outbound sends work — confirm with `sendblue contacts` before relying on notify in an unattended workflow.

Cache the destination number once per project rather than re-asking. A `NOTIFY_NUMBER` env var or a one-line `.notify-number` file is fine; defer storage strategy to whatever the surrounding project already does.

## How It Works

### Step 1: Decide whether notify is appropriate

Notify is for **long, unattended work** — not chatter. Good triggers:

- Agent turns over ~2 minutes (build, large refactor, migration, dataset crunch).
- `/loop` and `/schedule` jobs that produce a discrete result.
- CI / deploy completion when watched from the terminal.
- Multi-step playbooks where the user has gone heads-down on something else.

Bad triggers (do not silently wire these):

- Every `Stop` event, regardless of duration — produces spam, trains the user to ignore.
- Read-only or sub-second commands.
- Anything inside a tight loop.

If the user asks for "notify me when done" on a short task, do the obvious one-shot inline send (Example 1) and **do not** install a global hook.

### Step 2: Pick a delivery pattern

- **One-shot inline send** — default for a single ad-hoc task. No config changes.
- **`Stop` hook** — opt-in, project-scoped, for sessions the user explicitly wants on automatic notify. Always gate by duration.
- **End-of-`/loop` or `/schedule` ping** — append the send to the routine's body.

### Step 3: Compose the notification copy

- **One line, under ~140 chars** — fits in the lock-screen preview.
- **Lead with outcome** — ✅/❌, "done", "failed", "needs review".
- **Include something actionable** — branch name, error tail, PR number, duration.
- **No emojis the user didn't ask for** beyond a single status glyph.
- **No agent self-narration** ("I have completed the task as requested" — just say what happened).

## Examples

### Example 1: One-shot inline send

For a single task, append the send to the command. This is the default — no config changes, no surprise behavior later.

Branch on the task's exit status with an `if`/`else`. Do **not** use a `task && send-success || send-failure` chain: if the task succeeds but the success-send itself returns non-zero, the `||` fires the failure message — so the user sees ❌ even though the task completed. The `if`/`else` keeps the outcome tied solely to the task.

```bash
if long_running_thing; then
  npx @sendblue/cli send +15551234567 "✅ done: $(date +%H:%M)"
else
  npx @sendblue/cli send +15551234567 "❌ failed: $(date +%H:%M)"
fi
```

Or, when the result is interesting, include a one-line summary:

```bash
RESULT=$(run-migration 2>&1 | tail -1)
npx @sendblue/cli send +15551234567 "migration done — $RESULT"
```

### Example 2: Claude Code `Stop` hook (opt-in, scoped)

Register a `Stop` hook in `.claude/settings.json` (project-scoped) — never in global settings unless asked. Defer the actual file edit to [[update-config]]. The hook command itself should:

1. Run cheaply (it fires on *every* `Stop`).
2. Gate on duration — skip sends for turns under a threshold (e.g. 90s).
3. Never fail the parent — pipe to `|| true` so a notify error doesn't surface as a hook failure.

```bash
[ "$CLAUDE_TURN_DURATION_SECONDS" -ge 90 ] && \
  npx @sendblue/cli send "$NOTIFY_NUMBER" "turn done in ${CLAUDE_TURN_DURATION_SECONDS}s" || true
```

(Adjust the env var names to whatever the hook contract actually provides — verify against the current Claude Code hooks reference before writing the config; the harness owns those names, not this skill.)

Show the proposed hook config to the user and get confirmation before invoking [[update-config]]. Automated outbound messages are a footgun if the threshold is wrong.

### Example 3: End-of-`/loop` or `/schedule` ping

```bash
/loop 10m "check deploy; npx @sendblue/cli send +15551234567 \"deploy: \$(deploy-status)\""
```

For `/schedule`, the routine itself can shell out at the end. Same copy rules apply.

## Composing with textme

If the user has `@textme` installed (njerschow/textme — daemon that lets you *text Claude* from your phone), notify is still useful and not redundant. They run in opposite directions:

- **textme**: phone → Claude (user initiates from the phone).
- **sendblue-notify**: local Claude → phone (Claude initiates from a local session).

You can install both: textme on a server for inbound, notify as a local `Stop`-hook for outbound. Different problems, same Sendblue account.

## Best Practices

- ✅ **Default to one-shot inline sends** for single tasks. Only escalate to a hook when the user asks for automatic notify.
- ✅ **Gate hooks by duration.** A 90s threshold is a sensible starting default.
- ✅ **Show the hook config before installing it** and get explicit user confirmation.
- ✅ **Store the destination number per-user** (env var or gitignored file), not in committed config.
- ❌ **Don't install global hooks** unless the user explicitly asks. Project-scoped is the default.
- ❌ **Don't let a failed notify fail the parent.** Trail with `|| true`.

## Limitations

- Notify is outbound-only. For "text Claude from the phone" use the `@textme` skill instead.
- On the free Sendblue plan, the destination phone must have texted the Sendblue number at least once before outbound succeeds. Verify with `sendblue contacts` before relying on notify in an unattended workflow.
- This skill does not own credentials, account setup, or the hook config file format. Those belong to [[sendblue-cli]] and [[update-config]] respectively.

## Security & Safety Notes

- **Lock-screen previews leak.** Anyone holding the phone can read notification copy. Do not embed secrets, customer data, full error stacks, or auth tokens. Link to a log, dashboard, or PR instead.
- **Automated outbound is a footgun.** A misconfigured `Stop` hook can fire dozens of messages a minute. Always gate by duration and prove the threshold in a dry run before committing.
- **Per-user numbers.** The destination phone number is a personal identifier — keep it in user-local config (env var, gitignored file), not in committed repo files or CI logs.
- **Free-plan verification is silent.** If the destination contact hasn't texted in once, sends return an API error but the user just sees "no text arrived". Confirm verification before wiring an unattended hook.

## Common Pitfalls

- **Spam from over-eager `Stop` hooks.** Always gate by duration. A user who gets pinged every 4 seconds will rip the hook out within an hour.
- **Hardcoding the destination number in committed files.** Use an env var or gitignored file; the number is per-user, not per-repo.
- **Letting a failed notify fail the parent.** Always trail with `|| true` in hooks; surface the failure in logs, not by aborting the agent turn.
- **Free-plan contact gotcha.** If the destination contact hasn't texted in once on a free-plan account, the send silently fails for the user's purposes. Verify with `sendblue contacts` before wiring an unattended hook. Or `sendblue upgrade` to the AI Agent plan.
- **PII in notification copy.** Lock-screen previews are visible to anyone holding the phone. Don't embed secrets, customer data, or full error stacks — link to a log or PR instead.
- **Burying the outcome.** "Task complete. Here is a summary of what I did…" wastes the preview line. Lead with ✅/❌ and the verb.

## Related Skills

- `@sendblue-cli` — Owns the actual send mechanism. This skill calls into it.
- `@sendblue-api` — HTTP alternative for app code where notify lives inside a long-running service.
- `@update-config` — Wires the `Stop` hook into `.claude/settings.json`. This skill owns the *what* and *when*; update-config owns the *where*.
- `@textme` — Inbound counterpart (phone → Claude). Composes well with notify.

## Links

- Underlying CLI: <https://github.com/sendblue-api/sendblue-cli>
- Sendblue: <https://sendblue.com>
- API docs: <https://docs.sendblue.com>
