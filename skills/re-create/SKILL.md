---
name: re-create
description: "Completely delete and rewrite a file or module from scratch when structural rot makes patching impossible."
risk: critical
source: community
date_added: "2026-06-27"
---

# re-create — Controlled Erasure & Rebuild Protocol

## Overview

> Hollow Purple is Gojo's most destructive technique — blue and red combined into total erasure of the target. But Gojo doesn't use it carelessly. He knows exactly what he's erasing and why. Same here: this skill is the nuclear option, invoked only when patching is the wrong call, executed with full control over what gets erased and what must survive.

Rewrites are dangerous not because rebuilding is hard, but because it is easy to silently erase behavior that was working and expected. This skill enforces a complete inventory of what must survive before a single line is deleted, and a full verification that everything survived after the rebuild.

---

## When to Use This Skill

- Use when a file, module, or component needs to be completely deleted and rewritten from scratch
- Use when structural rot is so deep that individual fixes would only make it worse
- Use when accumulated technical debt makes the code unmaintainable
- Use when the target is fundamentally broken and beyond saving
- **DO NOT** use for partial refactors, single-function fixes, or targeted edits

---

## How It Works

### PHASE 1 — Justify the Erasure

The AI must prove that a full rewrite is necessary. It must answer all of the following:

1. **What specifically is broken or unsalvageable?**
   - Not "it's messy" — specific structural problems that make targeted fixes impossible or counterproductive
2. **Why would targeted edits make things worse, not better?**
   - Patching on top of rot, compounding complexity, architectural mismatch
3. **What is the concrete cost of keeping the current implementation?**
   - Maintenance burden, bug surface, performance, developer velocity

If the AI cannot clearly answer all three, it must fall back to targeted edits instead of a rewrite. A rewrite is not a reward for messy code — it is a last resort.

> **The bar is high.** "This code is ugly" does not justify hollow purple. "The architecture assumes X but the system now requires Y and every patch makes the mismatch worse" does.

---

### PHASE 2 — Read the Target Completely

Before proposing deletion, the AI must read the entire target (file, module, or component) in full.

The AI must identify and catalog:

1. **Public interfaces** — functions, classes, types, or exports that other parts of the codebase call
2. **Implicit contracts** — behaviors that other files depend on even if not formally typed
3. **Working behaviors** — things the current implementation does correctly that must continue to work
4. **Non-obvious logic** — edge cases, guards, or special handling that looks incidental but is intentional
5. **Blast radius** — every file in the codebase that imports from or depends on the target

> **The AI cannot skip this phase even if it has read the file before.** The purpose is not familiarity — it is building the Preservation List.

---

### PHASE 3 — Erasure Declaration (User Must Confirm)

The AI outputs a complete erasure plan and **waits for user confirmation before deleting or writing anything.**

```
HOLLOW PURPLE — ERASURE PLAN
─────────────────────────────────────────
TARGET FOR ERASURE:
  [file path or module name]

WHY TARGETED FIXES ARE WRONG:
  [specific justification — architectural rot, fundamental mismatch, etc.]

PRESERVATION LIST (must survive the rewrite):
  - [public interface / export 1] → [what it does, who depends on it]
  - [public interface / export 2] → [what it does, who depends on it]
  - [working behavior 1]          → [what it does, why it must be kept]
  - [non-obvious logic 1]         → [what it guards against]

BLAST RADIUS (files that depend on the target):
  - [file path] → depends on [what specifically]
  - [file path] → depends on [what specifically]

NEW IMPLEMENTATION PLAN:
  [Description of what the rebuild will look like — structure, approach, key decisions]

WHAT WILL NOT BE PRESERVED:
  [Anything intentionally dropped and why — dead code, deprecated behavior, etc.]
─────────────────────────────────────────
Confirm to proceed with erasure and rebuild.
```

> **Nothing is deleted until the user explicitly confirms.** A reply of "yes", "confirmed", "do it", or equivalent counts. Silence does not.

---

### PHASE 4 — Controlled Erasure

User confirms → the target is deleted. Rules for this phase:

- **Delete cleanly.** Not commented out, not renamed to `_old`, not archived in place — deleted.
- **Delete only the declared target.** Nothing outside the declared scope is touched during erasure.
- **Pause if scope expands.** If deletion reveals unexpected dependencies not in the blast radius list, the AI stops and reports before continuing.

---

### PHASE 5 — Rebuild Against the Preservation List

The AI writes the new implementation. Rules:

