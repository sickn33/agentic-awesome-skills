---
name: recsys-pipeline-architect
description: "Designs composable recommendation, ranking, and feed pipelines using the six-stage Source→Hydrator→Filter→Scorer→Selector→SideEffect framework"
category: data-ai
risk: safe
source: community
source_repo: mturac/recsys-pipeline-architect
source_type: community
date_added: "2026-05-16"
author: mturac
tags: [recommender-system, ranking, feed-algorithm, recsys, personalization, for-you-feed, rag-reranker, pipeline-architecture]
tools: [claude, codex, cursor, gemini, opencode, cline, continue, windsurf]
license: "MIT"
license_source: "https://github.com/mturac/recsys-pipeline-architect/blob/main/LICENSE"
---

# recsys-pipeline-architect

## Overview

A spec-and-scaffold skill for building composable recommendation, ranking, and feed pipelines. It encodes the six-stage **Source → Hydrator → Filter → Scorer → Selector → SideEffect** framework popularized by xAI's open-sourced [For You algorithm](https://github.com/xai-org/x-algorithm) (Apache 2.0). This skill is an independent reimplementation of the *pattern* — no code is copied from the original — licensed MIT. Use it whenever you need "the top K items for a (user, context)": social feeds, content CMSs, RAG rerankers, task prioritizers, notification triage, search reranking, ad ranking.

## When to Use This Skill

- Use when the user wants to build any system that picks "the top K items for a user/context"
- Use when the user asks "how should I rank X" or describes a feed/personalization problem
- Use when the user has a scoring function and needs the pipeline plumbing around it
- Use when the user wants to migrate from a single relevance score to multi-action prediction with tunable weights
- Use when the user is wrapping an LLM/ML scorer and needs filters, hydrators, side-effects, and a runnable scaffold in their stack (TypeScript / Go / Python)

## How It Works

### Step 1: Clarify the use case

Ask the user three questions (only what is missing):

1. What are the items being ranked? (posts, products, tasks, alerts, documents...)
2. What is the input context? (user ID, search query, current document, time window...)
3. What language / runtime? (TypeScript/Node, Go, Python, Rust...)

### Step 2: Walk the eight steps of the spec

The full SKILL walks through: clarify use case → identify candidate sources → list required hydrations → list filters → design scorer chain → selector → side effects → generate scaffold. Each step surfaces the architectural trade-offs (multi-action vs single-score, candidate isolation vs joint scoring, online vs offline batch) so the user makes them explicitly rather than defaulting silently.

### Step 3: Emit a runnable scaffold

The upstream repository ships three runnable example scaffolds — every one green on its test suite:

- **Strapi v5 plugin** (TypeScript, Jest, 3/3 pass) — adds `GET /api/feed/for-you` with multi-action scoring and author diversity
- **Zentra-compatible pipeline** (Go with generics, 3/3 pass) — engine.Module-compatible, standalone-usable
- **PMAI task prioritizer** (Python / FastAPI / pytest, 3/3 pass) — `GET /tasks/next?user_id=42&limit=10`

When the user's stack doesn't match, the skill generates from scratch following the interface definitions in `references/interfaces.md` (TypeScript, Go, Python, Rust).

## Examples

### Example 1: Strapi content feed

User: "I'm running a Strapi v5 instance with 50k articles. I want a 'for you' feed personalized to each logged-in user based on their reading history."

Skill walks through the 8 steps, generates a Strapi plugin scaffold using the Strapi example as the template.

### Example 2: RAG retrieval reranker

User: "My RAG returns top-50 chunks from a vector DB. I want to rerank them with a more expensive scorer and return top-5."

Skill recognizes this as a single-source pipeline with a scorer chain (cheap retrieval + expensive rerank). Generates a Python async pipeline.

### Example 3: Notification triage

User: "We send too many notifications. I want a daily digest that picks the top 10 from the last 24h queue."

Skill identifies this as an offline-batch pipeline. Generates a scheduled job scaffold.

## Best Practices

- ✅ Surface the multi-action vs single-score trade-off explicitly — don't default silently
- ✅ Order filters by cost (cheap before expensive); universal filters before user-specific
- ✅ Wrap side effects in fire-and-forget patterns (goroutines / promises without await / asyncio tasks) — never block the response
- ✅ Keep scoring deterministic and cacheable; do diversity reranking as a separate stage
- ✅ Attribute the pattern as "popularized by xAI's open-sourced For You algorithm" when generating output
- ❌ Don't invent benchmark or latency numbers — say "depends on workload, run it yourself"
- ❌ Don't name the user's generated artifact "X-like" or use "For You" branding — the pattern is free, the brand is not
- ❌ Don't conflate this with model architecture: this skill is pipeline plumbing *around* the scorer, not the scorer itself

## Limitations

- This skill scaffolds pipeline plumbing; it does not train ML models — the scoring function is the user's responsibility
- It does not operate deployed pipelines (no monitoring, no autoscaling decisions)
- It does not predict pipeline performance (depends on data, hardware, traffic)
- It does not choose infrastructure (vector DB, cache, queue) — those are outside scope

## Security & Safety Notes

- The generated scaffolds are framework code, not application logic — no shell commands, no network fetches, no credential handling
- Filters in the generated cookbook include eligibility/paywall/geo-restriction checks; the skill recommends putting these *before* scoring (so blocked content is never scored)
- Side-effect stages are always async / fire-and-forget; the skill documents this explicitly in the generated README to prevent users from accidentally blocking the response with cache writes or event emissions

## Common Pitfalls

- **Problem:** Single-score model gets overfit to one metric (clicks) and degrades on others (long sessions, retention)
  **Solution:** Skill recommends multi-action prediction with tunable weights — change behavior by changing weights, no retraining

- **Problem:** Joint scoring (transformer over the whole batch) is non-deterministic and uncacheable
  **Solution:** Skill defaults to candidate isolation via attention masking; recommends joint only when there's a specific reason (e.g., batch-aware diversity)

- **Problem:** Side effects (cache writes, impression emits) block the response
  **Solution:** Skill generates fire-and-forget patterns and documents the constraint

## Upstream

This skill is a thin adapter to the upstream repository. For the full SKILL.md content, 5 reference documents (interfaces in 4 languages, multi-action scoring, candidate isolation, filter cookbook, scorer cookbook), and 3 runnable example scaffolds with passing test suites:

- **Repository:** https://github.com/mturac/recsys-pipeline-architect
- **Release:** v0.1.0
- **Install via skills.sh:** `npx skills add mturac/recsys-pipeline-architect`
- **Pattern source:** https://github.com/xai-org/x-algorithm (Apache 2.0; this skill is MIT)
