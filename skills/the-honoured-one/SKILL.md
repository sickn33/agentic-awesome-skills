---
name: the-honoured-one
description: "Forces the AI to fully load context and read relevant files before performing complex, multi-file tasks, architectural changes, or debugging. Prevents acting on assumptions."
risk: safe
source: community
date_added: "2026-06-25"
---

# the-honoured-one — Full Context Load Protocol

## Core Philosophy

> Gojo at full power means all six eyes open — everything visible, nothing assumed, no blind spots. The Honoured One doesn't act on guesses. This skill enforces the same: the AI must earn the right to act by reading and understanding first.

The most common AI coding failure is **confident wrongness** — the AI proposes or implements something based on how it assumes the code is structured, not how it actually is. It gets the architecture wrong, uses a pattern inconsistent with the rest of the codebase, or integrates with a module it never actually opened. This skill eliminates that failure mode by making context-loading mandatory before any action.

---

## When to Use This Skill

- Use when modifying multiple files in an existing codebase
- Use when designing or modifying a system component
- Use when adding a feature that integrates with existing code
- Use when debugging a system or component the AI has not yet read
- Use when the AI would need to assume how existing code is structured
- **DO NOT** use for isolated single-file tasks where the file has already been read

---

## The Four Phases

### PHASE 1 — Context Audit

When given any complex task, the AI must immediately perform a context audit before proposing anything. It declares:

1. **What files are relevant to this task?** — Every file that will be read, changed, or is upstream/downstream of the change
2. **Which of those has the AI actually read this session?** — Honest accounting, no assumptions
3. **What gaps exist?** — Files that are relevant but unread

The AI outputs this before doing anything else:

```
THE HONOURED ONE — CONTEXT AUDIT
─────────────────────────────────────────
Task: [what was asked]

Relevant files identified:
  - src/auth/middleware.ts       → [why relevant]
  - src/routes/user.ts          → [why relevant]
  - src/models/user.model.ts    → [why relevant]
  - src/utils/token.ts          → [why relevant]

Files read this session:
  - src/routes/user.ts          → ✓ read

Unread but relevant (blind spots):
  - src/auth/middleware.ts       → ✗ not read
  - src/models/user.model.ts    → ✗ not read
  - src/utils/token.ts          → ✗ not read
─────────────────────────────────────────
Cannot proceed — reading blind spots now.
```

> **The AI cannot propose a solution, make a plan, or write any code while blind spots exist.**

---

### PHASE 2 — Mandatory Read Pass

The AI reads every file listed as a blind spot. Not summaries, not assumptions based on filename or folder structure — actual reads.

Rules for this phase:
- If a file imports from another file that is also relevant, that file gets added to the read list
- If reading a file reveals unexpected structure or patterns, the AI notes this before continuing
- The AI does not form opinions or solutions while reading — this phase is observation only

> **Shortcut rule:** The AI cannot say "I'm familiar with this pattern so I don't need to read it." Familiarity with a pattern is not familiarity with this codebase's implementation of it.

---

### PHASE 3 — Orientation Statement

After all relevant files are read, the AI outputs an orientation statement before proposing anything. This is its proof that it understands the codebase well enough to act:

```
THE HONOURED ONE — CONTEXT LOADED
─────────────────────────────────────────
Files read: [complete list]

Current architecture (what I now know):
  [2-3 sentences describing how the relevant system actually works,
   based on what was read — not assumed]

What this task touches:
  - [file/component 1] → [how it's involved]
  - [file/component 2] → [how it's involved]

Existing patterns I must follow:
  - [naming convention / error handling style / structure pattern observed]
  - [any other conventions seen in the actual code]

Remaining unknowns:
  - [anything still unclear — or "None, ready to proceed"]
─────────────────────────────────────────
```

---

### PHASE 4 — Confidence Gate

After the orientation statement, the AI applies a confidence gate before acting:

**If "Remaining unknowns" is empty:**
→ Proceed. The AI is fully loaded and may propose a solution or begin work.

**If "Remaining unknowns" is non-empty:**
→ The AI must resolve every unknown before proceeding. Options:
- Ask the user the specific question
- Read another file that would answer it
- Acknowledge the unknown, state the assumption being made, and get user confirmation before continuing

> **The AI cannot proceed with known blind spots.** Stating "I'll assume X" and moving forward without user confirmation is not allowed.

---

## Self-Ask Before Acting

Before writing any code or making any proposal, the AI must answer:

| # | Question | Required |
|---|---|---|
| 1 | Have I read every file this task touches? | Yes — or stop and read |
| 2 | Do I understand how this codebase handles [relevant pattern]? | Yes, from reading — not assuming |
| 3 | Am I following the conventions I actually observed in the code? | Yes — or flag the deviation |
| 4 | Do I have any remaining blind spots? | No — or resolve them first |

---

## Hard Rules (Never Violated)

- **No proposing solutions before reading.** Proposals based on assumptions are not proposals — they are guesses.
- **No "I assume this file does X."** If you haven't read it, you don't know what it does.
- **No skipping files because their names look obvious.** A file called `utils.ts` can contain anything.
- **No importing or calling code from files that haven't been read.** You cannot use what you haven't seen.
- **No "familiar pattern" shortcuts.** The pattern may be implemented differently here.
- **No acting with known unknowns.** Resolve them or get user confirmation before proceeding.

---

## What This Skill Prevents

- AI proposing integration with a module structured completely differently than assumed
- AI using naming conventions inconsistent with the rest of the codebase
- AI calling functions that don't exist because it assumed they would be there
- AI making architectural decisions that conflict with patterns already established in the code
- AI confidently implementing the wrong thing and needing a full redo

---

## Quick Reference

| Phase | Action | May Propose/Code? |
|---|---|---|
| 1 — Audit | List relevant files, identify blind spots | ❌ No |
| 2 — Read | Read all blind spot files | ❌ No |
| 3 — Orient | Output orientation statement | ❌ No |
| 4 — Gate | Confirm no unknowns remain | ✅ Yes, if gate passes |

---

## Trigger Phrases

- "add this feature to the existing code"
- "integrate X with Y"
- "modify how [system] works"
- "refactor this"
- "why is this not working" (on unread code)
- Any task touching more than one file
- Any task where the AI would need to know how existing code is structured to do it correctly

---

## Limitations

- This skill requires more token usage due to reading multiple files upfront.
- It may slow down the initial response time before the AI starts coding.
- The AI might end up reading more files than strictly necessary if the dependency chain is deep.
- Does not replace the need for the user to verify the final code.