1. **Every item on the Preservation List is an obligation.** The rebuild is not complete until every preserved interface, behavior, and edge case is implemented and checked off.
2. **Match the blast radius expectations.** Files that depended on the old implementation must be able to use the new one without changes — unless changes to dependent files were declared in Phase 3.
3. **No bonus features.** The rebuild implements what was declared. New improvements, extra functionality, and cleanup of adjacent things are a separate task.
4. **Follow existing codebase conventions.** The new implementation must use the same patterns, naming conventions, and style as the surrounding codebase — not whatever the AI prefers.

The AI tracks preservation progress explicitly:

```
REBUILD PROGRESS
─────────────────────────────────────────
Preservation List:
  ✓ [interface 1]         → implemented
  ✓ [working behavior 1]  → implemented
  ✗ [non-obvious logic 1] → pending
─────────────────────────────────────────
```

---

### PHASE 6 — Blast Radius Verification

After the rebuild is complete, the AI checks every file in the blast radius:

1. **Re-read each dependent file** and confirm it can still use the new implementation
2. **Verify each dependency** — the function signatures, exports, and behaviors it relied on are present in the rebuild
3. **Flag any breakage** — if a dependent file now has a mismatch, report it and propose a fix before declaring done

Final verification report:

```
HOLLOW PURPLE — VERIFICATION
─────────────────────────────────────────
Preservation List:          ALL ITEMS ✓
Blast radius files checked:
  - [file] → ✓ compatible with new implementation
  - [file] → ✓ compatible with new implementation
New issues introduced:      NONE / [describe if found]
─────────────────────────────────────────
Status: CLEAN ✓  /  NEEDS FOLLOW-UP ⚠
```

---

## Self-Ask Before Erasure

The AI must answer all four before Phase 4 begins:

| # | Question | Required |
|---|---|---|
| 1 | Have I read the entire target and built a complete Preservation List? | Yes — or read more |
| 2 | Have I identified the full blast radius? | Yes — or search more |
| 3 | Has the user confirmed the erasure plan? | Yes — or wait |
| 4 | Is the erasure scoped exactly to what was declared? | Yes — or re-declare |

---

## Hard Rules (Never Violated)

- **No deletion before user confirmation.** Ever.
- **No deletion before the Preservation List is complete.** You cannot protect what you haven't inventoried.
- **No "clean up while I'm at it" during rebuild.** The rebuild scope is exactly what was declared.
- **No undeclared blast radius expansion.** If a dependent file wasn't in the list, stop and report it.
- **No skipping Phase 6.** The rebuild is not done until blast radius files are verified.
- **No rewrites disguised as refactors.** If more than 80% of a file is being changed, this protocol applies.

---

## What This Skill Prevents

- Rewrites that silently drop working edge-case logic that wasn't documented
- Rebuilds that break dependent files because their interfaces changed
- Rewrites done for the wrong reason (style preference, boredom) when a targeted fix would have been better
- Partial rebuilds that leave the codebase in a broken half-old-half-new state
- Blast radius files breaking silently with no one noticing until runtime

---

## Quick Reference

| Phase | Action | Deletes/Writes Code? |
|---|---|---|
| 1 — Justify | Prove erasure is necessary | ❌ No |
| 2 — Read | Read target fully, build Preservation List | ❌ No |
| 3 — Declare | Output erasure plan, wait for confirmation | ❌ No |
| 4 — Erase | Delete the declared target | 🗑️ Deletes only |
| 5 — Rebuild | Write new implementation against Preservation List | ✅ Writes |
| 6 — Verify | Check Preservation List + blast radius | ❌ No |

---

## Security & Safety Notes

- **Authorized Use Only:** This skill involves destructive capabilities (deleting files). Always ensure you have appropriate authorization and backups before triggering a full rebuild.
- **Explicit Confirmation Required:** No code should ever be deleted without explicit user confirmation of the Erasure Plan.

---

## Examples

### Example 1: Triggering a full module rewrite
```text
User: "The authentication module is beyond saving. Rewrite this from scratch."

AI: [Outputs HOLLOW PURPLE — ERASURE PLAN]
"Confirm to proceed with erasure and rebuild."

User: "Confirmed."

AI: [Executes Phase 4 and 5: Controlled Erasure and Rebuild against the Preservation List]
```

---

## Trigger Phrases

- "rewrite this from scratch"
- "delete this and redo it"
- "this is beyond saving / beyond repair"
- "the whole module / component / file is broken"
- "start over on this"
- Any situation where patching would compound the problem rather than solve it

---

## Limitations

- The AI must explicitly justify the rewrite and receive user confirmation before deleting anything.
- The rebuild scope must exactly match what was declared (no bonus features or extra cleanup).
- Does not apply to partial refactoring, single-function fixes, or targeted bug fixes.
- It requires identifying the full blast radius upfront to avoid silently breaking dependencies.
