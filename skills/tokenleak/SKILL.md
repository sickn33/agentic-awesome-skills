---
name: tokenleak
description: "Token-lean rules for coding agents: cut the context re-sent on every later call (big reads, noisy logs, re-reads, serial calls) without losing correctness."
category: development
risk: safe
source: community
source_repo: Pazificateur69/tokenleak
source_type: official
date_added: "2026-10-12"
author: Pazificateur69
tags: [tokens, context, cost, efficiency, claude-code, codex]
tools: [claude, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Pazificateur69/tokenleak/blob/main/LICENSE"
---

# tokenleak

## Overview

Every tool result an agent pulls into context is re-sent on every later call until compaction, so a 6k-token log read early in a 60-call session is paid about 55 more times. These rules make the agent let in only what the next decision needs: locate before reading, compute instead of reading data, bound command output, never re-read, batch independent calls. The upstream reports benchmark savings in its source repository; this AAS tree does not bundle those runs. Treat percentages as upstream workload-specific claims, not measured savings in the current task. Billing also depends on actual caching, token accounting and compaction behavior.

## When to Use This Skill

- Use on coding tasks that read files, run tests, builds or installs, use git, or search a codebase.
- Use when the user wants to save tokens, reduce cost, or stay under usage limits.
- Use when a session keeps hitting compaction because tool output fills the context.

## Rules

1. **Locate, then read.** Don't know a file's size? Check it (`wc -l`) along with your first search. Search (`grep -n`, `rg -n`, Grep), then read only the region you need (offset/limit, `sed -n 'A,Bp'`). Read a whole file only if it is short (under ~300 lines) or you truly need all of it.
2. **Compute, don't read.** For questions about data (counts, totals, filters, lookups in big data files, CSV, JSON, logs), run a short script or one-liner that prints only the answer. Never pull the data itself into context.
3. **Bound every command.** Never let tests, builds, installs or logs stream into context unbounded.
   - Quiet or failures-only modes: `pytest -q -x`, `vitest run --reporter=dot`, `go test ./... 2>&1 | grep -v '^ok'`, `cargo test -q`, `npm ci --silent`, `make -s`.
   - Long jobs: `L="$(mktemp)" || exit 1; cmd > "$L" 2>&1; echo "exit=$?"; tail -n 40 "$L"`. Need more? `grep -n -m 20 -E 'error|FAIL|panic' "$L"` on the saved log. Never re-run a job just to see more of its output.
   - Iterate on the one failing test, not the whole suite. Run the full suite once at the end, quietly.
4. **Never re-read what you have.** A file you read or wrote is still in context. Re-read only after compaction or after something else changed it.
5. **Batch independent calls.** Reads and searches that don't depend on each other go in one turn (parallel tool calls), and shell steps that need no judgment in between go in one command (`wc -l a b; grep -n x a | head`). Each extra round-trip re-sends everything.
6. **Diffs over files.** `git status -s`, `git diff --stat` then `git diff -- <path>`, `git log --oneline -n 15`, `git show --stat <sha>`.
7. **Edit, don't rewrite.** Targeted edits only. Never rewrite a whole file to change a few lines, and never paste back into chat code that is already on disk.
8. **Narrow searches and fetches.** Scope by path and file type, cap results (`-m`, `head_limit`, `| head -n 30`, `-l` for names only). Pick fields from APIs and JSON (`--json a,b`, `jq '.items[] | {id,name}'`, `per_page`). Ask a web fetch a precise question instead of dumping the page.
9. **Scope wide exploration.** Use available subagents only when delegation is authorized by the user or governing workflow. Otherwise review directly. A summary is not proof that required files or supports were inspected; retain evidence and explicit coverage limits.
10. **Answer lean.** Lead with the result. No step-by-step recap, no restating the diff, no closing summary of what the user can already see, no filler.

## Never save tokens by

- truncating so hard you miss the real error (widen with `grep`/`sed -n` on the saved log instead);
- skipping a read you need to edit correctly, or guessing file contents;
- skipping verification. Run the tests, quietly.

## Limitations

- The savings depend on the workload and the model: in the benchmark a short test-fixing task gained 5%, noisy builds and multi-file features 24-51%; small models such as Haiku 4.5 barely follow the rules without the plugin's read guard.
- The benchmark covers two models and four small tasks on a synthetic repo, and runs vary 2 to 4x.
- The rules cost about 850 tokens of context themselves; on very short sessions they may not pay for themselves.
- The companion transcript audit (`tokenleak.py`) lives in the source repo and is not included here.

## Examples

Locate before reading, and hand the agent only what the next decision needs:

```bash
wc -l app/service.py          # size, alongside the search
rg -n "def handle_" app/      # find the region first
sed -n '120,180p' app/service.py
```

Bound a noisy build and keep the failure visible:

```bash
L="$(mktemp)" || exit 1; npm test > "$L" 2>&1; echo "exit=$?"; tail -n 40 "$L"
grep -n -m 20 -E 'error|FAIL' "$L"
```

Count instead of pasting data into context:

```bash
python3 -c "import json;print(len(json.load(open('events.json'))))"
```
