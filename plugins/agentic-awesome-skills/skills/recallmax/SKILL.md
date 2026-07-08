---
name: recallmax
description: "FREE — God-tier long-context memory for AI agents. Injects 500K-1M clean tokens, auto-summarizes with tone/intent preservation, compresses 14-turn history into 800 tokens."
category: memory
risk: safe
source: community
date_added: "2026-03-13"
author: christopherlhammer11-ai
tags: [memory, context, rag, summarization, compression, long-context, agent-infrastructure]
tools: [claude, cursor, codex, gemini, copilot, windsurf, antigravity, grok]
---

# RecallMax — God-Tier Long-Context Memory

## Overview

RecallMax enhances AI agent memory capabilities dramatically. Inject 500K to 1M clean tokens of external context without hallucination drift. Auto-summarize conversations while preserving tone, sarcasm, and intent. Compress multi-turn histories into high-density token sequences.

Free forever. Built by the Genesis Agent Marketplace.

## Install

```bash
npx skills add christopherlhammer11-ai/recallmax
```

## When to Use This Skill

- Use when your agent loses context in long conversations (50+ turns)
- Use when injecting large RAG/external documents into agent context
- Use when you need to compress conversation history without losing meaning
- Use when fact-checking claims across a long thread
- Use for any agent that needs to remember everything

## How It Works

### Step 1: Context Injection

RecallMax cleanly injects external context (documents, RAG results, prior conversations) into the agent's working memory. Unlike naive concatenation, it:
- Deduplicates overlapping content
- Preserves source attribution
- Prevents hallucination drift from context pollution

### Step 2: Adaptive Summarization

As conversations grow, RecallMax automatically summarizes older turns while preserving:
- **Tone** — sarcasm, formality, urgency
- **Intent** — what the user actually wants vs. what they said
- **Key facts** — numbers, names, decisions, commitments
- **Emotional register** — frustration, excitement, confusion

### Step 3: History Compression

Compress a 14-turn conversation history into ~800 high-density tokens that retain full semantic meaning. The compressed output can be re-expanded if needed.

### Step 4: Fact Verification

Built-in cross-reference checks for controversial or ambiguous claims within the conversation context. Flags contradictions and unsupported assertions.

## Best Practices

- ✅ Use RecallMax at the start of long-running agent sessions
- ✅ Enable auto-summarization for conversations beyond 20 turns
- ✅ Use compression before hitting context window limits
- ✅ Let the fact verifier run on high-stakes outputs
- ❌ Don't inject unvetted external content without dedup
- ❌ Don't skip summarization and rely on raw truncation

## Related Skills

- `@tool-use-guardian` - Tool-call reliability wrapper (also free from Genesis Marketplace)

## Links

- **Repo:** https://github.com/christopherlhammer11-ai/recallmax
- **Marketplace:** https://genesis-node-api.vercel.app
- **Browse skills:** https://genesis-marketplace.vercel.app

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
