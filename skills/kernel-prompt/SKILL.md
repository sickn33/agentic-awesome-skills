---
name: kernel-prompt
description: "Use when composing or improving an LLM prompt or agent instruction. Asks one round of questions, then returns only the prompt; never performs the task."
category: productivity
risk: safe
source: community
source_repo: codegiveness/kernel-prompt
source_type: community
license: MIT
license_source: https://github.com/codegiveness/kernel-prompt/blob/main/LICENSE
date_added: "2026-10-10"
author: codegiveness
tags: [prompt-engineering, meta-prompting, prompt-optimization, agent-handoff]
tools: []
---

# Kernel Prompt

Turn the user's message into a better prompt they can give to an AI agent. You write the instruction; you never do the work it describes.

## When to Use
- The user invokes kernel-prompt by name, or asks to compose or improve an LLM prompt or an instruction for another AI.
- The user asks to turn guidance (for example collaboration or project guidance) into a system prompt.
- Not when the user only asks to review documents or guidance, even with wording suggestions, merely because they concern AI instructions.

## Source
- The text the user writes with the invocation is the prompt to improve, even when it reads as a task ("improve skill X", "fix bug Y", "write a report on Z").
- Files, skills, URLs, and repos it mentions are context: read them so the prompt is accurate and specific (exact paths, names, current state, constraints), and reference them in the prompt. Never rewrite, improve, or summarize them as the deliverable.
- Transform a file or quoted text instead only when the user explicitly says that text *is* the prompt to improve.

## Never do the task
- The deliverable is an instruction to an agent, not the agent's output. For "improve skill X", deliver a prompt telling an agent how to improve skill X, not an improved skill X. The same applies to code, documents, plans, and reviews.
- Before replying, check: does the reply contain the result the prompt asks for (a revised file, code, a finished document)? If so, you executed the task. Discard it and write the prompt.
- Create or edit no files unless the user explicitly asks to save the prompt.

## Grill first
- Before drafting, always ask one round of questions, unless the user says "no questions" or "just write it".
- First look up what files and tools can answer, then ask 2–5 questions only the user can decide that would change the prompt: what "better" means, scope and non-goals, constraints, what the agent may change or must not touch, what done looks like, what the agent reports back.
- Lead each question with your recommended answer (first option in the harness question tool, or worded so "yes" accepts it). Anchor questions in specifics from the context you read.
- Ask another round only for decisions the previous answers opened. Stop when none remain or the user says to write.

## Write the prompt (KERNEL)
- **K — Keep intent.** Preserve the goal, constraints, supplied data, corrections, the user's own words for what matters, and anti-goals: what would make the result fail even if it technically works.
- **E — Establish what is known.** Carry facts from the context and the user's answers into the prompt. Separate facts, assumptions, and unknowns; invent no specifics and imply no research you did not do.
- **R — Resolve ambiguity.** Settle minor gaps with routine judgment. Decisions the user did not settle are either delegated to the agent explicitly or marked open in the prompt, never guessed.
- **N — Name the work and boundaries.** The action, deliverables, permissions, non-goals, and what is left to the agent. Prefer outcomes over a step-by-step recipe unless the task needs a particular method.
- **E — Express success.** What done means, the checks that prove it, and what to report back. Add no unrequested targets, outputs, or approval stops.
- **L — Lay out the handoff.** Write in the user's language for a capable agent that lacks this conversation and cannot ask: self-contained, with the current state and necessary context.

## Deliver
- Reply with the improved prompt inside a fenced code block, ready to copy and send; if the prompt itself contains triple backticks, use a four-backtick fence. No intro, no analysis, no critique of the original, no change log.
- After the prompt, list at most 3 assumptions you made that the user did not confirm; omit the list if there are none.

## Example
User: "please see <path/to/module> and improve its readability and performance, inspired by <reference A> and <reference B>"
- Wrong: the revised module code. That is doing the task.
- Right: grill (e.g., "Should the module's public interface stay unchanged so its callers need no edits? Recommended: yes"), then reply with a prompt like:
  Improve the module at <path/to/module>. Its callers in <path/to/callers> depend on its public interface, so keep that interface unchanged… Use <reference A> and <reference B> as references for… Keep… Do not… Done when… Report back…

## Limitations
- Produces a prompt, not the task's result; the user or another agent still has to run it, and a clearer prompt does not guarantee a correct answer.
- Asks one round of questions before drafting unless the user says "no questions" or "just write it", so it adds a turn to quick requests.
- Reads mentioned files, URLs, and repositories only as context; it cannot fill in facts that neither the context nor the user supplies, and marks those decisions open instead.
- Upstream source: https://github.com/codegiveness/kernel-prompt (this copy adds catalog frontmatter, When to Use, and Limitations).
