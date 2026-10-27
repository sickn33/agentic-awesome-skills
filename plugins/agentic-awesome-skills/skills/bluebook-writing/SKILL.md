---
name: bluebook-writing
description: "Write design-reading books and articles in plain language with a two-layer skeleton: a zero-terminology everyday story first, then the professional layer with formal names, mechanisms, boundaries, and costs. Use when explaining unfamiliar systems to non-programmers."
category: writing
risk: safe
source: community
source_repo: TobeMagic/deepseek-harness-bluebook
source_type: community
date_added: "2026-10-26"
author: TobeMagic
tags: [writing, plain-language, design-reading, documentation, technical-communication]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/TobeMagic/deepseek-harness-bluebook/blob/main/LICENSE"
---

# Bluebook Writing

## Overview

A repeatable method for writing about *why a system is built the way it is* — design reading, not source-code walkthrough, and not vague simplification. Every section tells the same thing twice: first an everyday story with zero technical terms, then the professional layer that adds what the story structurally cannot (formal names, mechanisms, boundaries, costs).

The method was extracted from a completed 34k-character book that reads DeepSeek Harness (an open-source agent harness) through 42 hand-drawn flow diagrams for an audience of non-programmers. The skill generalizes it for any system, any audience.

## When to Use This Skill

- Use when explaining an unfamiliar architecture, framework, or open-source project to readers who do not write code.
- Use when writing "why is it designed this way" books, long-form articles, or internal architecture docs.
- Use when a draft reads AI-flavored: terminology-stacked, filler-heavy, or detached from any concrete example.
- Use when one real-world story must carry an entire book or course, keeping abstract ideas anchored.

## How It Works

### Step 1: Lock the analogy system before writing

Pick one everyday scenario (a repair crew, a workshop, a kitchen) and map every technical term to it in a fixed table. The mapping is a contract: once registered, never switch wording mid-book.

| Technical term | Everyday saying |
|---|---|
| model | the crew leader's brain (thinks, cannot touch anything) |
| harness / runtime shell | the whole crew |
| tools (read/write files, run commands) | the one who turns screws |
| session log | the one who takes notes |
| permissions and sandbox | the doorkeeper |
| agent loop | the foreman (looks, decides, acts, checks, decides again) |
| assembly manifest | today's shift roster |
| plugin | a temp worker |
| kernel | the head office at the very center |
| event bus / pub-sub | the bulletin board (anyone can post, everyone can see) |

New analogies must pass three gates: ① something everyone has seen in daily life; ② sayable in one word; ③ registered in the table.

### Step 2: Write N.1, the plain version — zero terms

Tell the section's design point as one scene from the locked analogy. No technical term may appear — not even one. If a term sneaks in, the story is not finished; rewrite the sentence, do not add a glossary line.

### Step 3: Write N.2, the professional layer — add what the story cannot

Same content, now with terms: the formal name, the mechanism as a short bullet list, the applicable boundaries, and the costs. N.2 must not re-tell the story with new labels — it must contribute information the story structurally could not carry. Official quotations belong here, never in N.1.

### Step 4: Close with N.3–N.5

- **N.3 Glossary table** — "plain saying ↔ professional term", new terms from this section only. Small sections may drop it.
- **N.4 Misconceptions** — 2–4 items, each the wrong understanding first, then the right one. Never state the right version alone.
- **N.5 Transfer point** — 1–2 self-check actions the reader can run on their own project. This is the landing point; the section is not allowed to end on a bare statement.

### Step 5: Run the machine-checkable limits

These are cheap to check mechanically and catch most AI flavor:

- Section length 1,400–2,200 characters (Chinese), 2–4 diagrams per section.
- Bold ≤ 2 per thousand characters; em-dash ≤ 2 per thousand.
- Second person ("you") ≤ 4 per section, ideally 0 — let the subject carry the sentence.
- Banned filler: 综上所述, 值得注意的是, 首先/其次/最后, 强大的, 革命性, 赋能, 众所周知, 不得不说, 简而言之 (and English equivalents: "in conclusion", "it is worth noting", "powerful", "revolutionary").
- Paragraphs 2–6 sentences, alternating long and short.

### Step 6: Apply the terminology firewall and the core test

