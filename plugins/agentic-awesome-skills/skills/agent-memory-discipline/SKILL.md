---
name: agent-memory-discipline
description: "Rules for when an agent should recall from long-term memory before acting and when it should save decisions, corrections and failures afterwards. Works with any memory backend."
category: memory
risk: safe
source: community
source_repo: mnemoverse/agent-memory-discipline
source_type: community
date_added: "2026-09-23"
author: mnemoverse
tags: [agent-memory, long-term-memory, context-engineering, mcp, agent-skills]
tools: [claude, cursor, gemini]
license: "CC0-1.0"
license_source: "https://github.com/mnemoverse/agent-memory-discipline/blob/main/LICENSE"
---

# Agent Memory Discipline

## Overview

Connecting a memory tool does not make an agent use it: tools register, the session runs, and nothing gets recalled or saved. This skill supplies the missing part, standing rules for when to read memory and when to write it.

The problem it solves is specific. An agent with memory available still repeats settled questions, reverts corrected habits, and loses decisions between sessions, because nothing tells it when recall and save are due. The rules below make both moments explicit.

## When to Use This Skill

- Use when a memory tool or MCP memory server is connected but the agent is not using it consistently.
- Use when the user complains that the assistant loses preferences, conventions or past decisions between sessions.
- Use when setting up persistent memory for a project and the agent needs standing rules for reading and writing it.
- Use when the user says "remember this", "what did we decide", "recall", or "save this for next time".

## How It Works

### Before You Start: Any Memory Backend

The agent needs a memory tool it can call. Any backend works, and the rules are identical for each:

- **Files.** A `memory/` folder of Markdown notes, one fact per file. No dependencies, fully greppable, versionable in git.
- **A local MCP memory server.** Keeps everything on the local machine; several open-source options exist.
- **A hosted memory service over MCP.** Adds portability across tools and machines at the cost of the data living elsewhere.

Authentication is whatever the chosen backend requires: none for a local folder, the server's own configuration for a local MCP server, an API key or OAuth sign-in for a hosted service. This skill never handles credentials itself and never writes them into memory.

### Step 1: Recall Before Acting

Read memory **before** doing any of these, not after:

- starting work on a project touched before
- choosing a library, pattern, or tool
- writing tests, commits, or documentation, where conventions apply
- answering "how do we usually do X here"
- anything the user phrases as "again", "like last time", or "as we agreed"

Skip recall for one-off factual questions, arithmetic, or anything fully specified in the current message. Recall costs a tool call and context; spending it on a self-contained question is waste.

Search with the words the user actually used, plus the project or repository name. If the first search returns nothing useful, try one broader query, then stop and proceed without memory rather than looping.

### Step 2: Save After Deciding

Write to memory when one of these has just happened:

- a **decision** was made and will still matter next week ("we use pnpm", "the billing module stays untouched")
- the user **corrected** the agent, which is the strongest signal there is
- an approach **failed**, and why it failed
- a preference was stated that applies beyond this task
- a fact about the environment was discovered the hard way (a port, a flag, a service that must be running)

Do **not** save: the contents of files that can be read again, restatements of the current task, transient state, anything the user marked as temporary, and anything containing secrets, tokens, or personal data.

One memory, one fact. A paragraph containing four decisions cannot be superseded cleanly when one of them changes.

### Step 3: Write It So It Survives

A memory that is useless in three weeks was written wrong. Give each entry, in the text if the backend has no fields for it:

- **what** was decided or observed, in one sentence
- **why**, briefly, because the reason outlives the decision
- **when** it became true, and when it stopped being true if it has
- **where it came from**: a file, a commit, a conversation, a test run

Prefer the user's own words over a paraphrase. Paraphrase drifts.

### Step 4: Close the Past Instead of Overwriting It

When something changes, the old memory is not wrong. It is **closed**.

If the project moved from Redux to Zustand, "we use Redux" was true from January to June. Deleting it destroys the explanation for every component written in that window. Mark it superseded, keep its validity window, and write the new one alongside.

This is the single most destructive habit in agent memory, and it stays invisible until someone asks a question about old code.

### Step 5: Keep Contradictions Visible

If recall returns two entries that disagree, do not pick the closer match and proceed. Surface both, with their dates, and ask or flag. A convention that a recent failure contradicts is exactly the situation where the user needs to be told, not smoothed over.

### Step 6: Weigh Evidence and Policy Differently

- **Evidence** is what happened: one run, one failure, one observation. Cheap, plentiful, individually unreliable.
- **Policy** is what should happen: a convention, a decision, a rule. Expensive, and should be hard to change by accident.

An observation becomes policy when a human confirms it, when it lands in a merged decision record, or when it has worked repeatedly. Never promote a single observation to a rule without one of those.

