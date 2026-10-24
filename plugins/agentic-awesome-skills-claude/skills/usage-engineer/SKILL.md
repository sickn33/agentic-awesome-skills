---
name: usage-engineer
description: "Cut wasted tokens in coding-agent sessions: compact long logs, stop identical retries, check stale project maps, and audit local Codex/OpenCode usage."
category: productivity
risk: critical
source: community
source_repo: noamshorts22-prog/usage-engineer
source_type: community
date_added: "2026-10-21"
author: noamshorts22-prog
tags: [tokens, usage, context, logs, cost, codex]
tools: [claude, codex, cursor, gemini, opencode]
license: "MIT"
license_source: "https://github.com/noamshorts22-prog/usage-engineer/blob/main/LICENSE"
---

# usage-engineer

## Overview

Every token an agent spends on a 5,000-line log, a retried command or a stale project map is paid for
again on every later turn. This skill removes that waste without lowering the bar: requirements, tests
and verification stay exactly as strict as without it. It ships a bundled zero-dependency Python CLI
(`scripts/ue.py`). Its audit helpers run locally; optional benchmark runners can launch agents that contact providers.

## When to Use This Skill

- Use when a build, test run or log will print more than about 100 lines.
- Use when the same command has failed twice with the same input.
- Use when resuming work from an older session, handoff or project map.
- Use when AGENTS.md, CLAUDE.md or similar instruction files may repeat the same paragraphs.
- Use when the user asks where their Codex or OpenCode usage went, why they hit a rate limit, or how to make the agent cheaper.

## How It Works

All commands run the bundled script (Python 3.9+, standard library only):

```bash
python <skill-dir>/scripts/ue.py <command>
```

`<skill-dir>` is the folder this SKILL.md is in. Use `python3` where `python` is not Python 3, and
`py -3` on Windows if neither is found. If no Python is reachable, say so once and follow the rules
below by hand; do not retry the same command.

### Step 1: Send long output to a file, not the conversation

```bash
<command> > build.log 2>&1
python <skill-dir>/scripts/ue.py summarize-log --file build.log
```

The summary keeps every error and failure line with context plus the last 20 lines, and prints the
path of a byte-exact copy of the full log. Read slices of that copy only when the summary is not
enough. Never rerun a command just to see its output again.

### Step 2: Two identical failures means change approach

If the same command fails twice with the same input, do not run it a third time. Read the error,
change the input, or try a different method.

### Step 3: Check a map before trusting it

```bash
python <skill-dir>/scripts/ue.py map check --project . --map <map.json>
```

Exit code 1 means STALE or incomplete coverage. Re-read listed changes and widen inspection whenever the map is truncated or evidence requires it. Build a map at
the end of a work session so the next one can check it:

```bash
python <skill-dir>/scripts/ue.py map build --project .
```

### Step 4: Read narrowly

Search first (`rg`, `grep`) and read the matching range instead of whole files. Do not re-read a file
that has not changed.

### Step 5: Measure before advising on usage

```bash
python <skill-dir>/scripts/ue.py audit --days 7
```

It reads local Codex CLI rollout files (`$CODEX_HOME/sessions`) and the OpenCode database, read-only,
with home paths redacted. It reports input, cached, output and reasoning tokens, incomplete turns,
oversized tool outputs (with an estimate of the tokens they cost) and repeated identical tool calls.
Report its numbers as measured; label anything else as an estimate.

### Step 6: Verify the bundled behavior

```bash
python <skill-dir>/scripts/ue.py map build --project <project>
python <skill-dir>/scripts/ue.py map check --project <project> --map <map.json>
```

`selftest` is available only in the full upstream checkout. This catalog bundle intentionally omits the
upstream test fixtures and exits with status 2 rather than reporting a false pass.

## Examples

### Example 1: A failing test suite with 3,000 lines of output

```bash
pytest > test.log 2>&1
python <skill-dir>/scripts/ue.py summarize-log --file test.log
```

The agent reads the failure lines and their context instead of the whole run, then opens only the
slice of the saved copy it needs.

### Example 2: Duplicate instruction files

```bash
python <skill-dir>/scripts/ue.py instructions duplicates --project .
```

Lists paragraphs repeated across AGENTS.md, CLAUDE.md and similar files, which would otherwise be
paid for on every turn.

## Best Practices

- ✅ Keep the path to the full failure output in reports, so nothing is lost by summarizing.
- ✅ Describe a check as passing only if it ran in this session.
- ❌ Don't lower test or verification requirements to save tokens.
- ❌ Don't promise savings from `prepare-context`: in the project's first A/B run a prepared context pack used about 30% more tokens on small tasks.

## Limitations

- Usage audit only reads Codex CLI and OpenCode local data; the other commands work in any agent.
- Token estimates for oversized tool outputs are approximations, not billing figures.
- This skill does not replace environment-specific validation, testing, or expert review.

## Security & Safety Notes

- Audit opens rollout JSONL files that can contain chat text and secrets; it extracts metadata without intentionally printing message contents. It does not open auth or cookie files. Treat input logs and all local copies as sensitive; summaries are not secret-redacted.
- Output files go to `~/.usage-engineer` (override with `UE_STATE_DIR`) unless `--out` is given; printed paths start with `%HOME%` for the redacted home directory.
- `apply-profile` and `rollback` write configuration files only when explicitly invoked. Review their exact destinations first; bundled profile/benchmark fixtures are omitted. Audit and map commands do not change model or agent settings.

## Related Skills

- `context-compression` - broader techniques for shrinking context.
