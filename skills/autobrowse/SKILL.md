---
name: autobrowse
description: Self-improving browser automation via the auto-research loop. Iteratively
  runs a browsing task, reads the trace, and improves the navigation skill (strategy.md)
  until it reliably passes. Supports par…
license: MIT
compatibility: Requires Node.js 18+, browse CLI, and ANTHROPIC_API_KEY. Run from the
  autobrowse app directory.
allowed-tools: Bash Read Write Edit Glob Grep Agent
metadata:
  author: browserbase
  homepage: https://github.com/browserbase/skills
source_repo: browserbase/skills
source_type: official
source: browserbase
date_added: '2026-09-21'
risk: unknown
---

# AutoBrowse — Self-Improving Browser Skill

Build reliable browser automation skills through iterative experimentation. An inner agent browses the site (`evaluate.ts`). You — the outer agent — read what happened and improve the instructions (`strategy.md`). Repeat until it passes consistently.

## Entry Points

Invocation is flexible — both explicit flags and free-form natural language work:

```
/autobrowse --task google-flights
/autobrowse --task google-flights --iterations 10 --env remote
/autobrowse --task google-flights --browser-trace
/autobrowse --tasks google-flights,amazon-add-to-cart
/autobrowse --all

# Also fine — parse freely:
/autobrowse https://flights.google.com/
/autobrowse book a flight on delta.com
/autobrowse fix the existing google-flights skill
```

`--browser-trace` (default off, remote-only): pairs each iteration with the sibling `browser-trace` skill — wraps the inner agent in a CDP capture for per-page network/console/page-lifecycle evidence. Implies `--env remote`; errors if combined with `--env local`. Requires the sibling `browser-trace` skill present at `${CLAUDE_SKILL_DIR}/../browser-trace/`, and the `BROWSERBASE_API_KEY` env var.

When the user drops a URL or free-form instruction instead of `--task <name>`:
- If an existing task in `${WORKSPACE}/tasks/` clearly matches the site/intent, use it.
- Otherwise, pick a short kebab-case name, create `${WORKSPACE}/tasks/<name>/task.md` from `${CLAUDE_SKILL_DIR}/references/example-task.md`, fill in the URL/goal based on what the user said, and proceed. Tell the user the chosen name in one line.

---

## How to run

### Step 1 — Parse arguments and orient

Check what was passed:
- `--task <name>` → single task mode
- `--tasks a,b,c` or `--all` → multi-task mode (spawn sub-agents)
- `--iterations N` → how many evaluate → improve cycles (default: 5)
- `--env local|remote` → browser environment (default: local; use remote for bot-protected sites)
- `--browser-trace` → opt in to the browser-trace integration (default off). Implies `--env remote`. If `--env local --browser-trace` are both passed explicitly, error with: `browser-trace requires Browserbase; drop --env local or drop --browser-trace.`

If the user passed free-form text instead, map it to one of the above before continuing.

### Step 2 — Set up the workspace

All training artifacts (task definitions, strategy iterations, traces, reports) live in a workspace directory in the **current working directory** — NOT inside `~/.claude/skills/`. This keeps the inner agent's file writes out of Claude's home dir and away from permission friction.

Default workspace: `${CWD}/autobrowse/`

```bash
mkdir -p ./autobrowse/tasks ./autobrowse/traces ./autobrowse/reports
```

If the task directory (`./autobrowse/tasks/<task>/task.md`) doesn't exist yet, scaffold it:

```bash
mkdir -p ./autobrowse/tasks/<task>
cp ${CLAUDE_SKILL_DIR}/references/example-task.md ./autobrowse/tasks/<task>/task.md
# Then edit task.md to describe the URL, inputs, steps, and expected JSON output
```

The skill source at `${CLAUDE_SKILL_DIR}` stays read-only — only `./autobrowse/` in CWD gets written to during training. Graduation (final step) writes a single file to `~/.claude/skills/<task>/SKILL.md`.

List available tasks:
```bash
ls ./autobrowse/tasks/
```

### Step 3 — Multi-task: spawn parallel sub-agents

