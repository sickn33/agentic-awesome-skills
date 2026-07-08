# Example: Repair Mission for a Broken Build

## Scenario
User: "My Vercel deploy is failing. Build error: Cannot find module '@/components/ProposalResult'"

This is a targeted repair — minimum agents, minimum quota.

---

## Mission Brief

```
MISSION BRIEF
─────────────────────────────────────────
Goal: Fix broken import causing Vercel build failure. Do not touch anything else.
Total Agents: 1
Quota Strategy: FLASH only
Expected Token Cost: LOW

AGENTS:
[1] ID: repair-001
    Role: Repair Agent
    Scope: ONLY the file containing the broken import + the missing file (if it needs creating)
    Model: Gemini Flash
    Input: Exact error message, file path of the import
    Output: Fixed import OR created missing file — nothing else
    Depends on: none
─────────────────────────────────────────
```

---

## Repair Protocol

```
Step 1: Read the exact error — don't assume context
  Error: "Cannot find module '@/components/ProposalResult'"

Step 2: Check if the file exists
  → If exists: fix the import path (casing issue, wrong alias, etc.)
  → If missing: create the minimum viable file (even if empty with correct export)

Step 3: Verify the fix compiles mentally
  → Check all other files that import the same module
  → Confirm tsconfig.json paths alias is correct

Step 4: Report what was changed and why — one sentence each
```

---

## What NOT to do in a repair mission

- Do NOT re-read the entire codebase to "understand context"
- Do NOT refactor adjacent files while you're in there
- Do NOT switch to a more powerful model "just to be safe"
- Do NOT open a browser agent to check Vercel dashboard
- Do NOT spawn additional agents for a single broken import

---

## Quota Log

| Event | Impact |
|-------|--------|
| 1 Flash agent | LOW |
| 2–3 files read | LOW |
| 1–2 files written | LOW |
| **Total estimated** | **< 5% sprint** |

> Repair missions should almost never exceed 10% sprint quota.
> If a repair is growing complex, stop — decompose it as a new full mission instead.