Package names, file paths, code, and raw statistics never enter the main text — they go to an appendix. The test: delete every package name from a paragraph. If something remains, it is design. If nothing remains, it is a code walkthrough — rewrite.

### Step 7: Write titles as questions

1. The title is a question, not an answer.
2. The title contains a concrete object, number, or action.
3. Declarative titles only when the statement is counter-intuitive enough to create suspense.

Diagrams are the skeleton, not decoration: each one gets a conclusion-style caption (a finding, not a topic) plus a paragraph tying it back to the section's argument.

## Examples

### Example 1: A section on "the kernel can be empty"

**User prompt**: "Explain why DeepSeek Harness can have an empty kernel — the agent loop itself is a plugin."

**N.1 (plain version, zero terms)**: A repair crew where even the foreman is a temp worker. Pull the foreman out today, hire a new one tomorrow — the rest of the crew clocks in exactly as before, because nobody reports to the foreman personally; everyone reads the shift roster.

**N.2 (professional layer)**: Kernel vacancy. The kernel defines interfaces, not implementations. The agent loop is one plugin among many; replacing it touches only the assembly manifest. Boundaries: this buys reversibility at the price of indirection — complexity shifts from implementer to user.

**N.3**: 临时工 ↔ plugin; 排班表 ↔ assembly manifest.

**N.4**: Wrong — "an empty kernel means there is no kernel." Right — the kernel is the thinnest possible interface layer, which is exactly why it can stay empty.

**N.5**: Self-check — list your own system's components and ask which one, if pulled out, forces changes elsewhere. That answer is your real kernel.

### Example 2: Repairing an AI-flavored draft

**Input**: "综上所述，这个强大的架构利用了革命性的插件系统来赋能开发者。"

**Output after skill**: "这套架构最反常识的一点：最中间的内核是空的。连 agent 循环本身都是插件——抽走它，别处一行都不用改。代价是间接层变多，复杂度转移给了使用者。"

Note: no banned filler, subject carries the sentence, concrete object ("the kernel"), a stated cost, and a transferable point.

## Best Practices

- ✅ Write N.1 first and freeze it; treat any leaked term as a build failure.
- ✅ Give every diagram a conclusion caption plus an interpretation paragraph.
- ✅ Keep one analogy table for the whole project; new analogies must pass the three gates.
- ✅ End every section on "why designed this way" + "where this transfers".
- ✅ Run the style limits mechanically before delivering — they are regexes, not taste.
- ❌ Do not put citations, commit hashes, or source attributions in the main text; state the口径 in-line and push details to an appendix.
- ❌ Do not let N.2 re-tell the story with new labels — it must add boundaries, costs, or official wording.
- ❌ Do not end a section on "it is what it is" or a bare count of parts.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- The analogy table is a contract: changing wording mid-project breaks readers' mental model. If a better analogy appears, register it deliberately and revise earlier chapters.
- Stop and ask for clarification if the target system, audience, or section scope is missing.

## Security & Safety Notes

- This skill produces prose only. It includes no shell commands, network fetches, credentials, or mutation guidance.
- When the subject matter touches security topics, keep the same evidence discipline in the writing: state findings and boundaries in-line, without unverifiable statistics.

## Common Pitfalls

- **Problem:** The plain version slowly accumulates technical terms ("just this one, readers will know it").
  **Solution:** One term is a failure. Rewrite the sentence in everyday words, or move the whole explanation to N.2.
- **Problem:** N.2 becomes a vocabulary-swapped copy of N.1.
  **Solution:** Check whether N.2 contains boundaries, costs, or official wording. If not, it is a re-tell — rewrite.
- **Problem:** The analogy table grows until every term has a different metaphor.
  **Solution:** One scenario, one consistent cast. Reuse the same characters; do not introduce a new story per chapter.
- **Problem:** Density checks pass but the text still reads like AI.
  **Solution:** Read one paragraph aloud. If no concrete object or action appears, replace the abstraction with a scene from the locked analogy.

## Related Skills

- `technical-writer` - For API references and task-based docs where procedure, not design rationale, is the goal.
- `content-research-writer` - When the draft needs external citations and research before writing.
- `skill-creator` - When packaging a workflow like this one into a distributable skill.