### What Following This Skill Produces

Two things, and nothing else:

- **Recalled context, stated before the work starts.** The relevant entries are named with their dates and sources, so the user can see what the agent is relying on. Conflicting entries are shown side by side, not merged.
- **New memory entries after decisions, corrections and failures.** One fact each, in this shape:

```text
Project uses pnpm, not npm. Stated by the user on 2026-08-11 after a lockfile conflict. Applies to all packages in this repo.
```

A superseded entry keeps its text and gains an end date and a pointer to the entry that replaced it. The full format, with closing and evidence examples, is in [references/entry-format.md](references/entry-format.md).

## Examples

### Example 1: A Correction

The user says: *"stop using npm here, we're on pnpm."*

1. This is a correction, which is the strongest save signal. Save it.
2. Write the entry:

```text
Project uses pnpm, not npm. Stated by the user on 2026-08-11 after a lockfile conflict. Applies to all packages in this repo.
```

3. Do not also save "the user was annoyed", "ran npm install", or the lockfile contents.
4. Next session, before running any package command in this repo, recall first and find it.

### Example 2: A Contradiction

Recall returns two entries:

```text
Integration tests run against the staging database (2026-06-02)
Integration tests use a local container; staging is off limits after the incident (2026-08-19)
```

1. Do not pick one and continue. State both, with dates.
2. Ask: *"Memory has two rules for integration tests; the August one says staging is off limits. Use the local container?"*
3. After the answer, close the entry that no longer holds, with its end date, and keep the other.

### Example 3: Closing an Entry That Stopped Being True

Do not delete the old entry. Add an end date and a pointer to what replaced it, then write the new entry alongside:

```text
[closed 2026-06-30, replaced by "State management uses Zustand"] State management uses Redux. Decided in the January architecture review.
State management uses Zustand. Migrated in June after the bundle size review. Applies to all new components.
```

## Best Practices

- **Do:** recall before project-specific work, and name the entries you rely on with their dates and sources.
- **Do:** save right after a decision, a correction, or a failure, in one sentence with its reason.
- **Do:** keep one fact per entry, so a later change can supersede it cleanly.
- **Do:** prefer the user's own words over a paraphrase.
- **Don't:** overwrite or remove an entry that stopped being true; close it with an end date instead.
- **Don't:** save file contents that can be read again, restatements of the current task, or transient state.
- **Don't:** promote a single observation to a rule without human confirmation, a merged decision record, or repeated success.

## Limitations

- This skill installs no memory backend and requires no account. Without a memory tool the agent can call, it can only say that memory is unavailable and continue.
- It decides when to recall and what to save. How well entries are found again depends on the backend's own search.
- It does not resolve contradictions by itself. It surfaces them with their dates and asks the user which one holds.
- What happens to an entry the user asks to remove depends on what the backend supports.
- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.

## Security & Safety Notes

- The skill contains no shell commands and makes no network calls of its own. It reads and writes memory only through the memory tool the user has already connected.
- Never save secrets, tokens, passwords, or personal data into memory, and never write credentials into an entry.
- A hosted memory backend stores entries outside the local machine. Choose the backend with that in mind.
- When the user asks for an entry to be removed, close or remove it as the backend allows, and confirm what was removed.

## Common Pitfalls

- **Problem:** The memory tool is unavailable or failing.
  **Solution:** Proceed without memory, say so in one line, and do not retry in a loop. Save the pending decision as soon as the tool is back, rather than dropping it.
- **Problem:** Recall returns nothing.
  **Solution:** Run one broader query, then continue without memory. An empty result is information: the topic is new, so a decision made now is worth saving.
- **Problem:** Recall returns too much.
  **Solution:** Keep the entries that match the current project and task; ignore the rest rather than pasting them into context.
- **Problem:** Two entries disagree.
  **Solution:** Show both with their dates and ask which holds. Do not resolve the conflict silently.
- **Problem:** A save is rejected or filtered by the backend.
  **Solution:** Report it once. Do not rephrase the same fact repeatedly to get it through.

## Related Skills

- `@memory-systems`: when designing the memory architecture itself (short-term, long-term, graph-based) rather than the habit of using it.
- `@context-engineering`: when setting up rules files and session context, which this skill complements with rules for long-term memory.

## Additional Resources

- [Upstream repository](https://github.com/mnemoverse/agent-memory-discipline) (CC0-1.0)
- [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Model Context Protocol](https://modelcontextprotocol.io), for connecting memory servers

*Written and maintained by the team behind [Mnemoverse](https://mnemoverse.com), which is one hosted implementation. The rules above are deliberately backend-neutral and were written to be useful without it.*
