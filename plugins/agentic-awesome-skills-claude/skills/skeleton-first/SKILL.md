---
name: skeleton-first
description: "Prove a data/AI/agent workflow end to end on a tiny sample, find cheap wins, then scale in cost-gated steps within budget."
category: workflow
risk: safe
source: self
source_type: self
date_added: "2026-10-11"
author: Dan He
tags: [llm, cost, pipeline, etl, rag, dbt, snowflake, budget, data-engineering]
tools: [claude, codex, cursor]
---

# Skeleton first: prove the workflow cheaply, then scale

Agents tend to build every stage at full size before anything has run end to end. In data and AI work that fails expensively: a wrong prompt runs over a whole table, a wrong grain is discovered after twenty models exist, a big warehouse burns credits on a query that returns the wrong answer.

This skill changes the order of work:

1. Make the **whole path** work on the **smallest possible input** with the **cheapest settings**.
2. Prove it with a test.
3. Scale up in **cost-gated rungs**, measuring and projecting cost before each one.
4. Only then add features, **one at a time**, re-running the tests after each.

## When to Use

- A workflow with 2+ stages (ingest -> transform -> model/LLM -> output), or anything that touches paid compute: warehouse credits, LLM tokens, embeddings, API calls.
- New or unfamiliar data, a new tool or SDK, an architecture that has not run in this environment before.
- The user asks to "build X end to end", "set up the pipeline", "process all the documents", "create the models".

Skip it for: one-file fixes, a single query, work already proven at full scale, or when the user explicitly says to go straight to full scale (then still state the projected cost first).

## Step 0 - Define "it works" before building

Write down, and show the user in 3-5 lines:

- **The thinnest end-to-end path**: every stage present, the minimum of each. Example: 1 source table -> 1 transform -> 1 LLM call -> 1 output row.
- **One pass/fail test** a person can check, e.g. "for these 3 sample rows the output has columns A, B, C and the value for row 2 is X". Prefer tests with a known right answer.
- **A budget**: maximum spend and time for the whole job, and for the skeleton (the skeleton should cost almost nothing).

If the user has not given a budget, propose one and say so.

## Step 1 - Write the ladder

Plan the work as rungs. Each rung adds exactly one thing and has a gate.

| Rung | Adds | Input size | Gate to pass |
| --- | --- | --- | --- |
| L0 skeleton | every stage, stubbed or minimal | 1 record | test passes end to end |
| L1 | real logic in the weakest stage | 10 records | test passes, cost per record measured |
| L2 | scale | ~1% or 100 records | quality spot-check, projected full cost under budget |
| L3 | full run | 100% | totals reconcile, test still passes |
| L4+ | one feature each | as needed | all previous tests still pass |

Show the ladder to the user before building unless the task is small. Keep it short.

## Step 2 - Build L0, the walking skeleton

- Every stage exists and is connected; none is polished.
- Hardcode or stub anything that is not on the critical path (config, retries, UI, logging beyond a print).
- Use the cheapest settings everywhere (see Cost levers).
- Run it. If it fails, fix the path; do not start adding features.
- **Look at the sample before scaling it.** Read a few raw records and measure what you are paying for. Most cheap wins hide here: duplicate records (cache by content hash), boilerplate repeated in every record (headers, footers, legal notices, signatures, templated sections), empty or invalid inputs that the API still bills. Count how much of the cost each one accounts for; stripping a footer that is 70% of every document is worth more than any tuning later.

Not allowed until L0 passes: a second source, a second model or table, parallelism, tuning, UI, abstractions, handling edge cases that have not been seen yet.

## Step 3 - Scale up in cost-gated rungs

At every rung:

1. Run on the rung's input size.
2. Record: records in/out, errors, wall time, cost (tokens, credits, API calls).
3. **Project the next rung**: cost per record x next size, time per record x next size.
4. **Gate**: continue only if the test passes, errors are understood, and the projection is under budget.

When the projection is over budget, the budget is a constraint to design around, not a reason to hand the job back. First look for a cheaper path that still passes the test: remove redundancy found in the sample, send less per record (relevant sections, truncation), cache, use a cheaper model or a free local method for part of the work. Prove the cheaper path on the same small rung, re-project, and continue if it fits. Stop and report to the user with the numbers and options only when no cheaper path passes the test, or when it would change what the user asked for in a way they would likely care about (say which trade-off you made either way).

