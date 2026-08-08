---
name: phase-gated-debugging
description: "Use when debugging any bug. Enforces a 5-phase protocol where code edits are blocked until root cause is confirmed. Prevents premature fix attempts."
risk: safe
source: community
date_added: "2026-03-28"
---

# Phase-Gated Debugging

## Overview

AI coding agents see an error and immediately edit code. They guess at fixes, get it wrong, and spiral. This skill enforces a strict 5-phase protocol where you CANNOT edit source code until the root cause is identified and confirmed.

Based on [claude-debug](https://github.com/krabat-l/claude-debug) (full plugin with PreToolUse hook enforcement).

## When to Use
Use this skill when:

- a bug keeps getting "fixed" without resolving the underlying issue
- you need to slow an agent down and force disciplined debugging before code edits
- the failure is intermittent, a regression, performance-related, or otherwise hard to isolate
- you want an explicit user confirmation checkpoint before any fix is applied

## The Protocol

### Phase 1: REPRODUCE
Run the failing command/test. Capture the exact error. Run 2-3 times for consistency.
- Do NOT read source code
- Do NOT hypothesize
- Do NOT edit any files

### Phase 2: ISOLATE
Read code. Add diagnostic logging marked `// DEBUG`. Re-run with diagnostics. Binary search to narrow down.
- Only `// DEBUG` marked logging is allowed
- Do NOT fix the bug even if you see it

### Phase 3: ROOT CAUSE
Analyze WHY at the isolated location. Use "5 Whys" technique. Remove debug logging.

State: "This is my root cause analysis: [explanation]. Do you agree, or should I investigate further?"

**WAIT for user confirmation. Do NOT proceed without it.**

### Phase 4: FIX
Remove all `// DEBUG` lines. Apply minimal change addressing confirmed root cause.
- Only edit files related to root cause
- Do NOT refactor unrelated code

### Phase 5: VERIFY
Run original failing test — must pass. Run related tests. For intermittent bugs, run 5+ times.
If verification fails: root cause was wrong, go back to Phase 2.

## Bug-Type Strategies

| Type | Technique |
|------|-----------|
| Crash/Panic | Stack trace backward — trace the bad value to its source |
| Wrong Output | Binary search — log midpoint, halve search space each iteration |
| Intermittent | Compare passing vs failing run logs — find ordering divergence |
| Regression | `git bisect` — find the offending commit |
| Performance | Timing at stage boundaries — find the bottleneck |

## Key Rules

1. NEVER edit source code in phases 1-3 (except `// DEBUG` in phase 2)
2. NEVER proceed past phase 3 without user confirmation
3. ALWAYS reproduce before investigating
4. ALWAYS verify after fixing

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
