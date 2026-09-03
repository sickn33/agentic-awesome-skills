---
name: orca-replay
description: Answers questions about a past agent run from its recording rather than from memory, and replays or forks that run. Use when asked why an earlier run did something, or to reproduce a failure.
category: development
risk: critical
source: community
source_repo: Continuum-AI-Corp/OrcaReplay
source_type: community
date_added: "2026-09-03"
author: xizhuomengcontin
tags:
  - debugging
  - replay
  - trace
  - root-cause
  - agent-runs
  - mcp
tools:
  - claude-code
  - codex-cli
  - cursor
  - gemini-cli
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
- "Does this still reproduce?" (see the limit on that in step 4 — replay cannot tell you
  whether a *fresh* run would fail again)
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

### 4. Reproduce it before explaining it

`orca_replay` re-runs the recording and reports what could not be reproduced — divergences, and
requests the recording could not serve.

**What "offline" covers, and what it does not.** Every model response comes from the trace and the
proxy's egress is blocked, so no provider is contacted and no tokens are spent. That is the model
traffic only. The agent's own subprocesses keep their normal network access: a recorded `curl`,
`npm install`, `git push` or database call goes straight out. Replay is not a sandbox, and only a
network-isolated container makes it one.

**What a matching replay proves, and what it does not.** It shows the recorded decisions reproduce
against today's environment. It cannot show the failure is deterministic, because the model is not
being asked again — the same recorded responses are served back. If the user wants to know whether a
fresh run would fail the same way, say that replay cannot answer it; that needs real runs.

**Replay re-executes the agent, not just its model traffic.** The recorded model responses are
served from the trace, but the agent process runs again for real — so every shell command it issued
runs again too. `worktree: true` isolates repository files and nothing else. Anything the run
touched outside the tree — `/tmp`, Docker, a local database, a package manager, another host — is
mutated a second time.

**So check before the first replay of a run, not after.** Read its shell commands with
`orca_show_run` and tell the user what will re-execute. If any of it reached outside the working
tree, get approval for that specifically or replay inside a container; do not treat the earlier
`worktree` answer as covering it. A run that only read files and edited the repository is free and
repeatable, and worth replaying before committing to any explanation.

**Pass `worktree: true`.** It replays into a scratch copy and leaves the working tree alone.

Without it, replay is destructive for as long as it runs: it restores the recorded filesystem over
the working tree and puts the tree back when the replay ends. Uncommitted work is absent in the
meantime, and stays absent if the replay is interrupted before it can restore. Run an in-place
replay only when the user has been told that and has agreed to it. "They do not appear to be
typing" is not consent.

A replay reporting `reused=3/5` on an interactive recording is not a partial failure. Harnesses make
calls for themselves — a quota probe, a session-naming request — and a replay does not repeat them.

### 5. Only then consider comparing models

`orca_compare` forks one run onto several models from the same checkpoint: same files, same
conversation prefix, so the model is the only variable. Pick the fork point with `orca_checkpoints`
and pass it as `from`.

Grade with `verify` — a shell command whose exit code is the verdict. Use something the repository
already declares (`"npm test"`, `"npm run typecheck"`) or an explicitly local binary
(`"./node_modules/.bin/tsc --noEmit"`). **Do not reach for `npx <tool>` here.** If the tool is not
installed locally, npx fetches whatever the registry has under that name and runs it — and `npx tsc`
in particular resolves `tsc`, a package deprecated in 2016, not TypeScript. That would download and
execute unreviewed code inside the very step the install gate above exists to prevent.

**`orca_compare` uploads the recording to other people's models, and spends real money doing it.**
Each model named receives the same files and conversation prefix the original run had — so whatever
that run touched (source, prompts, configuration, anything a credential was pasted into) is sent to
every provider behind those model ids.

**And each fork is a live agent, not a replay.** From the fork point onward the model is really
being asked, and whatever it decides to do, it does — its shell commands execute for real, and so
does the `verify` command you pass. Each fork gets its own worktree, so repository files are
isolated per model; nothing outside the tree is. A fork can also take actions the original run never
took, because it is a different model making fresh decisions.

So the approval has three parts, and they are not the same question:

1. **Disclosure** — what context is uploaded, and to which providers. Approving a bill is not
   approving a disclosure, and the two need separate answers when the recording is from a private
   codebase. `orca scrub` is for when the comparison is worth running but the trace is not safe to
   send as-is.
2. **Side effects** — what the recorded run did outside its worktree, since each fork may repeat it
   and may go further. Same check as step 4, `orca_show_run`, and the same answer if it reached
   Docker, a database, a deployment or another host: get approval for that specifically, or run the
   comparison in an isolated environment.