Grow by roughly 10x per rung (1 -> 10 -> 100 or 1% -> full). Never jump from the skeleton straight to the full run.

Keep a run log in the working folder (e.g. `RUNLOG.md`):

| Rung | Input | Result | Errors | Time | Cost | Projected next | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Step 4 - Add features one at a time

- One change per step: a new source, a new model, a new tool, a prompt change.
- After each change, re-run every existing test (regression). If something that passed now fails, fix it before adding anything else.
- When tests were written by the same agent that built the system, use a few held-out tests or a human review; delegate to an independent subagent only when the user or applicable instructions authorize delegation, before claiming quality.

## Cost levers

General

- Sample first: `LIMIT`, `SAMPLE`, a handful of files, one page of results.
- Cheapest model that can pass the test; a stronger model only for the stage that fails.
- Dry runs: compile, `EXPLAIN`, validate config without executing.
- Cap spend per call: `max_tokens`, timeouts, low concurrency until proven.
- Cache suitable deterministic results with input, model/version and configuration identity; apply data-retention and access controls. Embeddings and API responses can depend on version or mutable state, and cache hits do not make the whole rerun free.
- Count tokens on the sample and multiply before the full run.
- Parse structure deterministically when it exists (headings, tables, templates); call an LLM only for prose.

Snowflake / Cortex Code

- Smallest warehouse (XS) with a short auto-suspend; scale the warehouse only after the logic is right.
- `SAMPLE` / `TABLESAMPLE` or `LIMIT` on sources; check grain and row counts on the sample.
- `EXPLAIN` before expensive queries; prefer transient or temporary tables for intermediate steps.
- Cortex AI functions: run on a few rows first, check output, estimate tokens (e.g. `SNOWFLAKE.CORTEX.COUNT_TOKENS` where available) before applying to a table.
- dbt: build one model with `--select`; use `--empty` (dbt 1.8+) to check the DAG compiles and runs with no data; `--defer` to reuse production parents instead of rebuilding them.

LLM / RAG / agents

- Ingest 1 document, then 10, before the corpus; measure seconds and cost per chunk and extrapolate.
- Evaluate on 5-10 questions with known answers before adding tools, rerankers or critics.
- Add one agent or tool at a time; log which tool calls each answer used.

## Reporting at each gate

Tell the user, briefly:

- What ran (rung, input size) and whether the test passed.
- Cost and time so far, and the projection for the next rung.
- The decision you recommend (continue, fix, or stop), and anything that needs their call.

## Anti-patterns

- Building every stage at full size, then running for the first time.
- Running an LLM or AI function over a whole table to "see what happens".
- Adding the second data source before the first one passes its test.
- Tuning or adding UI before the path works.
- Writing many tools or rules that each fit one test question (overfitting); fix classes of errors instead, and confirm on held-out tests.
- Claiming success on tests written by the same agent that built the system.
- Stopping at an over-budget projection without first trying to make the job fit the budget.

## Example

User: "Tag all 400 tickets in tickets.csv with a category using our LLM endpoint."

```text
Step 0  path: CSV -> 1 LLM call -> tagged.csv | test: 10 hand-checked tickets correct | budget: $2 (proposed)
Sample: 3 tickets have empty bodies (API bills then errors) -> skip; only 220 of 400 texts are unique -> cache by hash
Spent so far:
L0  1 ticket    pass   $0.004
L1  10 tickets  10/10  $0.04   -> full run projected $0.88 (with dedupe) < $2, continue
L2  100         12/12  $0.25   -> continue
L3  400         pass   $0.88 total (naive run would have cost $1.60)
```

## Limitations

- Needs a way to measure cost (a ledger, billing view, token counts or query history); without it, projections are estimates and should be labeled as such.
- Small rungs can miss problems that only appear at scale (rate limits, rare record types, skewed partitions); keep the full-run gate and reconcile totals.
- Adds a few minutes and some tokens per task; not worth it for one-off queries, single-file fixes or work already proven at full size.
- Tests written by the same agent can be too easy; use held-out tests or a human spot-check before claiming quality.
- Cost levers listed for Snowflake and dbt are starting points; check your platform's current pricing and features.

## Done means

- The full run completed within budget.
- Every test from every rung still passes.
- The run log shows cost, time and decisions per rung.
- The user knows the real cost per unit, so future runs are predictable.
- Intermediate outputs from earlier rungs (sample CSVs, partial indexes) are deleted or clearly marked, so only the final result is left for the user.
