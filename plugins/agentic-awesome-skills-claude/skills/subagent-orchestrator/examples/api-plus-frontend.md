# Example: Backend API Agent + Frontend UI Agent in Parallel

## Scenario
User prompt: "Build a proposal generator — form on frontend, AI call on backend, result displayed on screen."

## This is the ProposalKit core feature pattern.

---

## Mission Brief

```
MISSION BRIEF
─────────────────────────────────────────
Goal: Working proposal generator with form input, API processing, and result display.
Total Agents: 2 + 1 integration
Quota Strategy: MIXED — Flash for backend, Sonnet for frontend UI
Expected Token Cost: MEDIUM

AGENTS:
[1] ID: agent-001
    Role: Builder — Backend API
    Scope: /app/api/generate/route.ts
    Model: Gemini Flash
    Input: NVIDIA API key env name, prompt template from resources/prompt-template.md
    Output: POST route that accepts {clientName, projectType, budget}, returns {proposal: string}
    Depends on: none

[2] ID: agent-002
    Role: Builder — Frontend Form + Display
    Scope: /components/ProposalForm.tsx, /components/ProposalResult.tsx, /app/page.tsx
    Model: Claude Sonnet (UI needs quality)
    Input: API contract from agent-001 spec (input/output shape only — not the code)
    Output: Form component, result display, wired to /api/generate
    Depends on: none (uses spec, not agent-001 output directly)

[3] ID: agent-003
    Role: Integrator
    Scope: review only — no new files
    Model: Gemini Flash
    Input: Outputs from agent-001 and agent-002
    Output: List of any mismatches between API contract and frontend calls
    Depends on: agent-001, agent-002
─────────────────────────────────────────
```

---

## Key Pattern: Spec-First Parallelism

agents 001 and 002 run at the same time because:
- agent-002 receives the **API contract** (input/output shape) not the actual code
- The contract is defined before either agent runs
- Both agents work from the same agreed spec

This avoids agent-002 waiting for agent-001 to finish, saving significant time and quota.

**Always define the API contract before spawning parallel agents:**
```typescript
// Agree on this before agents run:
// POST /api/generate
// Input:  { clientName: string, projectType: string, budget: number }
// Output: { proposal: string, error?: string }
```

---

## Quota Log

| Event | Impact |
|-------|--------|
| agent-001 (Flash, 1 file) | LOW |
| agent-002 (Sonnet, 3 files) | MEDIUM |
| agent-003 (Flash, review only) | LOW |
| 0 browser agents | NONE |
| **Total estimated** | **~30% sprint** |