If running multiple tasks, use the Agent tool to spawn one sub-agent per task simultaneously. Each sub-agent receives a self-contained prompt to run the full autobrowse loop for its task:

> "You are running the autobrowse skill for task `<name>`. Workspace: `<absolute-path-to-workspace>` (e.g. `/path/to/project/autobrowse`). Run `<N>` iterations of: evaluate → read trace → improve strategy.md → repeat. Use `--env <env>`. Pass `--workspace <workspace>` to every evaluate.mjs invocation. If the parent invocation used `--browser-trace`, you MUST use the traced-path block of the SKILL.md loop for every iteration (pre-create session, attach bb-capture, pass `--connect-url` to evaluate.mjs, stop+bisect, release) — do not fall back to the default single-command path. Follow the autobrowse loop instructions exactly.
>
> When graduating, install the skill to `~/.claude/skills/<task-name>/SKILL.md` with proper agentskills frontmatter (name + description). Do not just copy strategy.md — write a self-contained skill.
>
> At the end, output a structured summary with: task name, pass/fail on final run, total cumulative cost, iterations completed, per-iteration table (iter number, turns, cost, status, hypothesis tested), and 2-3 bullet key learnings."

Spawn all sub-agents in parallel, wait for all to complete, then collect their summaries and write the session report.

**For single task**, skip this step and run the loop directly below.

---

## The Loop (run this for each task)

### Iteration start

Check that `./autobrowse/tasks/<task>/task.md` exists (scaffold it from the template if not — see Step 2). `strategy.md` is auto-created empty by the harness on first run.

### Requirements

- `ANTHROPIC_API_KEY` must be in the environment (or in a `.env` file in CWD — `evaluate.mjs` auto-loads it). If missing, the harness prints a clear error and exits; don't hunt for keys in other paths.

### Run the inner agent

**Default path (no `--browser-trace`)** — single command, no orchestration:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/evaluate.mjs --task <task-name> --workspace ./autobrowse
# or for bot-protected sites:
node ${CLAUDE_SKILL_DIR}/scripts/evaluate.mjs --task <task-name> --workspace ./autobrowse --env remote
```

This runs the browser session and writes a full trace to `./autobrowse/traces/<task>/latest/`.

**Traced path (`--browser-trace`, remote only)** — the outer harness pre-creates a Browserbase session, attaches `bb-capture` as a passive observer, and passes the session's `connectUrl` to `evaluate.mjs` so every inner `browse` call uses `--cdp $connectUrl --session autobrowse-main` (the canonical browser-trace pattern that gives observers full Network/Console events). Run this block once per iteration with `$N` set to the 1-indexed iteration number:

```bash
# Preflight — fail fast if browser-trace isn't installed alongside autobrowse.
BT_DIR="${CLAUDE_SKILL_DIR}/../browser-trace"
if [ ! -f "$BT_DIR/scripts/bb-capture.mjs" ]; then
  echo "ERROR: --browser-trace requires the browser-trace skill at $BT_DIR." >&2
  echo "Install it by cloning github.com/browserbase/skills and copying skills/browser-trace/" >&2
  echo "into the same parent directory as autobrowse (e.g. ~/.claude/skills/browser-trace/)." >&2
  exit 1
fi

# a. SESSION SETUP — pre-create the keep-alive session and derive its connectUrl
sid=$(browse cloud sessions create --keep-alive --verified --proxies \
  | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>process.stdout.write(JSON.parse(s).id))")
connect_url=$(browse cloud sessions get "$sid" \
  | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>process.stdout.write(JSON.parse(s).connectUrl))")

RUN_ID="run-$(printf '%03d' "$N")"
TRACE_ROOT="./autobrowse/traces/<task-name>/$RUN_ID"
mkdir -p "$TRACE_ROOT"
export O11Y_ROOT="$TRACE_ROOT/.o11y"   # park browser-trace output inside the autobrowse run dir
export O11Y_RUN_ID="$RUN_ID"           # tells the browse CLI which run dir to write descriptors.ndjson into

# b. ATTACH BROWSER-TRACE — passive observer; runs in background
node ${CLAUDE_SKILL_DIR}/../browser-trace/scripts/bb-capture.mjs "$sid" "$RUN_ID" &
sleep 2

