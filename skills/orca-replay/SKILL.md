---
name: orca-replay
description: Answer questions about a past agent run from its recording instead of from memory, and re-run or fork that run. Use when someone asks why an earlier run did something, wants a failure reproduced, or asks whether another model would have got it right.
category: development
risk: critical
source: community
source_repo: Continuum-AI-Corp/OrcaReplay
source_type: community
date_added: "2026-09-03"
author: xizhuomengcontin
tags: [debugging, replay, trace, root-cause, agent-runs, mcp]
tools: [claude-code, codex-cli, cursor, gemini-cli]
license: "Apache-2.0"
license_source: "https://github.com/Continuum-AI-Corp/OrcaReplay/blob/main/LICENSE"
---

# Reading a recorded agent run

## Overview

[OrcaReplay](https://github.com/Continuum-AI-Corp/OrcaReplay) records a coding-agent run below the
harness and can replay it offline or fork it onto another model. This skill is the judgement layer
over its MCP server: it tells an agent when to stop guessing about the past and go read the
recording instead.

Requires the `orcareplay` npm package (Node 20+) with its MCP server registered as `orca`, and at
least one recording under `.orca/runs`.

**Risk note.** `orca_replay` restores the recorded filesystem over the working tree by default and
puts it back afterwards; pass `worktree: true` to work in a scratch copy instead. `orca_compare`
reaches the network and spends real tokens. Everything else is read-only. The instructions below
tell the agent to ask before either.

A recording is evidence. Your memory of a session is not, and neither is a transcript you were
handed — both are missing the tool results, the exit codes, and the files that changed without
anyone mentioning it.

**The rule: when a question is about something that already happened, read the trace before you
answer.** Do not reconstruct it. If a recording exists, guessing is the wrong move even when the
guess would have been right.

## When to Use This Skill

- "Why did you delete/overwrite/move X?"
- "What changed this file?" / "Which step broke the build?"
- "Can you reproduce yesterday's failure?"
- "Is this flaky or does it fail every time?"
- "Would a different model have got this right?"

## Workflow

### 1. Find the run

`orca_list_runs` — newest first, and it names the run each fork came from. Skip this only when the
user clearly means the most recent one; every other tool defaults to `run: "last"`.

### 2. Narrow to the chain that produced the thing being asked about

`orca_show_run` gives the whole timeline: model turns with token counts and stop reasons, tool
calls with arguments and results, shell commands with exit codes, and every file the run changed.
Good for orientation, long for a specific question.

`orca_graph` is usually the better tool. It returns causal edges — which event produced which. Pass
`to: <event seq>` to get **only** the chain that produced one event. That is the shape of an answer
to "why did this happen", where the full timeline is the shape of an answer to "what happened".

### 3. Report `recorded` and `inferred` differently

Every edge from `orca_graph` is labelled:

- **`recorded`** — the recorder watched it happen and wrote it into the trace.
- **`inferred`** — derived just now from a rule the edge names. The trace does not vouch for it.

Carry that distinction into your answer. "The trace shows the `rm` at step 14 removed it" and "this
looks like the `rm` at step 14, going by timing" are different claims, and flattening them into one
confident sentence is the specific failure this tool exists to prevent. Name the rule when you lean
on an inferred edge.

### 4. Confirm it is deterministic before explaining it

`orca_replay` re-runs the recording with the network blocked and no tokens spent, then reports what
could not be reproduced — divergences, and requests the recording could not serve. It is free and
repeatable, so there is no reason to skip it before committing to an explanation.

Pass `worktree: true` to replay into a scratch copy when the user is actively working in the tree.
Without it the replay restores the recorded filesystem over the working tree and puts it back
afterwards, which is fine unattended and startling if someone is watching their editor.

A replay reporting `reused=3/5` on an interactive recording is not a partial failure. Harnesses make
calls for themselves — a quota probe, a session-naming request — and a replay does not repeat them.

### 5. Only then consider comparing models

`orca_compare` forks one run onto several models from the same checkpoint: same files, same
conversation prefix, so the model is the only variable. Grade with `verify` — a shell command whose
exit code is the verdict, e.g. `"npm test"` or `"npx tsc --noEmit"`. Pick the fork point with
`orca_checkpoints` and pass it as `from`.

**`orca_compare` spends real money.** Every model named is actually called. Ask before running it,
say roughly how many models and forks that means, and do not use it to satisfy your own curiosity
about a question the user did not ask.

## If there is no recording yet

Say so plainly rather than falling back to guessing, and offer to start one:

```console
npm i -g orcareplay          # if orca is not installed
orca record claude           # or codex, opencode, openclaw, grok
```

`orca record <agent>` runs the agent unmodified behind a local proxy. Nothing about the agent
changes; two environment variables get set. Recording a session now is what makes the next "why did
it do that" answerable.

For a run started with a prompt in argv — `orca record claude -- -p "…"` — the replay is exact. A
session someone typed into replays approximately, because the prompts were never on the wire and
are recovered from the harness's own transcript; `orca replay` says which is which rather than
papering over it.

## Sharing a run with someone else

`orca export last -o run.html` writes one self-contained file. `orca scrub` removes anything
sensitive first. Traces hold whatever the run held, so scrub before sending a recording anywhere.

## Tools

| tool | arguments | notes |
|---|---|---|
| `orca_list_runs` | — | newest first, names the parent of each fork |
| `orca_show_run` | `run` | the full timeline |
| `orca_checkpoints` | `run` | where a fork can start |
| `orca_graph` | `run`, `to` | causal edges; `to` narrows to one chain |
| `orca_replay` | `run`, `worktree` | offline, free, repeatable |
| `orca_compare` | `run`, `models`*, `from`, `verify` | **spends real tokens** |

`run` accepts a run id or `"last"`, and defaults to `"last"`. Replay traces are skipped when
resolving `"last"`, so it means the newest run you actually recorded.
