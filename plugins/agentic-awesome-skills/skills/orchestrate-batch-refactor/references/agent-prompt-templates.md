# Agent Prompt Templates

Use these templates when spawning sub-agents.

## Explorer Prompt Template

```
Analyze the target scope and return decomposition guidance only.

Scope:
- Paths/modules: <fill>
- Goal: <refactor|rewrite|hybrid>
- Constraints: <behavior/API/test constraints>

Return:
1. Intent map (what each area currently does)
2. Coupling and dependency risks
3. Candidate work packets with non-overlapping ownership
4. Validation commands per packet
5. Recommended execution order
```

## Worker Prompt Template

```
You own this packet and are not alone in the codebase.
Ignore unrelated edits by others and do not touch files outside ownership.

Packet:
- ID: <fill>
- Objective: <fill>
- Owned files: <fill>
- Dependencies already completed: <fill>
- Invariants to preserve: <fill>
- Required checks: <fill>

Execution requirements:
1. Implement only the packet objective.
2. Preserve specified invariants and external behavior.
3. Run required checks and report exact results.
4. Summarize changed files and any integration notes.
```

## Main Thread Synthesis Prompt Template

```
Merge explorer outputs into a single dependency-aware plan.
Produce:
1. Packet table with ownership and dependencies
2. Parallel execution waves (no overlap per wave)
3. Validation matrix by packet and integration stage
4. Risk list with mitigation actions
```
