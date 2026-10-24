---
name: subagent-orchestrator
risk: critical
source: community
date_added: "2026-05-21"
description: Coordinate quota-aware parallel subagents for large, multi-file Antigravity tasks.
version: 1.0.0
author: community
tags: [subagents, orchestration, quota, parallel, multi-agent]
---

# Subagent Orchestrator

A quota-aware, parallel subagent coordination skill for Antigravity 2.0. Turns one big task into a set of isolated, efficient agent missions — without burning your weekly quota.

---

## Use this skill when
- A task spans 3+ files or components
- You want multiple agents working at the same time
- You've hit quota issues mid-task before
- The task involves both planning AND building
- You need browser agent + code agent + terminal agent running together

## Do not use this skill when
- Editing a single file or fixing one bug
- Writing a quick script under 50 lines
- Asking a question or generating a plan only

---

## Phase 1 — DECOMPOSE (before any agent runs)

Before spawning any subagent, the orchestrator MUST produce a Mission Brief. Announce:
> "Running subagent-orchestrator skill. Decomposing task into isolated missions."

Then output a Mission Brief in this format:

```
MISSION BRIEF
─────────────────────────────────────────
Goal: [one sentence, what done looks like]
Total Agents: [N]
Quota Strategy: [FLASH / SONNET / MIXED]
Expected Token Cost: [LOW / MEDIUM / HIGH]

AGENTS:
[1] ID: agent-001
    Role: [e.g. Planner / Builder / Tester / Browser]
    Scope: [exact files or URLs this agent touches]
    Model: [Gemini Flash / Claude Sonnet]
    Input: [what it receives]
    Output: [what it produces]
    Depends on: [none / agent-001]

[2] ...
─────────────────────────────────────────
```

Present the Mission Brief before delegation. Proceed when the user already authorized parallel work within that scope; otherwise obtain authorization. Material new scope, cost or external writes require the relevant approval.

---

## Phase 2 — QUOTA ROUTING

Before assigning models, apply this decision tree:

```
Is this task > 20 files OR > 500 lines of new code?
  YES → Use Gemini Flash for all agents. Reserve Sonnet for final review only.
  NO  → Is this task creative UI / complex logic / API design?
          YES → Use Sonnet for builder agent, Flash for all others.
          NO  → Use Gemini Flash for everything.
```

**Historical model preferences (verify availability, cost and user choice):**
- Claude Opus → NEVER use in subagents. Too expensive.
- Claude Sonnet → Max 1 subagent per mission.
- Gemini Flash → Default for all subagents. Fast, cheap, separate quota pool.
- Browser subagent → Do not assume a separate quota pool. Use sparingly (1 per mission max).

---

## Phase 3 — CONTEXT ISOLATION

Each subagent gets a scoped context packet. Never give all agents the full codebase.

For each agent, prepare:
```
AGENT CONTEXT PACKET — agent-[ID]
Files to read: [list only what this agent needs]
Files to write: [list only what this agent will create/edit]
Do NOT read: [explicitly exclude irrelevant files]
Knowledge: [paste only the relevant section of GEMINI.md]
```

Rule: If an agent doesn't need `node_modules`, `package-lock.json`, `.next/`, or `dist/` — exclude them in the supported context mechanism when appropriate; do not hide the lockfile or files needed for the actual task.

---

## Phase 4 — PARALLEL EXECUTION

Spawn agents in dependency order:

```
Round 1 (no dependencies): Run agents in parallel
Round 2 (depends on Round 1): Wait for all Round 1 outputs, then run
Round 3 (final): Integrate + verify
```

Between rounds, the orchestrator MUST:
1. Collect each agent's output artifact
2. Run a 3-point spot check:
   - Did the agent stay within its assigned scope?
   - Are there any import/export conflicts with other agents' outputs?
   - Did any agent produce a placeholder ("TODO", "implement later")?
3. If any check fails → re-run that agent with corrected context. Do NOT continue.

---

## Phase 5 — ERROR RECOVERY

If a subagent fails or produces broken output:

```
RECOVERY PROTOCOL
─────────────────────────────────────────
1. Do NOT re-run the full mission.
2. Identify the exact failure point.
3. Spawn a single repair agent with:
   - Only the broken file(s) as scope
   - The error message as context
   - Model: Gemini Flash (cheapest for repairs)
4. Validate the repair before continuing.
─────────────────────────────────────────
```

Never cascade a broken output to the next agent. Always fix before moving forward.

---

## Phase 6 — INTEGRATION CHECK

After all agents complete, run a final integration sweep:

- [ ] All imports resolve correctly
- [ ] No duplicate function/variable names across files
- [ ] No hardcoded values that should be env variables
- [ ] No `console.log` left in production files
- [ ] Types are consistent across components (TypeScript)
- [ ] Run the project’s actual relevant build/tests when available; distinguish inspection from executed results

If any check fails, spawn one final repair agent scoped to the exact issue.

---

## Quota Monitoring Rules

Track estimated usage throughout the mission:

| Event | Quota Impact |
|-------|-------------|
| Agent spawned | LOW (setup) |
| File indexed (each) | LOW |
| Tool call (file read/write) | MEDIUM |
| Terminal command | MEDIUM |
| Browser subagent activated | HIGH |
| Thinking mode enabled | VERY HIGH |

If verified provider usage approaches the user’s actual limit/budget:
- Pause and report: "Quota checkpoint: the verified usage/budget boundary reached. Continue or defer remaining agents?"
- Switch remaining agents to Gemini Flash
- Avoid unnecessary browser work without dropping required validation

---

## Communication Rules

- Announce which agent is running at all times
- Show a compact progress bar between rounds:
  ```
  Mission Progress: ████████░░ 4/5 agents complete
  Quota Status: ▓▓▓▓░░░░░░ ~40% sprint used
  ```
- Never go silent for more than one agent turn
- If blocked, say why explicitly — never just stop

---

## Examples

See `examples/` folder:
- `nextjs-feature.md` — Building a full Next.js feature with 3 parallel agents
- `api-plus-frontend.md` — Backend API agent + Frontend UI agent running in parallel
- `debug-mission.md` — Repair mission for a broken build using minimal quota

## Limitations

- This skill coordinates agent planning; it does not provide a runtime scheduler or enforce quota limits automatically.
- Parallel agents still need explicit scoping, review, and integration by the parent agent.
- Do not use it when a single focused edit or direct answer would be faster and clearer.

## Capability and integration boundaries

This is planning guidance, not a scheduler, model router or quota monitor. Use only the host’s exposed delegation tools and user-authorized model choices; Gemini/Claude availability, costs and quota separation are not established here. Numeric percentages in examples are invented planning illustrations and must not be reported as measured. Partition write ownership, use isolated worktrees when needed, and bind integration checks to the actual combined diff; spot checks alone do not prove correctness. Read-only reviewers must not repair files without reassignment. Scope repairs to the real contract and run relevant checks; no placeholder exports or mental build pass. The installer now refuses an existing destination and source symlinks/special files; it is not transactional and may leave a partial new directory on failure, so inspect before any manual retry. Assumes a trusted, non-concurrently-mutated parent directory; do not claim hostile-filesystem race protection or automatically alter global agent setup.
