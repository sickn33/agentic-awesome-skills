# Example: Building a Full Next.js Feature with 3 Parallel Agents

## Scenario
User prompt: "Add a user authentication flow — login page, signup page, and a protected dashboard route."

---

## Mission Brief (what orchestrator produces)

```
MISSION BRIEF
─────────────────────────────────────────
Goal: Auth flow with login, signup, and protected dashboard — all wired and working.
Total Agents: 3
Quota Strategy: FLASH for all, Sonnet for integration review only
Expected Token Cost: MEDIUM

AGENTS:
[1] ID: agent-001
    Role: Builder — Auth UI
    Scope: /app/login/page.tsx, /app/signup/page.tsx
    Model: Gemini Flash
    Input: Design system from GEMINI.md, form fields spec
    Output: Two complete page components with Tailwind styling
    Depends on: none

[2] ID: agent-002
    Role: Builder — API Routes
    Scope: /app/api/auth/login/route.ts, /app/api/auth/signup/route.ts
    Model: Gemini Flash
    Input: Auth logic spec, env variable names from .env.example
    Output: Two API route handlers with error responses
    Depends on: none

[3] ID: agent-003
    Role: Builder — Protected Route
    Scope: /app/dashboard/page.tsx, /middleware.ts
    Model: Gemini Flash
    Input: Output from agent-001 (session shape), output from agent-002 (token format)
    Output: Dashboard page + middleware redirect logic
    Depends on: agent-001, agent-002
─────────────────────────────────────────
```

---

## Execution Flow

```
Round 1 (parallel):
  agent-001 → builds login + signup UI
  agent-002 → builds API routes

  [Spot check after Round 1]
  ✓ agent-001 stayed in /app/login and /app/signup only
  ✓ agent-002 used correct env variable names
  ✓ No TODOs left in either output

Round 2 (sequential, depends on Round 1):
  agent-003 → builds dashboard + middleware
              receives session shape from agent-001
              receives token format from agent-002

  [Spot check after Round 2]
  ✓ Middleware correctly references session cookie name
  ✓ Dashboard imports resolve to existing components
  ✓ No hardcoded redirect URLs

Integration Check:
  ✓ All imports resolve
  ✓ No duplicate type definitions
  ✓ Build mentally verified
```

---

## Quota Log

| Event | Impact |
|-------|--------|
| 3 agents spawned | LOW |
| ~12 files indexed total | LOW |
| ~18 tool calls across all agents | MEDIUM |
| 0 browser agents used | NONE |
| **Total estimated** | **~25% sprint** |

> Tip: This mission costs ~25% sprint quota. You can run 3–4 missions like this per day on the free tier.
