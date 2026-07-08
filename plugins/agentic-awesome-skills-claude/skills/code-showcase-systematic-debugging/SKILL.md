---
name: code-showcase-systematic-debugging
description: Four-phase debugging methodology with root cause analysis. Use when investigating bugs, fixing test failures, or troubleshooting unexpected behavior. Emphasizes NO FIXES WITHOUT ROOT CAUSE FIRST.
risk: unknown
source: https://github.com/ChrisWiles/claude-code-showcase/tree/main/.claude/skills/systematic-debugging
source_repo: ChrisWiles/claude-code-showcase
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/ChrisWiles/claude-code-showcase/blob/main/LICENSE
---

# Systematic Debugging
## When to Use

Use this skill when you need four-phase debugging methodology with root cause analysis. Use when investigating bugs, fixing test failures, or troubleshooting unexpected behavior. Emphasizes NO FIXES WITHOUT ROOT CAUSE FIRST.


## Core Principle

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Never apply symptom-focused patches that mask underlying problems. Understand WHY something fails before attempting to fix it.

## The Four-Phase Framework

### Phase 1: Root Cause Investigation

Before touching any code:

1. **Read error messages thoroughly** - Every word matters
2. **Reproduce the issue consistently** - If you can't reproduce it, you can't verify a fix
3. **Examine recent changes** - What changed before this started failing?
4. **Gather diagnostic evidence** - Logs, stack traces, state dumps
5. **Trace data flow** - Follow the call chain to find where bad values originate

**Root Cause Tracing Technique:**
```
1. Observe the symptom - Where does the error manifest?
2. Find immediate cause - Which code directly produces the error?
3. Ask "What called this?" - Map the call chain upward
4. Keep tracing up - Follow invalid data backward through the stack
5. Find original trigger - Where did the problem actually start?
```

**Key principle:** Never fix problems solely where errors appear—always trace to the original trigger.

### Phase 2: Pattern Analysis

1. **Locate working examples** - Find similar code that works correctly
2. **Compare implementations completely** - Don't just skim
3. **Identify differences** - What's different between working and broken?
4. **Understand dependencies** - What does this code depend on?

### Phase 3: Hypothesis and Testing

Apply the scientific method:

1. **Formulate ONE clear hypothesis** - "The error occurs because X"
2. **Design minimal test** - Change ONE variable at a time
3. **Predict the outcome** - What should happen if hypothesis is correct?
4. **Run the test** - Execute and observe
5. **Verify results** - Did it behave as predicted?
6. **Iterate or proceed** - Refine hypothesis if wrong, implement if right

### Phase 4: Implementation

1. **Create failing test case** - Captures the bug behavior
2. **Implement single fix** - Address root cause, not symptoms
3. **Verify test passes** - Confirms fix works
4. **Run full test suite** - Ensure no regressions
5. **If fix fails, STOP** - Re-evaluate hypothesis

**Critical rule:** If THREE or more fixes fail consecutively, STOP. This signals architectural problems requiring discussion, not more patches.

## Red Flags - Process Violations

Stop immediately if you catch yourself thinking:

- "Quick fix for now, investigate later"
- "One more fix attempt" (after multiple failures)
- "This should work" (without understanding why)
- "Let me just try..." (without hypothesis)
- "It works on my machine" (without investigating difference)

## Warning Signs of Deeper Problems

**Consecutive fixes revealing new problems in different areas** indicates architectural issues:

- Stop patching
- Document what you've found
- Discuss with team before proceeding
- Consider if the design needs rethinking

## Common Debugging Scenarios

### Test Failures

```
1. Read the FULL error message and stack trace
2. Identify which assertion failed and why
3. Check test setup - is the test environment correct?
4. Check test data - are mocks/fixtures correct?
5. Trace to the source of unexpected value
```

### Runtime Errors

```
1. Capture the full stack trace
2. Identify the line that throws
3. Check what values are undefined/null
4. Trace backward to find where bad value originated
5. Add validation at the source
```

### "It worked before"

```
1. Use git bisect to find the breaking commit
2. Compare the change with previous working version
3. Identify what assumption changed
4. Fix at the source of the assumption violation
```

### Intermittent Failures

```
1. Look for race conditions
2. Check for shared mutable state
3. Examine async operation ordering
4. Look for timing dependencies
5. Add deterministic waits or proper synchronization
```

## Debugging Checklist

Before claiming a bug is fixed:

- [ ] Root cause identified and documented
- [ ] Hypothesis formed and tested
- [ ] Fix addresses root cause, not symptoms
- [ ] Failing test created that reproduces bug
- [ ] Test now passes with fix
- [ ] Full test suite passes
- [ ] No "quick fix" rationalization used
- [ ] Fix is minimal and focused

## Success Metrics

Systematic debugging achieves ~95% first-time fix rate vs ~40% with ad-hoc approaches.

Signs you're doing it right:
- Fixes don't create new bugs
- You can explain WHY the bug occurred
- Similar bugs don't recur
- Code is better after the fix, not just "working"

## Integration with Other Skills

- **testing-patterns**: Create test that reproduces the bug before fixing

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