# c. RUN AUTOBROWSE — connectUrl flag tells evaluate.mjs to inject --cdp/--session
#    into every inner browse call. The inner agent never sees --remote.
node ${CLAUDE_SKILL_DIR}/scripts/evaluate.mjs \
  --task <task-name> --workspace ./autobrowse --env remote \
  --connect-url "$connect_url" --run-number "$N"

# d. STOP + BISECT + UNIFY — order matters; bisect needs the session to still
#    exist, and unify-trace joins the bisect output with autobrowse's trace.json
#    into a single time-ordered NDJSON the outer agent reads first each iter.
node ${CLAUDE_SKILL_DIR}/../browser-trace/scripts/stop-capture.mjs "$RUN_ID"
node ${CLAUDE_SKILL_DIR}/../browser-trace/scripts/bisect-cdp.mjs "$RUN_ID"
node ${CLAUDE_SKILL_DIR}/scripts/unify-trace.mjs \
  --trace-dir "$TRACE_ROOT" \
  --o11y-dir "$O11Y_ROOT/$RUN_ID"

# e. RELEASE
browse cloud sessions update "$sid" --status REQUEST_RELEASE
```

This writes the inner-agent trace to `./autobrowse/traces/<task-name>/latest/` and the CDP bisect to `./autobrowse/traces/<task-name>/latest/.o11y/<run-id>/`. The traced `browse` CLI also emits per-command rich node descriptors to `.o11y/<run-id>/cdp/descriptors.ndjson` (one JSON object per page-driving call: target tag/id/role/accessibleName/attributes/xpath/bounding-rect). The descriptors file feeds downstream codegen; it is **not** required for hypothesis formation — skip it when reading the trace.

### Read the trace

```bash
cat ./autobrowse/traces/<task-name>/latest/summary.md
```

The summary has duration, cost, turns, the decision log, and the final JSON output.

If the agent failed or got stuck, look deeper:
- Read `./autobrowse/traces/<task-name>/latest/trace.json` — search for the failure turn
- Read screenshots around the failure point with the Read tool

**When `--browser-trace` was used — start with `unified-events.jsonl`.** The harness joins the agent's turn log and the browser's CDP firehose into one time-ordered NDJSON stream at the run root. One file, source-tagged (`source: "agent" | "browser"`), interleaved by wall-clock timestamp. Skim it top-to-bottom; the failure cause is usually one or two adjacent lines (the agent issued command X, the browser responded with Y).

```bash
cat ./autobrowse/traces/<task-name>/latest/unified-events.jsonl
```

The structured files (`trace.json`, `.o11y/<run-id>/cdp/*`) are **also agent-consumable as drill-downs** when the unified stream points at something you need more of:

| Need | Drill-down file or command |
|---|---|
| Per-page totals + timing (events, network counts, errors by page) | `.o11y/<run-id>/cdp/summary.json` |
| All failed network requests in one place | `.o11y/<run-id>/cdp/network/failed.jsonl` |
| Full console exception payloads (stacktraces, etc.) | `.o11y/<run-id>/cdp/console/exceptions.jsonl` |
| Per-page slice (only events on page N) | `.o11y/<run-id>/cdp/pages/<pid>/` |
| Full reasoning text / untruncated tool outputs for a specific turn | `trace.json` (filter by `turn === N`) |
| Ad-hoc grouped query (e.g. top hosts, errors-by-page) | `O11Y_ROOT=./autobrowse/traces/<task-name>/latest/.o11y node ${CLAUDE_SKILL_DIR}/../browser-trace/scripts/query.mjs <run-id> <cmd>` |

The unified stream is the default; drill into structured files only when you need a grouped query, a full-text payload, or filtering the stream can't give you.

### Form one hypothesis

Find the exact turn where things went wrong. What single heuristic would have prevented it?

Under `--browser-trace`, the hypothesis must cite a **specific event from `unified-events.jsonl`** (line number or timestamp) — or name the drill-down file if you had to descend into one. This keeps updates evidence-grounded rather than vibes-driven. A hypothesis based only on the agent's commands might say "the click didn't work"; grounded in the unified stream, it can say "line 47 of unified-events.jsonl: `browse open` was followed by `Network.responseReceived` status 403 on `/api/checkout` — switch to `--verified --proxies`."

Examples:
- "After clicking the dropdown, wait 1s — options animate in before they're clickable"
- "Navigate directly to `/pay-invoice/` — skip the landing page entirely"
- "Use `browse fill #field_3 value` not `browse type` — this field clears on focus"
- "The page shows a spinner at turn 8 — add `browse wait timeout 2000` before snapshot"
- (with `--browser-trace`) "At line 47 of unified-events.jsonl, 3 consecutive `Network.responseReceived` events on `/api/availability` returned 403 right after `browse open` — the site is fingerprinting; the next iter needs `--verified --proxies`."

### Update strategy.md

Edit `./autobrowse/tasks/<task-name>/strategy.md`. Keep everything that worked. Fix the specific failure. Add a concrete heuristic.

Good strategies have:
- **Fast path**: direct URL or shortcuts to skip exploration
- **Step-by-step workflow**: exact sequence with timing notes
- **Site-specific knowledge**: selector IDs, form field names, success indicators
- **Failure recovery**: what to do when X goes wrong

### Judge the result

Read the new summary. Did it pass? Make clear progress?
- **Pass or progress** → keep, next iteration
- **No progress or regression** → revert strategy.md to the previous version and try a different hypothesis

### Generate a runnable script (optional)

Once the task has converged, you can produce a deterministic, runnable script
in one or more frameworks via `scripts/codegen.mjs`. This is one shot of an
LLM call per framework, cached by content hash, with optional verify-against-
fresh-session and rewrite-on-failure.

```bash
node ${CLAUDE_SKILL_DIR}/scripts/codegen.mjs \
  --task <name> \
  --workspace ./autobrowse \
  --frameworks playwright,stagehand \
  --verify
```

Each framework gets its own subdirectory under `tasks/<name>/<framework>/`
with the emitted script and a self-contained scaffold (`package.json`,
`tsconfig.json`). The directory is runnable standalone with
`cd tasks/<name>/playwright && npm install && npx tsx <name>.ts` — the only
runtime requirement is `BROWSERBASE_API_KEY` (plus `ANTHROPIC_API_KEY` for
the Stagehand target).

Builtin frameworks: `playwright`, `stagehand`. Add a custom framework with
`--prompt-template <path> --frameworks custom` (and provide your own runner
or pass `--no-verify`).

Common flags:

| Flag | Purpose |
|---|---|
| `--frameworks a,b,...` | Comma-separated; default `playwright` |
| `--verify` / `--no-verify` | Run the produced script against a fresh BB session; default `--verify` |
| `--max-retries N` | Rewrite-on-verify-failure cap; default 2 |
| `--cache-only` | Error if cache miss (CI-friendly) |
| `--force` | Bust the cache |
| `--dry-run` | Estimate prompt size + cost; don't call the LLM |
| `--run <id>` | Force a specific `run-NNN` (default: latest passing) |

Output is one JSON line per framework on stdout. Non-zero exit if any
selected framework's final state is `passed: false`.

See `references/playwright-cdp-bridge.md` for the canonical
`connectOverCDP` patterns the emitted scripts follow.

### After all iterations — publish if ready

If the task passed on 2+ of the last 3 iterations **or has reached the max iteration limit**, install it as a Claude Code skill. **Do not just copy strategy.md** — the skill must be self-contained and useful to someone who has never seen this codebase. If graduating at max iterations without a clean pass, note the known failure point but still document everything learned.

Install by writing to `~/.claude/skills/<task-name>/SKILL.md`:

```bash
mkdir -p ~/.claude/skills/<task-name>
```

Use this structure for the SKILL.md:

```markdown
---
name: <task-name>
description: <1-2 sentences describing what this skill does and when to use it. Include trigger keywords.>
---

# <Task Title> — Browser Skill

## Purpose
<1-2 sentences: what this automates and why it exists.>

## When to Use
<When should someone reach for this skill.>

## Browse CLI Reference
The inner agent uses the `browse` CLI. Key commands for this task:
- `browse stop` — kill existing session (always run before switching to remote)
- `browse open <url> --remote` — start a fresh Browserbase cloud session and navigate
- `browse open <url> --local` — start a clean local browser and navigate
- `browse tab new <url>` — open URL in a new tab
- `browse wait load` — wait for page to finish loading
- `browse wait timeout <ms>` — wait a fixed amount of time for spinners or animations
- `browse wait selector "<selector>"` — wait for an element to become visible
- `browse get title` — verify you're on the right page
- `browse get text body` — extract all visible text (preferred for content extraction)
- `browse snapshot` — get accessibility tree; each node has a ref in `[X-Y]` format (e.g. `[0-5]`, `[2-147]`)
- `browse click [X-Y]` — click element by ref from the latest snapshot (include the brackets)

**Never use `--session <name>` flags in SKILL.md.** Named sessions are a parallel-run workaround — they contaminate skills with infrastructure concerns. Skills must work in isolation with the default session.

## Workflow

### Step 1 — Start session
<exact browse commands in order>

### Step 2 — Navigate
<exact URL and verification steps>

### Step 3 — Extract
<exact extraction commands>

### Step 4 — Output
<what JSON to emit, referencing the schema below>

## Site-Specific Gotchas
<Bullet list of every hard-won heuristic from the iterations. This is the core value of the skill.>

## Failure Recovery
<What to do when navigation fails, session is contaminated, or extraction returns garbage>

## Expected Output
```json
<paste the exact expected output schema from task.md>
```
```

After writing the SKILL.md, confirm it's installed:
```bash
ls ~/.claude/skills/<task-name>/SKILL.md
```

The skill is now available as `/<task-name>` in Claude Code.

---

## Final report (multi-task mode)

After all sub-agents complete, print a markdown table:

| Task | Iterations | Final Status | Graduated | Cost |
|------|-----------|--------------|-----------|------|
| google-flights | 5 | ✅ pass | yes | $0.42 |
| amazon-add-to-cart | 5 | ❌ fail | no | $1.20 |

Then write a persistent session report to `./autobrowse/reports/` so there's a durable record of the run inside the workspace:

```bash
mkdir -p ./autobrowse/reports
```

Write the file `./autobrowse/reports/YYYY-MM-DD-HH-MM-<tasks>.md` with:

```markdown
# AutoBrowse Session Report
**Date:** <ISO date>
**Tasks:** <comma-separated list>
**Environment:** remote|local
**Total cost:** $X.XX

## Results

| Task | Iterations | Pass Rate | Final Status | Graduated | Cost |
|------|-----------|-----------|--------------|-----------|------|
| ... | ... | X/5 | ✅/❌ | yes/no | $X.XX |

## Per-Task Learnings

### <task-name>
- **Key insight 1:** <what the agent learned>
- **Key insight 2:** <another heuristic>
- **Failure mode fixed:** <what was failing and how it was resolved>

## Iteration Log

### <task-name>
| Iter | Turns | Cost | Status | Hypothesis tested |
|------|-------|------|--------|-------------------|
| 1 | 79 | $18.75 | ❌ fail | baseline |
| 2 | 9 | $0.26 | ✅ pass | session contamination fix |
| ... | ... | ... | ... | ... |
```

---

## Rules

- **Only edit `strategy.md`** — never touch `task.md` (unless creating it from the template) or `evaluate.mjs`
- **Stay in the workspace** — all training writes go to `./autobrowse/`, never to `~/.claude/skills/autobrowse/`. The skill source is read-only.
- **One hypothesis per iteration** — test one change at a time
- **Build on wins** — keep what worked, add to it
- **Trust the trace** — the inner agent shows exactly what it saw and did
- **Graduate to `~/.claude/skills/`** — the only file you write there is the final graduated `SKILL.md`
- **Don't release before bisecting** — under `--browser-trace`, the order at the end of each iteration is non-negotiable: `stop-capture` → `bisect-cdp` → `browse cloud sessions update REQUEST_RELEASE`. Bisect depends on the session still existing when the trace stops.

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