3. **Cost** — how many models times how many forks.

Never run it to satisfy curiosity the user did not express.

## If there is no recording yet

Say so plainly rather than falling back to guessing, and offer to start one.

If `orca` is already installed:

```console
orca record claude           # or codex, opencode, openclaw, grok
```

If it is not, **do not download and install in one step.** `npm install -g` runs whatever
`preinstall` / `install` / `postinstall` scripts the resolved tree declares, with the user's
privileges. Pinning the top-level version fixes *which* release of `orcareplay` you get, not what
its dependencies resolve to, and not whether any of it was reviewed.

1. **Ask before downloading.** Then resolve the tree into a directory of its own with lifecycle
   scripts disabled, so nothing from it executes:

   ```console
   REVIEW=~/.cache/orca-review
   npm install orcareplay@0.1.2 --prefix "$REVIEW" --ignore-scripts
   ```

   Keep this directory. It is not a throwaway — it is the thing you are going to activate.

2. **Inspect every manifest, not the top level.** npm hoists, so scoped packages sit one level
   deeper and duplicated versions sit deeper still. A `*/package.json` glob silently skips both:

   ```console
   cd "$REVIEW/node_modules"
   find . -name package.json | wc -l                       # manifests actually present
   find . -name package.json -exec grep -l \
     'preinstall\|postinstall\|"install"' {} +              # install-time hooks
   ls -l .bin                                              # what reaches PATH
   head -5 .bin/orca                                       # follow one: symlink or shim
   grep -rl 'child_process\|execSync\|spawnSync' --include=*.js --include=*.mjs --include=*.cjs .
   grep -rl "node:https\|node:net\|node:tls\|require('https')" --include=*.js --include=*.mjs .
   grep -rlE 'process\.env\.[A-Z_]*(KEY|TOKEN|SECRET|PASSWORD)' --include=*.js --include=*.mjs .
   ```

   Report the counts and the package names each scan returns, from this run — not from a previous
   one and not from this file, because dependency ranges make the tree differ between installs.

   **Say what this is.** It is a surface scan of roughly a thousand files: manifests, hooks, what
   lands on `PATH`, and which packages touch subprocesses, the network, or credential-shaped
   environment variables. It is not a source audit, and it will not catch obfuscated or
   dynamically-constructed behaviour. Report it as what it is. If the threat model needs more than
   that, say so and let the user decide, rather than implying the tree has been read.

3. **Ask again, then activate the tree you just reviewed.** It is already a working install:

   ```console
   "$REVIEW/node_modules/.bin/orca" record claude
   ```

   `npm i -g orcareplay@0.1.2` and `npx orcareplay@0.1.2` both **re-resolve** the dependency tree at
   that moment, so either can pull a transitive version that was not in the tree you inspected — and
   a global install runs its hooks. `$REVIEW/package-lock.json` records the exact tree that was
   reviewed; if a global install is genuinely wanted, review it again against that lock rather than
   treating this approval as covering it.

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

## Limitations

- **It only sees what was recorded.** Runs started without `orca record` leave no trace, and
  nothing here recovers them. The answer to "why did it do that" in an unrecorded session is
  honestly "there is no recording", not a reconstruction.
- **A typed session replays approximately, not exactly.** Prompts entered at a terminal were never
  on the wire; orca recovers them from the harness's own transcript. Only a run started with the
  prompt in argv (`orca record claude -- -p "…"`) replays byte-for-byte.
- **Some turns are not repeated.** A harness makes calls for itself — a quota probe, a
  session-naming request — and a replay steps over them. Tools that need a person
  (`AskUserQuestion`, plan mode) are absent when the same agent runs without one, which can make a
  replayed request differ from the recorded one by enough to halt.
- **`inferred` edges are not evidence.** They are derived from a named rule at query time. Treat
  them as a reading of the trace, never as something the recorder witnessed.
- **Not every harness is recordable.** Agents that read no base-URL variable and pin their own
  origin need `--tls-intercept`, and some cannot be reached at all. A recording that came back
  empty means the harness was not captured, not that nothing happened.
- **Replay is not a time machine, and not a sandbox.** It reproduces the agent's side of the run
  against today's world. External state the run depended on — a database row, a remote branch, the
  clock — is whatever it is now, and the run's own shell commands reach it for real.
- **A matching replay is not a determinism result.** The model is not re-asked; its recorded
  responses are served back. Whether a fresh run would fail the same way is a different question
  that replay cannot answer.

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
